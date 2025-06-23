const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const summarizeShifts = require('../utils/weeklyShiftSummary');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift-summary')
    .setDescription('Manually summarize and clear weekly shifts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      await summarizeShifts(interaction.client);
      await interaction.editReply('Shifts Summarized..');
    } catch (err) {
      console.error('❌ Error summarizing shifts:', err);
      await interaction.editReply('❌ Failed to summarize shifts.');
    }
  }
};
