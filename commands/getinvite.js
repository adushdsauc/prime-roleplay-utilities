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

  async execute(interaction) {
    const requester = interaction.member;

    if (!requester?.roles?.cache?.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true
      });
    }

    const target = interaction.options.getUser("user");
    const platform = interaction.options.getString("platform");
    const platformGuildId = platform === "xbox" ? XBOX_GUILD_ID : PLAYSTATION_GUILD_ID;

    try {
      // Create Economy server invite
      const econInvite = await createSecureInvite({
        client: interaction.client,
        guildId: ECONOMY_GUILD_ID,
        userId: target.id,
        platform
      });

      // Create Platform server invite
      const platformInvite = await createSecureInvite({
        client: interaction.client,
        guildId: platformGuildId,
        userId: target.id,
        platform
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ One-Time Server Invites")
        .setDescription("These invites are valid for 24 hours and can only be used once.")
        .addFields(
          { name: "Economy Server", value: `[Click to Join](${econInvite})`, inline: true },
          { name: platform === "xbox" ? "Xbox Server" : "PlayStation Server", value: `[Click to Join](${platformInvite})`, inline: true }
        )
        .setColor(0x00B0F4)
        .setFooter({ text: "Prime Roleplay Security" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (err) {
      console.error("❌ /getinvite error:", err);
      return interaction.reply({
        content: "❌ Could not create invites. Ensure the bot has permission and valid channels exist.",
        ephemeral: true
      });
    }
  }
};
