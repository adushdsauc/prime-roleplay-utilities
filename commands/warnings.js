const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Warning = require('../models/Warning');
const ModCase = require('../models/ModCase');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const warnings = await Warning.find({ guildId: interaction.guildId, userId: user.id }).lean();
    const cases = await ModCase.find({ guildId: interaction.guildId, userId: user.id }).lean();
    const all = [...warnings.map(w => ({ action: 'Warn', reason: w.reason, caseId: w.caseId, timestamp: w.timestamp })), ...cases];
    if (!all.length) {
      return interaction.reply({ content: '✅ No moderation history.', ephemeral: true });
    }
    all.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

    const embed = new EmbedBuilder()
      .setTitle(`Moderation History for ${user.tag}`)
      .setColor(0x7289da)
      .setDescription(all.map(c => `**${c.action}** - ${c.reason || 'No reason'} (Case ${c.caseId})`).join('\n'))

      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
