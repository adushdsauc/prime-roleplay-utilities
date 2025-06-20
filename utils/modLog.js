const ModSetting = require('../models/ModSetting');

module.exports = async function logModeration(guild, embed) {
  try {
    const setting = await ModSetting.findOne({ guildId: guild.id });
    if (!setting) return;
    const channel = await guild.channels.fetch(setting.modLogChannelId);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });

    }
  } catch (err) {
    console.error('❌ Failed to log moderation action:', err);
  }
};
