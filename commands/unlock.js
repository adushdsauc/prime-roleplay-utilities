const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const ModCase = require('../models/ModCase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });

    const caseId = uuidv4().split('-')[0];
    await ModCase.create({
      guildId: interaction.guildId,
      userId: 'N/A',
      moderatorId: interaction.user.id,
      action: 'Unlock',
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('Channel Unlocked')
      .setDescription(`<#${channel.id}> unlocked`)
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
