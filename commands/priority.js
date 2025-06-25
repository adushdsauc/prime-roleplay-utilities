const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const Priority = require('../models/Priority');
const roleMappings = require('../utils/roleMappings');

const COOLDOWNS = {
  '10-70': 15 * 60 * 1000,
  '10-80': 30 * 60 * 1000,
  'Hostage': 45 * 60 * 1000
};

const RANK_REQUIREMENTS = {
  '10-70': 'Civ 2',
  '10-80': 'Civ 3',
  'Hostage': 'Civ 4'
};

const STAFF_ROLE_IDS = [
  '1372312806157717556',
  '1372312806191399024',
  '1372312806212239406',
  '1370884299712233592',
  '1370884306964185138',
  '1370968063431671969'
];

const cooldownOverrides = new Set();
const reminderTimers = new Map();


module.exports = {
  data: new SlashCommandBuilder()
    .setName('priority')
    .setDescription('Priority system commands')
    .addSubcommand(sub =>
      sub.setName('request')
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
    )
    .addSubcommand(sub =>
      sub.setName('force-end')
        .setDescription('Force end an active priority')
        .addStringOption(opt =>
          opt.setName('id').setDescription('Request ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('override')
        .setDescription('Bypass cooldown for the next priority request')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'request') {
      await handleRequest(interaction);
    } else if (sub === 'force-end') {
      await handleForceEnd(interaction);
    } else if (sub === 'override') {
      await handleOverride(interaction);
    }
  }
};

async function handleRequest(interaction) {
  const guildId = interaction.guildId;
  const platform = guildId === '1372312806107512894' ? 'xbox' : 'playstation';

  const existing = await Priority.findOne({ guildId, status: { $in: ['pending', 'approved', 'active'] } });
  if (existing) {
    return interaction.reply({ content: '❌ A priority is already pending or active for this server.', ephemeral: true });
  }

  const type = interaction.options.getString('type');
  const now = new Date();
  if (!cooldownOverrides.has(guildId)) {
    const onCooldown = await Priority.findOne({ guildId, type, cooldownEndsAt: { $gt: now } }).sort({ cooldownEndsAt: -1 });
    if (onCooldown) {
      const remaining = Math.ceil((onCooldown.cooldownEndsAt - now) / 60000);
      return interaction.reply({ content: `❌ This priority type is on cooldown for another ${remaining} minutes.`, ephemeral: true });
    }
  } else {
    cooldownOverrides.delete(guildId);
  }

  const reason = interaction.options.getString('reason');
  const duration = interaction.options.getString('duration');
  const participantsRaw = interaction.options.getString('participants') || '';
  const ids = [...new Set((participantsRaw.match(/\d{17,}/g) || []))];

  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const ranks = roleMappings['Civilian'].order;
  const requiredRank = RANK_REQUIREMENTS[type];
  const requiredIndex = ranks.indexOf(requiredRank);
  let memberIndex = -1;
  for (const rank of ranks) {
    const roleId = roleMappings['Civilian'][rank]?.[platform]?.roleId;
    if (member.roles.cache.has(roleId)) {
      memberIndex = ranks.indexOf(rank);
    }
  }
  if (memberIndex === -1 || memberIndex < requiredIndex) {
    return interaction.reply({ content: `❌ You must be ${requiredRank} or higher to request this priority.`, ephemeral: true });
  }

  for (const pid of ids) {
    const participant = await guild.members.fetch(pid).catch(() => null);
    if (!participant) {
      return interaction.reply({ content: `❌ Could not find participant <@${pid}>.`, ephemeral: true });
    }
    let pIndex = -1;
    for (const rank of ranks) {
      const roleId = roleMappings['Civilian'][rank]?.[platform]?.roleId;
      if (participant.roles.cache.has(roleId)) {
        pIndex = ranks.indexOf(rank);
      }
    }
    if (pIndex === -1 || pIndex < requiredIndex) {
      return interaction.reply({ content: `❌ Participant <@${pid}> does not meet the rank requirement (${requiredRank}+).`, ephemeral: true });
    }
  }

  const requestId = uuidv4();
  await Priority.create({
    guildId,
    requestId,
    requesterId: interaction.user.id,
    participants: ids,
    type,
    reason,
    estimatedDuration: duration ? Number(duration) : undefined
  });

  const embed = new EmbedBuilder()
    .setTitle('Priority Request')
    .setColor(0x2B2D31)
    .addFields(
      { name: 'Requester', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Type', value: type, inline: true },
      { name: 'Reason', value: reason },
      { name: 'Participants', value: ids.length ? ids.map(id => `<@${id}>`).join(', ') : 'None' },
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

  const userRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`priority_withdraw_${requestId}`).setLabel('Withdraw Request').setStyle(ButtonStyle.Danger)
  );
  await interaction.user.send({ content: 'Your priority request has been sent to staff.', components: [userRow] }).catch(() => {});

  await interaction.reply({ content: '✅ Priority request submitted for staff review.', ephemeral: true });
}

async function handleForceEnd(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasStaff = STAFF_ROLE_IDS.some(id => member.roles.cache.has(id));
  if (!hasStaff) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }

  const requestId = interaction.options.getString('id');
  const request = await Priority.findOne({ requestId });
  if (!request || request.status !== 'active') {
    return interaction.reply({ content: '❌ Priority not found or not active.', ephemeral: true });
  }

  request.status = 'ended';
  request.endedAt = new Date();
  request.cooldownEndsAt = new Date(request.endedAt.getTime() + (COOLDOWNS[request.type] || 0));
  await request.save();

  await interaction.reply({ content: '✅ Priority force ended.', ephemeral: true });
}

async function handleOverride(interaction) {
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasStaff = STAFF_ROLE_IDS.some(id => member.roles.cache.has(id));
  if (!hasStaff) {
    return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
  }
  cooldownOverrides.add(interaction.guildId);
  await interaction.reply({ content: '✅ The next priority request will bypass cooldowns.', ephemeral: true });
}