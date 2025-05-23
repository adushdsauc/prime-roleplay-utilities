const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const AuthUser = require("../backend/models/authUser");
const axios = require("axios");

const STAFF_ROLE_ID = "1368345392516698222";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkguilds")
    .setDescription("Staff only: Check what guilds a user is in (via OAuth)")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Select the user to check")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const requester = interaction.member;

    // ✅ Staff role check
    if (!requester.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    // ✅ Lookup the target user in MongoDB
    const authUser = await AuthUser.findOne({ discordId: targetUser.id });
    if (!authUser || !authUser.accessToken) {
      return interaction.reply({
        content: `❌ ${targetUser.tag} has not authenticated via the bot.`,
        ephemeral: true
      });
    }

    try {
      const response = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `${authUser.tokenType} ${authUser.accessToken}`
        }
      });

      const guilds = response.data;
      const lines = guilds.map(g => `• ${g.name} (${g.id})`);
      const output = lines.length ? lines.join("\n") : "No guilds returned.";

      return interaction.reply({
        content: `📋 **Guilds for ${targetUser.tag}:**\n\`\`\`\n${output}\n\`\`\``,
        ephemeral: true
      });
    } catch (err) {
      console.error("❌ Guild fetch error:", err?.response?.data || err.message);
      return interaction.reply({
        content: "❌ Could not fetch guilds. Their token may have expired or been revoked.",
        ephemeral: true
      });
    }
  }
};
