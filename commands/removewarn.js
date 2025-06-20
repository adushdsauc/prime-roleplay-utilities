const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Warning = require('../models/Warning');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removewarn')
    .setDescription('Remove a warning by case ID')
    .addStringOption(opt => opt.setName('case').setDescription('Case ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const caseId = interaction.options.getString('case');
    const warn = await Warning.findOneAndDelete({ guildId: interaction.guildId, caseId });
    if (!warn) {
      return interaction.reply({ content: '❌ Warning not found.', ephemeral: true });
    }

    await ModCase.deleteOne({ guildId: interaction.guildId, caseId });

    const content = `Warning ${caseId} removed for <@${warn.userId}>.`;
    await interaction.reply({ content, ephemeral: true });

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setDescription(content)
      .setColor(0x3498db);
    await logModeration(interaction.guild, embed);
  }
};
