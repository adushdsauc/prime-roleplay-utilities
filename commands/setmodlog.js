const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ModSetting = require('../models/ModSetting');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setmodlog')
    .setDescription('Set the moderation log channel for this guild')
    .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    await ModSetting.findOneAndUpdate(
      { guildId: interaction.guildId },
      { modLogChannelId: channel.id },
      { upsert: true, new: true }
    );
    await interaction.reply({ content: `✅ Mod log channel set to <#${channel.id}>`, ephemeral: true });
  }
};
