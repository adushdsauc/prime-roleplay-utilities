const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { DateTime } = require("luxon");

// Allowed roles that can run the command
const ALLOWED_ROLE_IDS = ["1370176650234302484", "1372312806233215070"];

// Guild IDs
const XBOX_GUILD_ID = "1372312806107512894";
const PLAYSTATION_GUILD_ID = "1369495333574545559";

// Session ping role IDs per guild
const SESSION_PING_ROLE_IDS = {
  [XBOX_GUILD_ID]: "1372312806120231032",        
  [PLAYSTATION_GUILD_ID]: "1370181571189145672"   
};

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
    const guildId = interaction.guildId;

    const label = guildId === PLAYSTATION_GUILD_ID ? "**PSN:**" : "**Xbox Gamertag:**";
    const pingRoleId = SESSION_PING_ROLE_IDS[guildId];
    const pingContent = pingRoleId ? `<@&${pingRoleId}>` : null;

    const embed = new EmbedBuilder()
      .setColor(type === "Primary" ? 0x0099ff : 0xffa500)
      .setTitle("Prime Roleplay™ " + (guildId === PLAYSTATION_GUILD_ID ? "PlayStation" : "Xbox") + " | Roleplay Session")
      .setDescription(`**Roleplay Session**\n> This message upholds all information regarding the upcoming roleplay session hosted by **Prime Roleplay**.\n> Please take your time to review the details below and if any questions arise, please ask the host.\n\n${label} ${gamertag}`)
      .addFields(
        {
          name: "———————————————\nCommencement Process",
          value:
            "> At the below time invites will begin being disputed. You will then be directed to your proper briefing channels.\n> We ask that you’re to ensure you are connected to the **Session Queue** voice channel.",
        },
        {
          name: "———————————————\nSession Orientation 🗣️",
          value:
            "> Before the session must begin, all individuals must be orientated accordingly.\n> The orientation will happen after the invites are dispersed and you will be briefed by the **highest-ranking official** in terms of your **department**.",
        },
        {
          name: "———————————————\nSession Details",
          value:
            `> **Start Time:** <t:${unix}:F> (<t:${unix}:R>)\n> • **Session Type:** ${type} | Scenario Based\n> • **Area of Play:** *To Be Announced*\n> • [Prime Roleplay Booklet](https://example.com) • [Map](https://example.com) • [Timezones](https://example.com)`,
        },
        {
          name: "✅ Attending (0/24)", value: "–", inline: true
        },
        {
          name: "❌ Not Attending (0)", value: "–", inline: true
        },
        {
          name: "🕰️ Late (0)", value: "–", inline: true
        }
      )
      .setFooter({ text: "Host: " + interaction.user.tag + " | Respond with the buttons below." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("attending").setLabel("✅ Attending").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("cant").setLabel("❌ Not Attending").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("late").setLabel("🕰️ Late").setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.reply({
      content: pingContent,
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    const attendance = { attending: [], cant: [], late: [] };

    const collector = message.createMessageComponentCollector({ time: 86400000 }); // 24h

    collector.on("collect", async i => {
      if (!i.isButton()) return;

      const mention = `<@${i.user.id}>`;
      for (const key in attendance) {
        attendance[key] = attendance[key].filter(id => id !== mention);
      }

      attendance[i.customId].push(mention);

      embed.spliceFields(3, 3,
        {
          name: `✅ Attending (${attendance.attending.length}/24)`,
          value: attendance.attending.join("\n") || "–",
          inline: true
        },
        {
          name: `❌ Not Attending (${attendance.cant.length})`,
          value: attendance.cant.join("\n") || "–",
          inline: true
        },
        {
          name: `🕰️ Late (${attendance.late.length})`,
          value: attendance.late.join("\n") || "–",
          inline: true
        }
      );

      await i.update({ embeds: [embed], components: [row] });
    });
  }
};
