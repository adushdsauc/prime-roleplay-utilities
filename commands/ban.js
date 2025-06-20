const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const caseId = uuidv4().split('-')[0];

    await interaction.guild.members.ban(user.id, { reason }).catch(() => {});

    await ModCase.create({
      guildId: interaction.guildId,
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'Ban',
      reason,
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('🔨 User Banned')
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setColor(0xc0392b)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
