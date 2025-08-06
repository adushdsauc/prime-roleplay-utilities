const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Send the verification panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const guildId = '1368341118487494787';
    const channelId = '1400094848404553798';

    const embed = new EmbedBuilder()
      .setTitle('Prime Roleplay Verification')
      .setDescription('Select your platform to begin verification.')
      .setColor(0x2ecc71);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_xbox')
        .setLabel('Xbox')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('verify_playstation')
        .setLabel('PlayStation')
        .setStyle(ButtonStyle.Primary)
    );

    const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
    const channel = await guild?.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return interaction.reply({ content: '❌ Unable to find target channel.', ephemeral: true });
    }

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: '✅ Verification panel sent.', ephemeral: true });
  }
};
