const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logModeration = require('../utils/modLog');
const { EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const ModCase = require('../models/ModCase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete a number of messages')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number of messages').setRequired(true))
    .addUserOption(opt => opt.setName('user').setDescription('Only messages from user').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('user');
    const messages = await interaction.channel.messages.fetch({ limit: amount });
    let toDelete = messages;
    if (target) toDelete = messages.filter(m => m.author.id === target.id);
    await interaction.channel.bulkDelete(toDelete, true);

    const caseId = uuidv4().split('-')[0];
    await ModCase.create({
      guildId: interaction.guildId,
      userId: target ? target.id : 'N/A',
      moderatorId: interaction.user.id,
      action: 'Purge',
      reason: `${amount} messages deleted`,
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('Messages Purged')
      .setDescription(`${toDelete.size} messages deleted`)
      .setColor(0x7289da)
      .addFields(
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
