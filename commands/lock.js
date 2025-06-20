const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const logModeration = require('../utils/modLog');
const { v4: uuidv4 } = require('uuid');
const ModCase = require('../models/ModCase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel')
    .addChannelOption(opt => opt.setName('channel').setDescription('Channel').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });

    const caseId = uuidv4().split('-')[0];
    await ModCase.create({
      guildId: interaction.guildId,
      userId: 'N/A',
      moderatorId: interaction.user.id,
      action: 'Lock',
      caseId
    });

    const embed = new EmbedBuilder()
      .setTitle('Channel Locked')
      .setDescription(`<#${channel.id}> locked`)
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Case ID', value: caseId, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
    await logModeration(interaction.guild, embed);
  }
};
