const { SlashCommandBuilder } = require("discord.js");
const AuthUser = require("../backend/models/authUser");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("myguilds")
    .setDescription("DMs you a list of guilds you're in (via OAuth)"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const authUser = await AuthUser.findOne({ discordId: userId });

    if (!authUser || !authUser.accessToken) {
      return interaction.editReply("❌ You haven't authenticated through the bot yet.");
    }

    try {
      const guildRes = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `${authUser.tokenType} ${authUser.accessToken}`
        }
      });

      const guildNames = guildRes.data.map(g => g.name);
      const guildList = guildNames.length > 0
        ? guildNames.join("\n")
        : "You're not in any guilds (or none were returned).";

      await interaction.user.send({
        content: `📜 **Guilds you're in:**\n\`\`\`\n${guildList}\n\`\`\``
      });

      await interaction.editReply("✅ Sent you a DM with your guild list.");
    } catch (err) {
      console.error("Error fetching guilds:", err?.response?.data || err.message);
      return interaction.editReply("❌ Could not fetch your guilds. Please reauthenticate.");
    }
  }
};
