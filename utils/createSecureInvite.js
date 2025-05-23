const Invite = require("../models/Invite");

module.exports = async function createSecureInvite({ client, guildId, userId, platform }) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();
    const channel = [...channels.values()].find(c => c.isTextBased());

    if (!channel) throw new Error("No text-based channel found");

    const invite = await channel.createInvite({
      maxUses: 1,
      maxAge: 86400, // 24 hours
      unique: true,
    });

    await Invite.create({
      code: invite.code,
      userId,
      guildId,
      platform,
    });

    return invite.url;
  } catch (err) {
    console.error("❌ Error creating secure invite:", err);
    return null;
  }
};
