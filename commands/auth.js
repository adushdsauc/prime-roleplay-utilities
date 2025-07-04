const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const STAFF_ROLE_ID = "1375605232226140300"; // Your staff role ID
const AUTH_URL = "https://prime-roleplay-utilities-production.up.railway.app/auth/login?bypass=true";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("auth")
    .setDescription("Send the authentication link (staff only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers), // Set required permission

  async execute(interaction) {
    const requester = interaction.member;

    // Role check
    if (!requester.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🔐 Authenticate with Prime Roleplay")
      .setDescription(`[Click here to authenticate](${AUTH_URL}) through Discord.\nThis verifies your identity and allows you to access roleplay tools.`)
      .addFields({ name: "Sent By", value: `<@${requester.id}> (${requester.user.tag})` })
      .setColor(0x00B0F4)
      .setFooter({ text: "Prime Roleplay Security • OAuth Verification" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] }); // Not ephemeral = public in channel
  }
};
