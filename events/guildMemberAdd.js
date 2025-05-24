const { Events, EmbedBuilder } = require("discord.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
const AcceptedUser = require("../models/AcceptedUser");
const Invite = require("../models/Invite");
const Callsign = require("../models/Callsign");

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

async function generateCallsign(discordId, department) {
  const ranges = {
    Civilian: { start: 1250, prefix: "Civ" },
    PSO: { start: 1251, end: 2000, prefix: "C" },
    SAFR: { start: 1, end: 100, prefix: "FF-R" },
  };
  const range = ranges[department];
  if (!range) throw new Error("Unknown department");

  const existing = await Callsign.find({ department });
  const used = new Set(existing.map(c => c.number));
  let number = range.start;
  const max = range.end || Infinity;

  while (used.has(number) && number <= max) number++;
  if (number > max) throw new Error("No available callsigns");

  await Callsign.create({ discordId, department, number });
  return `${range.prefix}-${number}`;
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
    console.log("✅ guildMemberAdd fired for:", member.user.tag);

    const guildId = member.guild.id;
    const config = ROLE_IDS[guildId];
    if (!config) {
      console.warn("❌ No ROLE_IDS config for this guild:", guildId);
      return;
    }

    try {
      const invites = await member.guild.invites.fetch().catch(() => null);
      if (invites) {
        const used = invites.find(inv => inv.uses === 1);
        if (used) {
          const inviteData = await Invite.findOne({ code: used.code });
          if (!inviteData) {
            console.log("⚠️ Invite not tracked in DB:", used.code);
          } else if (inviteData.userId !== member.id) {
            const logChannel = member.guild.channels.cache.get(LOG_CHANNELS[guildId]);
            if (logChannel?.isTextBased()) {
              logChannel.send({
                content: `<@${member.id}> was **kicked** for using an unauthorized invite.\nInvite code: \`${used.code}\`\nIntended for: <@${inviteData.userId}>`
              });
            }
            await member.send("🚫 This invite wasn’t meant for you. You’ve been removed from the server.");
            await member.kick("Unauthorized invite use");
            return;
          } else {
            inviteData.used = true;
            await inviteData.save();
          }
        }
      }
    } catch (err) {
      console.error("❌ Error in invite validation:", err);
    }

    let department = "Civilian";
    const accepted = await AcceptedUser.findOne({ discordId: member.id });
    console.log("🔍 AcceptedUser record:", accepted);

    if (accepted) {
      department = accepted.department;
      await AcceptedUser.findOneAndUpdate(
        { discordId: member.id },
        { status: "joined", joinedAt: new Date() },
        { new: true }
      );
    }

    const roleIds = [...(config.always || []), ...(config[department] || [])];
    for (const roleId of roleIds) {
      const role = member.guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.add(role).catch(err => {
          console.warn(`❌ Failed to assign role ${roleId} to ${member.user.tag}:\`, err.message);
        });
      }
    }

    let callsign;
    try {
      callsign = await generateCallsign(member.id, department);
      console.log("🪪 Callsign generated:", callsign);
    } catch (err) {
      console.error("❌ Failed to generate callsign:", err);
      callsign = "Pending";
    }

    const sheetId = guildId === XBOX_GUILD_ID ? XBOX_SHEET_ID : PLAYSTATION_SHEET_ID;
    try {
      console.log("📄 Updating sheet for:", member.user.tag);
      await updateSheet(sheetId, member, department, callsign);
    } catch (err) {
      console.error("❌ Failed to update Google Sheet:", err.message);
    }

    const baseName = member.user.username;
    const nickname = `${callsign} | ${baseName}`;
    await member.setNickname(nickname).catch(err => {
      console.warn(`❌ Failed to set nickname for ${member.user.tag}:", err.message);
    });
    console.log("✏️ Nickname set attempt:", nickname);

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
      console.log("📨 Log channel send attempt complete");
    }

    console.log(`✅ ${member.user.tag} joined ${department}, callsign ${callsign}`);
  }
};
