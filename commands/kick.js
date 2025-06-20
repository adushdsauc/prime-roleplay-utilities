const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const createCaseEmbed = require('../utils/createCaseEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(opt => opt.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const caseId = uuidv4().split('-')[0];

    await member.kick(reason).catch(() => {});

    await ModCase.create({
      guildId: interaction.guildId,
      userId: member.id,
      moderatorId: interaction.user.id,
      action: 'Kick',
      reason,
      caseId
    });

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: 'Kick',
      reason,
      caseId,
      color: 0xe74c3c
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await member.user.send({ embeds: [embed] }).catch(() => {});
    await logModeration(interaction.guild, embed);
  }
};
