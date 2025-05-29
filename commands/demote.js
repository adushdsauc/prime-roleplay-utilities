// commands/demote.js
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
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
  
      const commandUser = await interaction.guild.members.fetch(interaction.user.id);
      const hasStaffRole = STAFF_ROLE_IDS.some(roleId =>
        commandUser.roles.cache.has(roleId)
      );
      if (!hasStaffRole) {
        return interaction.editReply({
          content: "❌ You do not have permission to use this command.",
          ephemeral: true
        });
      }
  
      const user = interaction.options.getUser("user");
      const department = interaction.options.getString("department");
      const guild = interaction.guild;
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
  
      const departmentRoles = Object.entries(roleMappings[department]).reverse();
      let currentIndex = -1;
      for (let i = 0; i < departmentRoles.length; i++) {
        const [, roleObj] = departmentRoles[i];
        if (member.roles.cache.has(roleObj[platform].roleId)) {
          currentIndex = i;
          break;
        }
      }
  
      if (currentIndex === -1 || currentIndex === 0) {
        return interaction.editReply({ content: "❌ Cannot demote — not in a valid rank or already at lowest rank." });
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
        return interaction.editReply({ content: "❌ Invalid callsign range format in roleMappings." });
      }
  
      const usedNumbers = new Set((await Callsign.find({ department })).map(c => c.number));
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
      if (member.nickname !== newNickname) {
        await member.setNickname(newNickname).catch(err => {
          console.warn("⚠️ Failed to update nickname:", err.message);
        });
      }
  
      const embed = new EmbedBuilder()
        .setTitle("📉 Demotion Successful")
        .setDescription(`<@${user.id}> was demoted to **${prevRank}**`)
        .addFields(
          { name: "Platform", value: platform.toUpperCase(), inline: true },
          { name: "Department", value: department, inline: true },
          { name: "Callsign", value: callsign, inline: true }
        )
        .setColor(0xe74c3c)
        .setFooter({ text: "Prime RP Utilities • Demote" })
        .setTimestamp();
  
      return interaction.editReply({ embeds: [embed] });
    },
  };
  
