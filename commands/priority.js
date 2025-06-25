const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const Priority = require('../models/Priority');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Request a priority scene')
    .addStringOption(opt =>
      opt.setName('type').setDescription('Priority type').setRequired(true)
        .addChoices(
          { name: '10-70', value: '10-70' },
          { name: '10-80', value: '10-80' },
          { name: 'Hostage', value: 'Hostage' }
        ))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Scene reason').setRequired(true))
    .addStringOption(opt =>
      opt.setName('duration').setDescription('Estimated duration in minutes'))
    .addStringOption(opt =>
      opt.setName('participants').setDescription('Other participants (IDs or mentions)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const existing = await Priority.findOne({ guildId, status: { $in: ['pending', 'approved', 'active'] } });
    if (existing) {
      return interaction.reply({ content: '❌ A priority is already pending or active for this server.', ephemeral: true });
    }

    const type = interaction.options.getString('type');
    const reason = interaction.options.getString('reason');
    const duration = interaction.options.getString('duration');
    const participantsRaw = interaction.options.getString('participants') || '';
    const participants = participantsRaw.split(/\s+/).filter(Boolean);
    const requestId = uuidv4();

    await Priority.create({
      guildId,
      requestId,
      requesterId: interaction.user.id,
      participants,
      type,
      reason,
      estimatedDuration: duration ? Number(duration) : undefined,
    });

    const embed = new EmbedBuilder()
      .setTitle('Priority Request')
      .setColor(0x2B2D31)
      .addFields(
        { name: 'Requester', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Type', value: type, inline: true },
        { name: 'Reason', value: reason },
        { name: 'Participants', value: participants.length ? participants.join(', ') : 'None' },
        ...(duration ? [{ name: 'Estimated', value: `${duration} min`, inline: true }] : [])
      )
      .setFooter({ text: `Request ID: ${requestId}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`priority_accept_${requestId}`).setLabel('Accept').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`priority_deny_${requestId}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
    );

    const channels = {
      '1372312806107512894': process.env.XBOX_PRIORITY_REQUEST_CHANNEL_ID,
      '1369495333574545559': process.env.PS_PRIORITY_REQUEST_CHANNEL_ID,
    };

    const channelId = channels[guildId];
    const channel = channelId ? await interaction.client.channels.fetch(channelId).catch(() => null) : null;
    if (!channel) {
      return interaction.reply({ content: '❌ Priority request channel not configured.', ephemeral: true });
    }

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Priority request submitted for staff review.', ephemeral: true });
  }
};
