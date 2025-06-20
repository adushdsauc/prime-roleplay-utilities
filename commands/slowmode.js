const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const ModCase = require('../models/ModCase');
const parseDuration = require('../utils/parseDuration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for this channel')
    .addStringOption(opt => opt.setName('duration').setDescription('Duration e.g. 5s').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const durationStr = interaction.options.getString('duration');
    const duration = parseDuration(durationStr);
    if (duration === null) return interaction.reply({ content: '❌ Invalid duration.', ephemeral: true });
    const seconds = duration / 1000;
    await interaction.channel.setRateLimitPerUser(seconds);

    const caseId = uuidv4().split('-')[0];
    await ModCase.create({
      guildId: interaction.guildId,
      userId: 'N/A',
      moderatorId: interaction.user.id,
      action: 'Slowmode',
      reason: `${seconds}s`,
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('Slowmode Updated')
      .setDescription(`Slowmode set to ${seconds}s`)
      .setColor(0x3498db)
      .addFields(
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
