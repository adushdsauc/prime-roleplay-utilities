const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const parseDuration = require('../utils/parseDuration');
const { v4: uuidv4 } = require('uuid');
const createCaseEmbed = require('../utils/createCaseEmbed');


const MUTE_ROLE_ID = process.env.MUTE_ROLE_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user by role')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('Duration e.g. 10m').setRequired(false))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!MUTE_ROLE_ID) return interaction.reply({ content: 'Mute role not configured.', ephemeral: true });
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    const durationStr = interaction.options.getString('duration');
    const duration = durationStr ? parseDuration(durationStr) : null;
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const caseId = uuidv4().split('-')[0];

    await member.roles.add(MUTE_ROLE_ID).catch(() => {});
    if (duration) setTimeout(() => member.roles.remove(MUTE_ROLE_ID).catch(() => {}), duration);

    await ModCase.create({
      guildId: interaction.guildId,
      userId: member.id,
      moderatorId: interaction.user.id,
      action: 'Mute',
      reason,
      duration,
      caseId
    });

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: durationStr ? `Mute for ${durationStr}` : 'Mute',
      reason,
      caseId,
      color: 0x95a5a6
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await member.user.send({ embeds: [embed] }).catch(() => {});

    await logModeration(interaction.guild, embed);
  }
};
