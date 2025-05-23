const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const AuthUser = require("../backend/models/authUser");
const axios = require("axios");

const STAFF_ROLE_ID = "1368345392516698222";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkguilds")
    .setDescription("Staff only: Check what guilds a user is in via OAuth")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("Select a user to check")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("user");
      const requester = interaction.member;

      // ✅ Check if requester has staff role
      if (!requester?.roles?.cache?.has(STAFF_ROLE_ID)) {
        return interaction.reply({
          content: "❌ You do not have permission to use this command.",
          ephemeral: true
        });
      }

      // ✅ Lookup OAuth data
      const authUser = await AuthUser.findOne({ discordId: targetUser.id });
      if (!authUser || !authUser.accessToken) {
        return interaction.reply({
          content: `❌ ${targetUser.tag} has not authenticated through the bot.`,
          ephemeral: true
        });
      }

      // ✅ Fetch guilds from Discord API
      const response = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `${authUser.tokenType} ${authUser.accessToken}`
        }
      });

      const guilds = response.data;
      if (!Array.isArray(guilds)) throw new Error("Invalid guild data received");

      const list = guilds.map(g => `• ${g.name} (${g.id})`);
      const output = list.length ? list.join("\n") : "No guilds returned.";

      return interaction.reply({
        content: `📋 Guilds for **${targetUser.tag}**:\n\`\`\`\n${output}\n\`\`\``,
        ephemeral: true
      });

    } catch (err) {
      console.error("❌ /checkguilds error:", err?.response?.data || err.message);
      return interaction.reply({
        content: "❌ Something went wrong. Check the bot logs for details.",
        ephemeral: true
      });
    }
  }
};
