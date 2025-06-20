const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const Warning = require('../models/Warning');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const createCaseEmbed = require('../utils/createCaseEmbed');

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

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: 'Warn',
      reason,
      caseId,
      color: 0xe67e22
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await user.send({ embeds: [embed] }).catch(() => {});
    await logModeration(interaction.guild, embed);
  }
};
