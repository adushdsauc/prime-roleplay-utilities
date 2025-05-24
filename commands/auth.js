const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const STAFF_ROLE_ID = "1375605232226140300";
const AUTH_URL = "https://prime-roleplay-utilities-production.up.railway.app/auth/login?bypass=true";
const LOG_CHANNEL_ID = "1375641960651689984"; // ⬅️ Replace this with your real log channel ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName("auth")
    .setDescription("Send the authentication link (staff only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers), // ✅ Only visible to users with "Move Members"

  async execute(interaction) {
    const requester = interaction.member;

    // ✅ Staff role check
    if (!requester.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🔐 Authenticate with Prime Roleplay")
      .setDescription(`[Click here to authenticate](${AUTH_URL}) through Discord.\nThis verifies your identity and allows you to access roleplay tools.`)
      .setColor(0x00B0F4)
      .setFooter({ text: "Prime RP Assistant • OAuth Verification" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // ✅ Send verification log to staff channel
    const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setTitle("📨 Auth Link Sent")
        .setDescription(`<@${requester.id}> used the \`/auth\` command.`)
        .addFields({ name: "User", value: `${requester.user.tag}`, inline: true })
        .setColor(0x00B0F4)
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
    }
  }
};
