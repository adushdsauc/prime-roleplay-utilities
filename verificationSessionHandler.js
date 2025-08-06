const AuthUser = require('./backend/models/authUser');
const createSecureInvite = require('./utils/createSecureInvite');
const { EmbedBuilder } = require('discord.js');
const {
  MAIN_GUILD_ID,
  APPLIED_ROLE,
  VERIFIED_ROLE,
  XBOX_GUILD_ID,
  PLAYSTATION_GUILD_ID
} = require('./utils/constants');

async function startVerification(interaction, platform) {
  const user = interaction.user;

  // Send login embed
  const loginEmbed = new EmbedBuilder()
    .setTitle('<:checkmark:1378190549428994058> Verification Required')
    .setDescription('Please authenticate with Discord to continue.')
    .addFields({ name: 'Login', value: `[Click here to verify](${process.env.OAUTH_LOGIN_URL})` })
    .setColor(0x111111);

  try {
    await user.send({ embeds: [loginEmbed] });
  } catch (err) {
    if (err.code === 50007) {
      await interaction.reply({
        content: '❌ I cannot DM you. Please enable DMs and try again.',
        ephemeral: true
      });
      return;
    }
  }

  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      content: '✅ Check your DMs to complete verification.',
      ephemeral: true
    });
  }

  let attempts = 0;
  const interval = setInterval(async () => {
    const verified = await AuthUser.findOne({ discordId: user.id });
    if (verified) {
      clearInterval(interval);

      // Update roles in main guild
      try {
        const guild = await interaction.client.guilds.fetch(MAIN_GUILD_ID).catch(() => null);
        const member = await guild?.members.fetch(user.id).catch(() => null);
        if (member) {
          await member.roles.remove(APPLIED_ROLE).catch(() => {});
          await member.roles.add(VERIFIED_ROLE).catch(() => {});
        }
      } catch (err) {
        console.error('Failed to update roles:', err);
      }

      const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
      const invites = {};

      invites.Economy = await createSecureInvite({
        client: interaction.client,
        guildId: process.env.ECONOMY_SERVER_ID,
        userId: user.id,
        platform
      });

      const platformGuildId = platform === 'xbox' ? XBOX_GUILD_ID : PLAYSTATION_GUILD_ID;
      invites[platformLabel] = await createSecureInvite({
        client: interaction.client,
        guildId: platformGuildId,
        userId: user.id,
        platform
      });

      const inviteEmbed = new EmbedBuilder()
        .setTitle('<:checkmark:1378190549428994058> Verified & Ready!')
        .setDescription('Here are your one-time use invite links (valid for 24 hours):')
        .addFields(
          { name: `${platformLabel} Server`, value: invites[platformLabel] || 'Invite failed.' },
          { name: 'Economy Server', value: invites.Economy || 'Invite failed.' }
        )
        .setColor(0x111111);

      await user.send({ embeds: [inviteEmbed] });

      const logChannel = await interaction.client.channels
        .fetch(process.env.APPLICATION_LOG_CHANNEL_ID)
        .catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle('User Verified')
          .setDescription(`<@${user.id}> has been verified.`)
          .addFields({ name: 'Platform', value: platformLabel })
          .setColor(0x00ff00)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
      return;
    }

    if (++attempts > 18) {
      clearInterval(interval);
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('<:Timer:1378190968536432691> Verification Timeout')
            .setDescription('Your session expired. Please try again.')
            .setColor(0x111111)
        ]
      });

      const failLog = await interaction.client.channels
        .fetch(process.env.AUTH_FAIL_LOG_CHANNEL)
        .catch(() => null);
      if (failLog && failLog.isTextBased()) {
        const failEmbed = new EmbedBuilder()
          .setTitle('Verification Failed')
          .setDescription(`<@${user.id}> did not complete verification in time.`)
          .setColor(0xff0000)
          .setTimestamp();
        await failLog.send({ embeds: [failEmbed] });
      }
    }
  }, 10000);
}

module.exports = { startVerification };

