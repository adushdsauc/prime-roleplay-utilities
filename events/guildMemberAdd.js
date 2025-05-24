// /events/guildMemberAdd.js
const { Events, EmbedBuilder } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = require("../config/primerp-sheets-bf194dc4ba11.json");
const AcceptedUser = require("../models/AcceptedUser");

const XBOX_GUILD_ID = "1372312806107512894";
const PLAYSTATION_GUILD_ID = "1369495333574545559";
const XBOX_SHEET_ID = "18Kl4TYeJ-ZyDXymZexbLT2uWKC523KC9lxebrWttmQ0";
const PLAYSTATION_SHEET_ID = "10iA9BobQuFrKrhvaTkrlJPR1tJaFI4qNh4qzJPbvA8Y";
const SHEET_TAB_NAME = "Members";

const LOG_CHANNELS = {
  [XBOX_GUILD_ID]: "1372312809500835996",
  [PLAYSTATION_GUILD_ID]: "1371862183058608178"
};

const ROLE_IDS = {
  [XBOX_GUILD_ID]: {
    always: ["1372312806136877186"],
    Civilian: ["1372312806145392768", "1372312806220890245"],
    PSO: ["1372312806220890247", "1372312806204117013"],
    SAFR: ["1372312806166102076", "1372312806220890246"]
  },
  [PLAYSTATION_GUILD_ID]: {
    always: ["1369497153189187594"],
    Civilian: ["1370878408573063228", "1369497197489684650"],
    PSO: ["1369497170432229417", "1370878407856099408"],
    SAFR: ["1369520232426770453", "1370878410364162058"]
  }
};

let rookieCounter = 1250;

function generateCallsign(department) {
  const prefix = department === "PSO" ? "D" : department === "SAFR" ? "E" : "C";
  return `${prefix}-${rookieCounter++}`;
}

async function updateSheet(docId, member, department, callsign) {
  const doc = new GoogleSpreadsheet(docId);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[SHEET_TAB_NAME];
  await sheet.addRow({
    "Discord Tag": member.user.tag,
    "Discord ID": member.id,
    "Department": department,
    "Callsign": callsign
  });
}

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const guildId = member.guild.id;
    const config = ROLE_IDS[guildId];
    if (!config) return;

    // Retrieve department from database
    let department = "Civilian";
    const accepted = await AcceptedUser.findOne({ discordId: member.id });
    if (accepted) {
      department = accepted.department;
      await AcceptedUser.deleteOne({ discordId: member.id });
    }

    // Assign roles
    const roleIds = [...(config.always || []), ...(config[department] || [])];
    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) await member.roles.add(role).catch(console.error);
    }

    // Generate callsign and update sheet
// Generate callsign and update sheet
const callsign = generateCallsign(department);
const sheetId = guildId === XBOX_GUILD_ID ? XBOX_SHEET_ID : PLAYSTATION_SHEET_ID;
await updateSheet(sheetId, member, department, callsign);

// Set nickname: Callsign | Username
const baseName = member.user.username;
const nickname = `${callsign} | ${baseName}`;
await member.setNickname(nickname).catch(err => {
  console.warn(`❌ Failed to set nickname for ${member.user.tag}:`, err.message);
});

    // Log join embed
    const logChannelId = LOG_CHANNELS[guildId];
    const logChannel = member.guild.channels.cache.get(logChannelId);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("👤 New Member Joined")
        .addFields(
          { name: "User", value: `<@${member.id}> (${member.user.tag})`, inline: false },
          { name: "Department", value: department, inline: true },
          { name: "Callsign", value: callsign, inline: true }
        )
        .setColor(0x00b0f4)
        .setTimestamp();
      logChannel.send({ embeds: [embed] }).catch(console.error);
    }

    console.log(`✅ ${member.user.tag} joined ${department}, callsign ${callsign}`);
  }
};
