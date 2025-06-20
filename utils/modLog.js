const { EmbedBuilder } = require('discord.js');

module.exports = async function logModeration(guild, embedContent) {
  const channelId = process.env.MOD_LOG_CHANNEL_ID;
  if (!channelId) return;

  try {
    const channel = await guild.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embedContent] });
    }
  } catch (err) {
    console.error('❌ Failed to log moderation action:', err);
  }
};
