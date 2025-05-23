const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const AuthUser = require("../backend/models/authUser");
const axios = require("axios");

const STAFF_ROLE_ID = "YOUR_STAFF_ROLE_ID";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkguilds")
    .setDescription("Check what guilds a user is in (OAuth required)")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User to check")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // base limit
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const requester = interaction.member;

    // ✅ Enforce staff role
    if (!requester.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You don’t have permission to use this command.",
        ephemeral: true
      });
    }

    const authUser = await AuthUser.findOne({ discordId: targetUser.id });
    if (!authUser || !authUser.accessToken) {
      return interaction.reply({
        content: `❌ ${targetUser.tag} has not authenticated via OAuth.`,
        ephemeral: true
      });
    }

    try {
      const guildRes = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `${authUser.tokenType} ${authUser.accessToken}`
        }
      });

      const guilds = guildRes.data.map(g => `• ${g.name} (${g.id})`);
      const output = guilds.length
        ? guilds.join("\n")
        : "No guilds returned.";

      return interaction.reply({
        content: `🧾 Guilds for **${targetUser.tag}**:\n\`\`\`\n${output}\n\`\`\``,
        ephemeral: true
      });
    } catch (err) {
      console.error("Guild fetch error:", err?.response?.data || err.message);
      return interaction.reply({
        content: "❌ Failed to fetch guilds. Their token may have expired.",
        ephemeral: true
      });
    }
  }
};
