const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift')
    .setDescription('Start a shift for your department')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const departmentMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_department')
        .setPlaceholder('Select your department')
        .addOptions([
          { label: 'Civilian', value: 'Civilian' },
          { label: 'Public Safety', value: 'Public Safety' },
          { label: 'SA Fire Rescue', value: 'SA Fire Rescue' },
        ])
    );

    await interaction.reply({
      content: 'What department are you clocking in for?',
      components: [departmentMenu],
      ephemeral: true,
    });
  },
};
