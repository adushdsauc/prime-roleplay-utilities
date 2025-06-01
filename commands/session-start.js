// commands/session-start.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");
const { DateTime } = require("luxon");

const ALLOWED_ROLE_IDS = ["1370176650234302484", "1372312806233215070"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("session-start")
    .setDescription("Start a Primary or Secondary session announcement.")
    .addStringOption(option =>
      option.setName("type")
        .setDescription("Primary or Secondary session")
        .setRequired(true)
        .addChoices(
          { name: "Primary", value: "Primary" },
          { name: "Secondary", value: "Secondary" }
        )
    )
    .addStringOption(option =>
      option.setName("gamertag")
        .setDescription("Enter your PSN or Xbox Gamertag")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("datetime")
        .setDescription("Date and time in format YYYY-MM-DD HH:mm (UTC)")
        .setRequired(true)
    ),

  async execute(interaction) {
    const memberRoles = interaction.member.roles.cache;
    const isAuthorized = ALLOWED_ROLE_IDS.some(roleId => memberRoles.has(roleId));
    if (!isAuthorized) {
      return interaction.reply({ content: "❌ You do not have permission to run this command.", ephemeral: true });
    }

    const type = interaction.options.getString("type");
    const gamertag = interaction.options.getString("gamertag");
    const datetimeInput = interaction.options.getString("datetime");

    const dt = DateTime.fromFormat(datetimeInput, "yyyy-MM-dd HH:mm", { zone: "utc" });
    if (!dt.isValid) {
      return interaction.reply({ content: "❌ Invalid date format. Use YYYY-MM-DD HH:mm", ephemeral: true });
    }

    const unix = Math.floor(dt.toSeconds());
    const host = interaction.user;

    const embed = new EmbedBuilder()
      .setColor(type === "Primary" ? 0x00b0f4 : 0xffa500)
      .setTitle(`📣 PRP ${type} Session Announcement`)
      .setDescription(`**${type} Session – Official Notice**\n• Host: ${host}\n• Gamertag: ${gamertag}\n• Scheduled Date & Time: <t:${unix}:F> | <t:${unix}:R>`)
      .addFields(
        { name: "✅ Attending", value: "–", inline: true },
        { name: "🕰️ Joining Late", value: "–", inline: true },
        { name: "❌ Can’t Attend", value: "–", inline: true }
      )
      .setFooter({ text: "Please respond using the buttons below." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("attending").setLabel("✅ Attending").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("late").setLabel("🕰️ Late").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("cant").setLabel("❌ Can’t Attend").setStyle(ButtonStyle.Danger)
    );

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const attendance = { attending: [], late: [], cant: [] };

    const collector = message.createMessageComponentCollector({ time: 86400000 }); // 24h

    collector.on("collect", async i => {
      if (!i.isButton()) return;

      const userMention = `<@${i.user.id}>`;
      const { customId } = i;

      // Remove user from all lists first
      for (const key of Object.keys(attendance)) {
        attendance[key] = attendance[key].filter(id => id !== userMention);
      }

      // Add to selected list
      attendance[customId].push(userMention);

      // Update embed fields
      embed.data.fields = [
        { name: "✅ Attending", value: attendance.attending.join("\n") || "–", inline: true },
        { name: "🕰️ Joining Late", value: attendance.late.join("\n") || "–", inline: true },
        { name: "❌ Can’t Attend", value: attendance.cant.join("\n") || "–", inline: true },
      ];

      await i.update({ embeds: [embed], components: [row] });
    });
  }
};
