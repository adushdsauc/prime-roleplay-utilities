const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const parseDuration = require('../utils/parseDuration');
const createCaseEmbed = require('../utils/createCaseEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Duration e.g. 10m').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    const durationStr = interaction.options.getString('duration');
    const duration = parseDuration(durationStr);
    if (!duration) return interaction.reply({ content: '❌ Invalid duration.', ephemeral: true });
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const caseId = uuidv4().split('-')[0];

    await member.timeout(duration, reason).catch(() => {});

    await ModCase.create({
      guildId: interaction.guildId,
      userId: member.id,
      moderatorId: interaction.user.id,
      action: 'Timeout',
      reason,
      duration,
      caseId
    });

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: `Timeout for ${durationStr}`,
      reason,
      caseId,
      color: 0xf1c40f
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await member.user.send({ embeds: [embed] }).catch(() => {});
    await logModeration(interaction.guild, embed);
  }
};
