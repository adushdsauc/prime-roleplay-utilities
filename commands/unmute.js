const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');

const MUTE_ROLE_ID = process.env.MUTE_ROLE_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove mute from a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!MUTE_ROLE_ID) return interaction.reply({ content: 'Mute role not configured.', ephemeral: true });
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    const caseId = uuidv4().split('-')[0];

    await member.roles.remove(MUTE_ROLE_ID).catch(() => {});

    await ModCase.create({
      guildId: interaction.guildId,
      userId: member.id,
      moderatorId: interaction.user.id,
      action: 'Unmute',
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('User Unmuted')
      .addFields(
        { name: 'User', value: `<@${member.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setColor(0x1abc9c)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
