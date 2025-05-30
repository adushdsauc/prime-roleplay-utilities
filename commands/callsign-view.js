// commands/callsign-view.js
const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
  } = require("discord.js");
  const Callsign = require("../models/Callsign");
  
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
      .setName("callsign")
      .setDescription("View your callsigns across departments or search another user")
      .addSubcommand(sub =>
        sub
          .setName("view")
          .setDescription("View your own callsigns or someone else's (staff only)")
          .addUserOption(opt =>
            opt.setName("user").setDescription("User to view (staff only)").setRequired(false)
          )
      ),
  
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const subcommand = interaction.options.getSubcommand();
  
      if (subcommand === "view") {
        const targetUser = interaction.options.getUser("user") || interaction.user;
        const isSelf = targetUser.id === interaction.user.id;
  
        // Check staff role if attempting to view someone else
        if (!isSelf) {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          const hasStaffRole = STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
          if (!hasStaffRole) {
            return interaction.editReply({
              content: "❌ You don't have permission to view other users' callsigns.",
              ephemeral: true,
            });
          }
        }
  
        const callsigns = await Callsign.find({ discordId: targetUser.id });
        if (!callsigns.length) {
          return interaction.editReply({
            content: `❌ No callsigns found for <@${targetUser.id}>.`,
            ephemeral: true,
          });
        }
  
        const embed = new EmbedBuilder()
          .setTitle(`📟 Callsigns for ${targetUser.tag}`)
          .setDescription("These are the departments and callsigns assigned.")
          .addFields(
            callsigns.map(cs => ({
              name: `Department: ${cs.department}`,
              value: `Callsign: \`${cs.number}\``,
              inline: false,
            }))
          )
          .setColor(0x3498db)
          .setFooter({ text: "Prime RP Utilities • Callsign View" })
          .setTimestamp();
  
        return interaction.editReply({ embeds: [embed] });
      }
    },
  };
  
