const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModCase = require('../models/ModCase');
const Warning = require('../models/Warning');
const logModeration = require('../utils/modLog');
const createCaseEmbed = require('../utils/createCaseEmbed');

const MUTE_ROLE_ID = process.env.MUTE_ROLE_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Appeal a moderation case by ID')
    .addStringOption(opt => opt.setName('case').setDescription('Case ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const caseId = interaction.options.getString('case');
    const record = await ModCase.findOne({ guildId: interaction.guildId, caseId });
    if (!record) return interaction.reply({ content: '❌ Case not found.', ephemeral: true });

    const member = await interaction.guild.members.fetch(record.userId).catch(() => null);

    if (record.action === 'Ban' || record.action === 'Softban') {
      await interaction.guild.members.unban(record.userId).catch(() => {});
    } else if (record.action === 'Mute' && member && MUTE_ROLE_ID) {
      await member.roles.remove(MUTE_ROLE_ID).catch(() => {});
    } else if (record.action === 'Timeout' && member) {
      await member.timeout(null).catch(() => {});
    }

    if (record.action === 'Warn') {
      await Warning.deleteOne({ guildId: interaction.guildId, caseId });
    }

    await ModCase.deleteOne({ guildId: interaction.guildId, caseId });

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: 'Appeal',
      reason: `Case ${caseId} removed`,
      caseId,
      color: 0x3498db
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });

    const targetUser = member ? member.user : await interaction.client.users.fetch(record.userId).catch(() => null);
    if (targetUser) await targetUser.send({ embeds: [embed] }).catch(() => {});

    await logModeration(interaction.guild, embed);
  }
};
