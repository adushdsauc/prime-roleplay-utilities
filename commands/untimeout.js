const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const createCaseEmbed = require('../utils/createCaseEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove timeout from a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });
    const caseId = uuidv4().split('-')[0];

    await member.timeout(null).catch(() => {});

    await ModCase.create({
      guildId: interaction.guildId,
      userId: member.id,
      moderatorId: interaction.user.id,
      action: 'Untimeout',
      caseId
    });

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: 'Untimeout',
      reason: 'Untimeout',
      caseId,
      color: 0x2ecc71
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await member.user.send({ embeds: [embed] }).catch(() => {});
    await logModeration(interaction.guild, embed);
  }
};
