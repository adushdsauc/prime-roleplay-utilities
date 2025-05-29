const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
  } = require("discord.js");
  const Callsign = require("../models/Callsign");
  const roleMappings = require("../utils/roleMappings");
  
  const XBOX_GUILD_ID = "1372312806107512894";
  const PLAYSTATION_GUILD_ID = "1369495333574545559";
  
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
      const platform =
        guild.id === XBOX_GUILD_ID
          ? "xbox"
          : guild.id === PLAYSTATION_GUILD_ID
          ? "playstation"
          : null;
  
      if (!platform) {
        return interaction.editReply({
          content: "❌ Unsupported server (not Xbox or PlayStation).",
          ephemeral: true,
        });
      }
  
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.editReply({
          content: "❌ Could not find the member.",
          ephemeral: true,
        });
      }
  
      const departmentRoles = Object.entries(roleMappings[department]);
  
      console.log("🧠 Member roles:", member.roles.cache.map(r => `${r.name} (${r.id})`));
      console.log("📌 Checking department roles:", departmentRoles.map(([rank, obj]) => `${rank}: ${obj[platform].roleId}`));
  
      // 🔍 Find current role from highest to lowest
      let currentIndex = -1;
      for (let i = departmentRoles.length - 1; i >= 0; i--) {
        const [, roleObj] = departmentRoles[i];
        if (member.roles.cache.has(roleObj[platform].roleId)) {
          currentIndex = i;
          break;
        }
      }
  
      if (currentIndex === -1 || currentIndex === departmentRoles.length - 1) {
        return interaction.editReply({
          content: "❌ Cannot promote — not in a valid rank or already at top rank.",
          ephemeral: true,
        });
      }
  
      const [currentRank, currentRole] = departmentRoles[currentIndex];
      const [nextRank, nextRole] = departmentRoles[currentIndex + 1];
  
      // 🔁 Remove all department roles first
      for (const [, roleObj] of departmentRoles) {
        await member.roles.remove(roleObj[platform].roleId).catch(() => {});
      }
  
      // ✅ Add new role
      await member.roles.add(nextRole[platform].roleId).catch(() => {});
  
      // 🎖 Assign next available callsign in range
      const range = nextRole[platform].range;
      const [start, end] = range.includes("-")
        ? range.replace(/[A-Za-z]/g, "").split("-").map(n => parseInt(n.trim()))
        : [parseInt(range.replace(/[^\d]/g, "")), parseInt(range.replace(/[^\d]/g, ""))];
  
      const prefix = range.match(/[A-Za-z\-]+/g)?.[0]?.trim() || "";
      let assignedNumber;
  
      for (let i = start; i <= end; i++) {
        const existing = await Callsign.findOne({ department, number: i });
        if (!existing) {
          assignedNumber = i;
          break;
        }
      }
  
      if (!assignedNumber) {
        return interaction.editReply({ content: "❌ No available callsigns left.", ephemeral: true });
      }
  
      await Callsign.findOneAndUpdate(
        { discordId: user.id, department },
        { discordId: user.id, department, number: assignedNumber },
        { upsert: true, new: true }
      );
  
      const callsign = `${prefix}${assignedNumber}`;
      await member.setNickname(`${callsign} | ${member.user.username}`).catch(() => {});
  
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
  
