const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const Warning = require('../models/Warning');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to warn').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for warning').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const caseId = uuidv4().split('-')[0];

    await Warning.create({
      guildId: interaction.guildId,
      userId: user.id,
      moderatorId: interaction.user.id,
      reason,
      caseId
    });

    await ModCase.create({
      guildId: interaction.guildId,
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'Warn',
      reason,
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('⚠️ User Warned')
      .setColor(0xe67e22)
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
