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
  "1370968063431671969",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("demote")
    .setDescription("Demote a user to the previous rank in their department")
    .addUserOption(option =>
      option.setName("user").setDescription("User to demote").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("department")
        .setDescription("Department to demote in")
        .setRequired(true)
        .addChoices(
          { name: "PSO", value: "PSO" },
          { name: "SAFR", value: "SAFR" },
          { name: "Civilian", value: "Civilian" }
        )
    )
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for demotion")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser("user");
    const department = interaction.options.getString("department");
    const reason = interaction.options.getString("reason");
    const guild = interaction.guild;

    const commandUser = await guild.members.fetch(interaction.user.id);
    const hasStaffRole = STAFF_ROLE_IDS.some(roleId =>
      commandUser.roles.cache.has(roleId)
    );
    if (!hasStaffRole) {
      return interaction.editReply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    const platform =
      guild.id === XBOX_GUILD_ID ? "xbox" :
      guild.id === PLAYSTATION_GUILD_ID ? "playstation" : null;

    if (!platform || !member) {
      return interaction.editReply({ content: "❌ Could not determine platform or member not found." });
    }

    const departmentRoles = Object.entries(roleMappings[department]);
    let currentIndex = -1;
    for (let i = departmentRoles.length - 1; i >= 0; i--) {
      const [, roleObj] = departmentRoles[i];
      if (member.roles.cache.has(roleObj[platform].roleId)) {
        currentIndex = i;
        break;
      }
    }

    if (currentIndex === -1 || currentIndex === 0) {
      return interaction.editReply({
        content: "❌ Cannot demote — not in a valid rank or already at lowest rank."
      });
    }

    const [currentRank, currentRole] = departmentRoles[currentIndex];
    const [prevRank, prevRole] = departmentRoles[currentIndex - 1];

    for (const [, roleObj] of departmentRoles) {
      await member.roles.remove(roleObj[platform].roleId).catch(() => {});
    }
    await member.roles.add(prevRole[platform].roleId).catch(() => {});

    const range = prevRole[platform].range;
    const prefix = range.match(/[A-Za-z\-]+/g)?.[0]?.trim() || "";
    const matches = range.match(/\d+/g);
    let start = null;
    let end = null;
    if (matches && matches.length >= 1) {
      start = parseInt(matches[0], 10);
      end = parseInt(matches[1] || matches[0], 10);
    } else {
      return interaction.editReply({
        content: "❌ Invalid callsign range format in roleMappings."
      });
    }

    const usedNumbers = new Set(
      (await Callsign.find({ department, platform })).map(c => c.number)
    );
    let assignedNumber = null;
    for (let i = start; i <= end; i++) {
      if (!usedNumbers.has(i)) {
        assignedNumber = i;
        break;
      }
    }

    if (!assignedNumber) {
      return interaction.editReply({ content: `❌ No available callsigns left for ${department} on ${platform}.` });
    }

    const callsign = `${prefix}${assignedNumber}`;

    await Callsign.findOneAndUpdate(
      { discordId: user.id, department, platform },
      { discordId: user.id, department, platform, number: assignedNumber },
      { upsert: true, new: true }
    );

    const newNickname = `${callsign} | ${user.username}`.slice(0, 32);
    if (member.nickname !== newNickname) {
      try {
        await member.setNickname(newNickname);
      } catch (err) {
        console.warn("⚠️ Failed to update nickname:", err.message);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("📉 Demotion Successful")
      .setDescription(`<@${user.id}> was demoted to **${prevRank}**`)
      .addFields(
        { name: "Platform", value: platform.toUpperCase(), inline: true },
        { name: "Department", value: department, inline: true },
        { name: "Callsign", value: callsign, inline: true },
        { name: "Reason", value: reason, inline: false },
        { name: "Demoted By", value: `<@${interaction.user.id}>`, inline: false }
      )
      .setColor(0xe74c3c)
      .setFooter({ text: "Prime RP Utilities • Demote" })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};
