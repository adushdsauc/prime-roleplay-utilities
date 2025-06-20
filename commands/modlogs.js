const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ModCase = require('../models/ModCase');
const Warning = require('../models/Warning');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('View moderation logs for a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const cases = await ModCase.find({ guildId: interaction.guildId, userId: user.id }).lean();
    const warns = await Warning.find({ guildId: interaction.guildId, userId: user.id }).lean();
    const combined = [...cases, ...warns.map(w => ({ ...w, action: 'Warn' }))];
    if (!combined.length) {
      return interaction.reply({ content: '✅ No moderation history.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Moderation Logs for ${user.tag}`)
      .setColor(0x7289da)
      .setDescription(combined.map(c => `**${c.action}** - ${c.reason || 'No reason'} (Case ${c.caseId})`).join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
