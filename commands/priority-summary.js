const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Priority = require('../models/Priority');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority-summary')
    .setDescription('Show summary of priority usage')
    .addStringOption(o =>
      o.setName('guild')
        .setDescription('Platform guild')
        .setRequired(true)
        .addChoices(
          { name: 'Xbox', value: '1372312806107512894' },
          { name: 'PlayStation', value: '1369495333574545559' }
        ))
    .addIntegerOption(o =>
      o.setName('days')
        .setDescription('Number of days to look back')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.options.getString('guild');
    const days = interaction.options.getInteger('days') || 7;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await Priority.find({ guildId, createdAt: { $gte: start } });

    if (!records.length) {
      return interaction.editReply('No priority data for that period.');
    }

    const typeCounts = {};
    const requesterCounts = {};
    let denials = 0;
    let noStarts = 0;

    for (const r of records) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      requesterCounts[r.requesterId] = (requesterCounts[r.requesterId] || 0) + 1;
      if (r.status === 'denied') denials++;
      if (r.status === 'approved' && !r.startedAt) noStarts++;
    }

    const topTypes = Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([t,c]) => `${t}: ${c}`).join('\n');
    const topRequesters = Object.entries(requesterCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([u,c]) => `<@${u}>: ${c}`).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('Priority Summary')
      .addFields(
        { name: 'Top Types', value: topTypes || 'None' },
        { name: 'Top Requesters', value: topRequesters || 'None' },
        { name: 'Denials', value: String(denials), inline: true },
        { name: 'No Starts', value: String(noStarts), inline: true }
      )
      .setColor(0x2B2D31);

    await interaction.editReply({ embeds: [embed] });
  }
};
