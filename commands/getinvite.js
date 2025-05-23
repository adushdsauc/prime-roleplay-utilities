const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const STAFF_ROLE_ID = "1368345392516698222";

// Replace these with your actual server IDs
const ECONOMY_SERVER_ID = "1369029438351867964";
const XBOX_SERVER_ID = "1372312806107512894";
const PLAYSTATION_SERVER_ID = "1369495333574545559";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getinvite")
    .setDescription("Staff only: Generate 1-use, 24h invites to Economy + selected platform")
    .addStringOption(option =>
      option.setName("platform")
        .setDescription("Select a platform")
        .setRequired(true)
        .addChoices(
          { name: "Xbox", value: "xbox" },
          { name: "PlayStation", value: "playstation" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const requester = interaction.member;

    if (!requester?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command."
      });
    }

    const platform = interaction.options.getString("platform");

    // Pick the platform guild ID
    const platformGuildId = platform === "xbox" ? XBOX_GUILD_ID : PLAYSTATION_GUILD_ID;

    try {
      // Fetch Economy guild + first available channel
      const econGuild = await interaction.client.guilds.fetch(ECONOMY_GUILD_ID);
      const econChannel = econGuild.systemChannel || econGuild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(econGuild.members.me).has("CreateInstantInvite"));

      if (!econChannel) throw new Error("No valid Economy channel found");

      const econInvite = await econChannel.createInvite({
        maxUses: 1,
        maxAge: 86400,
        unique: true,
        reason: `Staff-generated Economy invite via /getinvite`
      });

      // Fetch Platform guild + first valid channel
      const platformGuild = await interaction.client.guilds.fetch(platformGuildId);
      const platformChannel = platformGuild.systemChannel || platformGuild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(platformGuild.members.me).has("CreateInstantInvite"));

      if (!platformChannel) throw new Error("No valid platform channel found");

      const platformInvite = await platformChannel.createInvite({
        maxUses: 1,
        maxAge: 86400,
        unique: true,
        reason: `Staff-generated ${platform} invite via /getinvite`
      });

      return interaction.reply({
        content: `✅ 1-use, 24-hour invites:\n• Economy: ${econInvite.url}\n• ${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${platformInvite.url}`
      });

    } catch (err) {
      console.error("❌ /getinvite error:", err);
      return interaction.reply({
        content: "❌ Could not create invites. Ensure the bot has permission and at least one text channel is accessible in each server."
      });
    }
  }
};
