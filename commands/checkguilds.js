const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
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

      if (!requester?.roles?.cache?.has(STAFF_ROLE_ID)) {
        return interaction.reply({
          content: "❌ You do not have permission to use this command.",
          flags: 64
        });
      }

      const authUser = await AuthUser.findOne({ discordId: targetUser.id });
      if (!authUser || !authUser.accessToken) {
        return interaction.reply({
          content: `❌ ${targetUser.tag} has not authenticated through the bot.`,
          flags: 64
        });
      }

      const response = await axios.get("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `${authUser.tokenType} ${authUser.accessToken}`
        }
      });

      const guilds = response.data;
      if (!Array.isArray(guilds)) throw new Error("Invalid guild data received");

      if (guilds.length === 0) {
        return interaction.reply({
          content: `📋 ${targetUser.tag} is not in any guilds.`,
          flags: 64
        });
      }

      // Split into chunks of 25
      const chunks = [];
      for (let i = 0; i < guilds.length; i += 25) {
        const chunk = guilds.slice(i, i + 25);
        const description = chunk.map(g => `• ${g.name} (${g.id})`).join("\n");

        const embed = new EmbedBuilder()
          .setTitle(`Guilds for ${targetUser.tag} (Page ${chunks.length + 1})`)
          .setDescription(description)
          .setColor(0x00B0F4);

        chunks.push(embed);
      }

      return interaction.reply({
        content: `📋 Fetched ${guilds.length} guilds for **${targetUser.tag}**:`,
        embeds: chunks.slice(0, 10), // max 10 embeds per message
        flags: 64
      });

    } catch (err) {
      console.error("❌ /checkguilds error:", {
        message: err.message,
        status: err?.response?.status,
        data: err?.response?.data,
        stack: err.stack
      });

      if (err?.response?.status === 401) {
        return interaction.reply({
          content: `❌ Token expired for <@${interaction.options.getUser("user").id}>. Ask them to run \`/auth\`.`,
          flags: 64
        });
      }

      return interaction.reply({
        content: "❌ Something went wrong. Check the bot logs.",
        flags: 64
      });
    }
  }
};
