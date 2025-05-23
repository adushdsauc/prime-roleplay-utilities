// commands/apply.js
const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Send the application panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Restrict to staff/admins

  async execute(interaction) {
    // Create the dropdown menu
    const menu = new StringSelectMenuBuilder()
      .setCustomId("application_type")
      .setPlaceholder("Select an application type...")
      .addOptions([
        {
          label: "Civilian Application",
          value: "civilian",
          description: "Apply as a civilian in Prime RP",
        },
        {
          label: "Public Safety Office Application",
          value: "pso",
          description: "Apply for a position in the PSO (LEO)",
        },
        {
          label: "San Andreas Fire Rescue Application",
          value: "safr",
          description: "Apply for Fire/EMS service in SAFR",
        },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      embeds: [
        {
          title: "📋 Prime Roleplay Applications",
          description:
            "Please select which department you'd like to apply for. Once selected, you’ll receive a DM to begin the process.",
          color: 0x2ecc71,
        },
      ],
      components: [row],
      ephemeral: true,
    });
  },
};
