// commands/promote.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Callsign = require("../models/Callsign");
const roleMappings = require("../utils/roleMappings");

const XBOX_GUILD_ID = "1372312806107512894";
const PLAYSTATION_GUILD_ID = "1369495333574545559";
const STAFF_ROLE_IDS = [
  "1372312806157717556",
  "1372312806191399024",
  "1372312806212239406",
  "1370884299712233592",
  "1370884306964185138",
  "1370968063431671969"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("promote")
    .setDescription("Promote a user to the next rank in their department")
    .addUserOption(option =>
      option.setName("user").setDescription("User to promote").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("department")
        .setDescription("Department to promote in")
        .setRequired(true)
        .addChoices(
          { name: "PSO", value: "PSO" },
          { name: "SAFR", value: "SAFR" },
          { name: "Civilian", value: "Civilian" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser("user");
    const department = interaction.options.getString("department");
    const guild = interaction.guild;

    const commandUser = await guild.members.fetch(interaction.user.id);
    const hasStaffRole = STAFF_ROLE_IDS.some(roleId => commandUser.roles.cache.has(roleId));
    if (!hasStaffRole) {
      return interaction.editReply({ content: "❌ You do not have permission to use this command." });
    }

    const platform =
      guild.id === XBOX_GUILD_ID ? "xbox" :
      guild.id === PLAYSTATION_GUILD_ID ? "playstation" : null;

    if (!platform) {
      return interaction.editReply({ content: "❌ Unsupported server (not Xbox or PlayStation)." });
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.editReply({ content: "❌ Could not find the member." });
    }

    const departmentRoles = Object.entries(roleMappings[department]);
    console.log("🧠 Member roles:", member.roles.cache.map(r => `${r.name} (${r.id})`));
    console.log("📌 Checking department roles:", departmentRoles.map(([rank, obj]) => `${rank}: ${obj[platform].roleId}`));

    let currentIndex = -1;
    for (let i = departmentRoles.length - 1; i >= 0; i--) {
      const [, roleObj] = departmentRoles[i];
      if (member.roles.cache.has(roleObj[platform].roleId)) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex === -1 || currentIndex === departmentRoles.length - 1) {
      return interaction.editReply({ content: "❌ Cannot promote — not in a valid rank or already at top rank." });
    }

    const [nextRank, nextRole] = departmentRoles[currentIndex + 1];

    for (const [, roleObj] of departmentRoles) {
      await member.roles.remove(roleObj[platform].roleId).catch(() => {});
    }
    await member.roles.add(nextRole[platform].roleId).catch(() => {});

    const range = nextRole[platform].range;
    console.log(`📦 Raw range string: ${range}`);

    const prefix = range.match(/[A-Za-z\-]+/g)?.[0]?.trim() || "";
    const matches = range.match(/\d+/g);
    if (!matches || matches.length === 0) {
      return interaction.editReply({ content: "❌ Invalid callsign range format in roleMappings." });
    }

    const start = parseInt(matches[0], 10);
    const end = parseInt(matches[1] || matches[0], 10);
    console.log(`🔍 Checking callsign range for ${department}: ${prefix}${start} - ${prefix}${end}`);

    const usedNumbers = new Set((await Callsign.find({ department })).map(c => c.number));
    console.log("📄 Already assigned callsigns:", Array.from(usedNumbers).sort((a, b) => a - b));

    let assignedNumber = null;
    for (let i = start; i <= end; i++) {
      if (!usedNumbers.has(i)) {
        assignedNumber = i;
        break;
      }
    }

    if (!assignedNumber) {
      return interaction.editReply({ content: "❌ No available callsigns left." });
    }

    await Callsign.findOneAndUpdate(
      { discordId: user.id, department },
      { discordId: user.id, department, number: assignedNumber },
      { upsert: true, new: true }
    );

    const callsign = `${prefix}${assignedNumber}`;
    const newNickname = `${callsign} | ${user.username}`.slice(0, 32);

    console.log("🔎 Attempting to set nickname...");
    console.log("🔎 Bot highest role position:", guild.members.me.roles.highest.position);
    console.log("🔎 Member highest role position:", member.roles.highest.position);
    console.log("🔎 Current nickname:", member.nickname);
    console.log("🔎 Desired nickname:", newNickname);

    if (member.nickname !== newNickname) {
      await member.setNickname(newNickname).catch(err => {
        console.warn("⚠️ Failed to update nickname:", err.message);
      });
    } else {
      console.log("✅ Nickname is already correct, skipping update.");
    }

    const embed = new EmbedBuilder()
      .setTitle("📈 Promotion Successful")
      .setDescription(`<@${user.id}> was promoted to **${nextRank}**`)
      .addFields(
        { name: "Platform", value: platform.toUpperCase(), inline: true },
        { name: "Department", value: department, inline: true },
        { name: "Callsign", value: callsign, inline: true }
      )
      .setColor(0x2ecc71)
      .setFooter({ text: "Prime RP Utilities • Promote" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
