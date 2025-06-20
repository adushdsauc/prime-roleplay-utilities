const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Warning = require('../models/Warning');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const warns = await Warning.find({ guildId: interaction.guildId, userId: user.id }).lean();

    if (!warns.length) {
      return interaction.reply({ content: '✅ No warnings found for this user.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${user.tag}`)
      .setColor(0xe67e22)
      .setDescription(warns.map(w => `**${w.caseId}** - ${w.reason}`).join('\n'))
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
