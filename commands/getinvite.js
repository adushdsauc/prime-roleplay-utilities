const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const axios = require("axios");

const STAFF_ROLE_ID = "1368345392516698222";

// Replace these with your actual server IDs
const ECONOMY_SERVER_ID = "1369029438351867964";
const XBOX_SERVER_ID = "1372312806107512894";
const PLAYSTATION_SERVER_ID = "1369495333574545559";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getinvite")
    .setDescription("Staff only: Generate 1-use, 24h invites for Economy + selected platform")
    .addStringOption(option =>
      option.setName("platform")
        .setDescription("Select the platform")
        .setRequired(true)
        .addChoices(
          { name: "Xbox", value: "xbox" },
          { name: "PlayStation", value: "playstation" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const requester = interaction.member;

    // ✅ Enforce staff role
    if (!requester?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command."
      });
    }

    const platform = interaction.options.getString("platform");
    const platformGuildId =
      platform === "xbox" ? XBOX_SERVER_ID :
      platform === "playstation" ? PLAYSTATION_SERVER_ID : null;

    if (!platformGuildId) {
      return interaction.reply({ content: "❌ Invalid platform selected." });
    }

    try {
      // Generate invite for Economy server
      const econInvite = await axios.post(
        `https://discord.com/api/v10/guilds/${ECONOMY_SERVER_ID}/invites`,
        {
          max_uses: 1,
          max_age: 86400, // 24 hours
          unique: true
        },
        {
          headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      // Generate invite for selected platform
      const platformInvite = await axios.post(
        `https://discord.com/api/v10/guilds/${platformGuildId}/invites`,
        {
          max_uses: 1,
          max_age: 86400, // 24 hours
          unique: true
        },
        {
          headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );

      return interaction.reply({
        content: `🎫 Here are your 1-use, 24h invite links:\n` +
                 `• Economy: ${econInvite.data.url}\n` +
                 `• ${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${platformInvite.data.url}`
      });

    } catch (err) {
      console.error("❌ /getinvite error:", err?.response?.data || err.message);
      return interaction.reply({
        content: "❌ Failed to create one or more invites. Check the bot's permissions and try again."
      });
    }
  }
};
