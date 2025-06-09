const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const createSecureInvite = require("../utils/createSecureInvite");

const STAFF_ROLE_ID = "1375605232226140300";

const ECONOMY_GUILD_ID = "1369029438351867964";
const XBOX_GUILD_ID = "1372312806107512894";
const PLAYSTATION_GUILD_ID = "1369495333574545559";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("getinvite")
    .setDescription("Staff only: Generate 1-use, 24h invites to Economy + selected platform")
    .addUserOption(option =>
      option.setName("user")
        .setDescription("User that will use the invite")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("platform")
        .setDescription("Select a platform")
        .setRequired(true)
        .addChoices(
          { name: "Xbox", value: "xbox" },
          { name: "PlayStation", value: "playstation" }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
};

  async execute(interaction) {
    const requester = interaction.member;

    if (!requester?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command."
      });
    }
    
    const target = interaction.options.getUser("user");
    const platform = interaction.options.getString("platform");
    const platformGuildId = platform === "xbox" ? XBOX_GUILD_ID : PLAYSTATION_GUILD_ID;

    try {
      const econGuild = await interaction.client.guilds.fetch(ECONOMY_GUILD_ID);
      const econChannel = econGuild.systemChannel || econGuild.channels.cache.find(ch =>
        ch.isTextBased() && ch.permissionsFor(econGuild.members.me).has("CreateInstantInvite")
      );
      if (!econChannel) throw new Error("No valid Economy channel found");

      const econInvite = await econChannel.createInvite({
        maxUses: 1,
        maxAge: 86400,
        unique: true,
        reason: `Staff-generated Economy invite via /getinvite`
      // Economy invite stored in DB
      const econInvite = await createSecureInvite({
        client: interaction.client,
        guildId: ECONOMY_GUILD_ID,
        userId: target.id,
        platform
      });

      // Platform invite
      // Platform invite
      const platformGuild = await interaction.client.guilds.fetch(platformGuildId);
      const platformChannel = platformGuild.systemChannel || platformGuild.channels.cache.find(ch =>
        ch.isTextBased() && ch.permissionsFor(platformGuild.members.me).has("CreateInstantInvite")
      );
      if (!platformChannel) throw new Error("No valid platform channel found");

      const platformInvite = await platformChannel.createInvite({
        maxUses: 1,
        maxAge: 86400,
        unique: true,
        reason: `Staff-generated ${platform} invite via /getinvite`
      // Platform invite stored in DB
      const platformInvite = await createSecureInvite({
        client: interaction.client,
        guildId: platformGuildId,
        userId: target.id,
        platform
      });

      // ✅ Embed
      const embed = new EmbedBuilder()
        .setTitle("Join the server!")
        .setDescription("These invites are valid for 24 hours and can only be used once.")
          .addFields(
          { name: "Economy Server", value: `[Click to Join](${econInvite.url})`, inline: true },
          { name: platform === "xbox" ? "Xbox Server" : "PlayStation Server", value: `[Click to Join](${platformInvite.url})`, inline: true }
          { name: "Economy Server", value: econInvite ? `[Click to Join](${econInvite})` : "Invite failed.", inline: true },
          { name: platform === "xbox" ? "Xbox Server" : "PlayStation Server", value: platformInvite ? `[Click to Join](${platformInvite})` : "Invite failed.", inline: true }
        )
        .setColor(0x00B0F4)
        .setFooter({ text: "Prime Roleplay Security" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("❌ /getinvite error:", err);
      return interaction.reply({
        content: "❌ Could not create invites. Ensure the bot has permissions and a valid channel exists in each server."
      });
    }
  }
};
