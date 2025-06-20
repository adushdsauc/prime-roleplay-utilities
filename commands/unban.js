const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const ModCase = require('../models/ModCase');
const createCaseEmbed = require('../utils/createCaseEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .addStringOption(opt => opt.setName('id').setDescription('User ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const id = interaction.options.getString('id');
    const reason = 'Unban';
    const caseId = uuidv4().split('-')[0];
    await interaction.guild.members.unban(id).catch(() => {});

    await ModCase.create({
      guildId: interaction.guildId,
      userId: id,
      moderatorId: interaction.user.id,
      action: 'Unban',
      reason,
      caseId
    });

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: 'Unban',
      reason,
      caseId,
      color: 0x1abc9c
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    const target = await interaction.client.users.fetch(id).catch(() => null);
    if (target) await target.send({ embeds: [embed] }).catch(() => {});
    await logModeration(interaction.guild, embed);
  }
};
