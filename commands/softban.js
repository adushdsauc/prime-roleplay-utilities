const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Softban (ban and unban) a user to delete messages')
    .addUserOption(opt => opt.setName('user').setDescription('User to softban').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const caseId = uuidv4().split('-')[0];

    await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds: 604800 }).catch(() => {});
    await interaction.guild.members.unban(user.id).catch(() => {});

    await ModCase.create({
      guildId: interaction.guildId,
      userId: user.id,
      moderatorId: interaction.user.id,
      action: 'Softban',
      reason,
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('User Softbanned')
      .addFields(
        { name: 'User', value: `<@${user.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason, inline: false },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setColor(0xe67e22)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
