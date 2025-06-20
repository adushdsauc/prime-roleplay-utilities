const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModCase = require('../models/ModCase');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const createCaseEmbed = require('../utils/createCaseEmbed');



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

    const embed = createCaseEmbed({
      guild: interaction.guild,
      moderator: interaction.user,
      action: 'Softban',
      reason,
      caseId,
      color: 0xe67e22
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await user.send({ embeds: [embed] }).catch(() => {});

    await logModeration(interaction.guild, embed);
  }
};
