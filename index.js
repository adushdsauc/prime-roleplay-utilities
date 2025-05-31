// Full index.js with department selection, platform selection, readiness confirmation, question flow, and forum submission

require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Collection,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const fs = require("fs");
const mongoose = require("mongoose");
const postApplication = require("./utils/postApplication");
const AuthUser = require("./backend/models/authUser");
const Invite = require("./models/Invite");
const LOG_CHANNEL_ID = "1375641960651689984"; 
const createSecureInvite = require("./utils/createSecureInvite");
const { startApplication } = require("./applicationSessionHandler"); // place at top of index.js

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers // ✅ Required for guildMemberAdd
  ],
  partials: [Partials.Channel],
});

const guildMemberAddHandler = require("./events/guildMemberAdd");
client.on("guildMemberAdd", guildMemberAddHandler.execute);

client.commands = new Collection();
const sessions = new Map();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (command.data && command.data.name) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Skipped loading ${file}: Missing .data.name`);
  }
}

client.on("interactionCreate", async (interaction) => {
  try {
    
    // Updated to use embeds for all bot messages, including DMs
if (interaction.isButton() && interaction.customId.startsWith("accept_app_")) {
  const parts = interaction.customId.split("_");
  const userId = parts[2];
  const platform = parts[3];       // xbox or playstation
  const deptKey = parts[4];        // civilian, pso, safr

  console.log("🧪 Accept parsed:", { userId, platform, deptKey });

  const applicant = await client.users.fetch(userId).catch(() => null);
  if (!applicant) {
    return interaction.reply({ content: "❌ Could not find the user.", ephemeral: true });
  }

  const thread = interaction.channel?.isThread() ? interaction.channel : null;
  if (thread) {
    await thread.setAppliedTags(['1375025141347516487']); // ✅ Accepted
    console.log("✅ Tagged thread as Accepted");
  }

  const { EmbedBuilder } = require("discord.js");
  const loginEmbed = new EmbedBuilder()
    .setTitle("🎉 You've been accepted to Prime Roleplay!")
    .setDescription("Please log in with Discord to continue. Once verified, you'll receive your invite links.")
    .addFields({ name: "Login", value: `[Click here to verify](https://prime-roleplay-utilities-production.up.railway.app/auth/login)` })
    .setColor(0x2ecc71);

  try {
    await applicant.send({ embeds: [loginEmbed] });
  } catch {
    return interaction.reply({ content: "❌ Could not DM the user.", ephemeral: true });
  }

  const AcceptedUser = require('./models/AcceptedUser');
  const departmentMap = {
    civilian: "Civilian",
    pso: "PSO",
    safr: "SAFR"
  };
  const department = departmentMap[deptKey?.toLowerCase()] || "Civilian";

  try {
    await AcceptedUser.findOneAndUpdate(
      { discordId: userId },
      { discordId: userId, department },
      { upsert: true, new: true }
    );
    console.log(`✅ Saved accepted user ${userId} to database with department ${department}`);
  } catch (err) {
    console.error("❌ Failed to save accepted user:", err);
  }
  const guildId = interaction.guildId;
const guild = await client.guilds.fetch(guildId).catch(() => null);
const member = await guild?.members.fetch(userId).catch(() => null);

if (member) {
  const APPLIED_ROLE = "1368345426482167818";
  const ACCEPTED_ROLE = "1368345401815465985";

  try {
    await member.roles.remove(APPLIED_ROLE);
    await member.roles.add(ACCEPTED_ROLE);
    console.log(`✅ Updated roles for ${userId}`);
  } catch (err) {
    console.error(`❌ Failed to update roles for ${userId}:`, err);
  }
} else {
  console.warn(`⚠️ Could not find guild member ${userId}`);
}

  const confirmEmbed = new EmbedBuilder()
  .setTitle("✅ Application Accepted")
  .setDescription(`Application for <@${userId}> has been accepted.`)
  .addFields(
    { name: "Accepted By", value: `<@${interaction.user.id}>`, inline: true },
    { name: "Platform", value: platform.charAt(0).toUpperCase() + platform.slice(1), inline: true },
    { name: "Department", value: department, inline: true }
  )
  .setColor(0x3498db)
  .setFooter({ text: "Prime RP Utilities • Staff Action" })
  .setTimestamp();

await interaction.channel.send({ embeds: [confirmEmbed] });

  await interaction.update({
    content: `✅ <@${userId}> has been accepted. Awaiting OAuth verification...`,
    components: [],
  });

  const AuthUser = require("./backend/models/authUser");
  let attempts = 0;

  const interval = setInterval(async () => {
    const verified = await AuthUser.findOne({ discordId: userId });
    if (verified) {
      clearInterval(interval);

      const createSecureInvite = require("./utils/createSecureInvite");
      const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
      const invites = {};

      const economyInvite = await createSecureInvite({
        client,
        guildId: process.env.ECONOMY_SERVER_ID,
        userId,
        platform
      });
      if (economyInvite) invites.Economy = economyInvite;

      const platformGuildId = process.env[`${platform.toUpperCase()}_SERVER_ID`];
      const platformInvite = await createSecureInvite({
        client,
        guildId: platformGuildId,
        userId,
        platform
      });
      if (platformInvite) invites[platformLabel] = platformInvite;

      const inviteEmbed = new EmbedBuilder()
        .setTitle("✅ You’ve been verified!")
        .setDescription("Here are your one-time use invite links (valid for 24 hours):")
        .addFields(
          { name: `${platformLabel} Server`, value: invites[platformLabel] || "Invite failed." },
          { name: "Economy Server", value: invites.Economy || "Invite failed." }
        )
        .setColor(0x2ecc71);

      await applicant.send({ embeds: [inviteEmbed] });

      // ✅ Send verification log
      const logChannelId = "1368696606765088848"; // ⬅️ Replace this
      const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("✅ User Authenticated")
          .setDescription(`<@${userId}> (${applicant.tag}) has verified.`)
          .addFields(
            { name: "Platform", value: platformLabel, inline: true },
            { name: "Department", value: department, inline: true }
          )
          .setColor(0x2ecc71)
          .setFooter({ text: "Prime RP Assistant • OAuth Verified" })
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }

      return;
    }

    if (++attempts > 18) {
      clearInterval(interval);
      const timeoutEmbed = new EmbedBuilder()
        .setTitle("⚠️ Verification Timed Out")
        .setDescription("Your verification window expired. Please start over or contact staff.")
        .setColor(0xff0000);
      await applicant.send({ embeds: [timeoutEmbed] });
    }
  }, 10000);
}
      if (interaction.isButton() && interaction.customId.startsWith("deny_app_")) {
        const userId = interaction.customId.split("_")[2];
        const applicant = await client.users.fetch(userId).catch(() => null);
      
        await interaction.reply({
          content: "❌ Please reply with the denial reason (you have 2 minutes).",
          ephemeral: true,
        });
      
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 120000, max: 1 });
      
        collector.on("collect", async msg => {
          const reason = msg.content;
      
          // Edit the original thread message
          await interaction.message.edit({
            content: `❌ Application denied by <@${interaction.user.id}>.\n**Reason:** ${reason}`,
            components: [],
          });

          const thread = interaction.channel?.isThread() ? interaction.channel : null;

          if (thread) {
            await thread.setAppliedTags(['1375025167239086130']); // ❌ Denied
            console.log("✅ Tagged thread as Denied");
          } else {
            console.warn("❌ Could not find thread to tag (Deny)");
          }
             
      
          // DM the applicant
          if (applicant) {
            try {
              await applicant.send(`❌ Your application has been **denied**.\n**Reason:** ${reason}`);
            } catch {
              console.warn(`⚠️ Could not DM denied user ${userId}`);
            }
          }
      
          await msg.reply("✅ Denial recorded and user notified.");
        });
      
        collector.on("end", collected => {
          if (collected.size === 0) {
            interaction.followUp({ content: "⏳ No response received. Denial cancelled.", ephemeral: true });
          }
        });
      }
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "application_type") {
      const selected = interaction.values[0];
      await interaction.deferUpdate();

      const dm = await interaction.user.createDM();
      const platformRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`platform_select_${selected}`)
          .setPlaceholder("Select your console platform")
          .addOptions([
            { label: "Xbox", value: "xbox" },
            { label: "PlayStation", value: "playstation" }
          ])
      );

try {
  await dm.send("Here is your application form! Good luck!");
} catch (err) {
  if (err.code === 50007) {
    await interaction.reply({
      content: `You selected the **${selected.toUpperCase()}** application.\nPlease choose your platform to continue:`,
      components: [platformRow],
      ephemeral: true // ✅ This line was misaligned before
    });
  } else {
    console.error("Unexpected DM error:", err);
  }
}


    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("platform_select_")) {
      await interaction.deferUpdate();
      const department = interaction.customId.replace("platform_select_", "");
      const platform = interaction.values[0];

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`begin_app_yes_${department}_${platform}`)
          .setLabel("Yes, I'm ready")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("begin_app_no")
          .setLabel("No, not yet")
          .setStyle(ButtonStyle.Danger)
      );

      const { EmbedBuilder } = require("discord.js");

      const platformEmbed = new EmbedBuilder()
        .setTitle("<:checkmark:1378190549428994058> Platform Selected")
        .setDescription(`You selected **${platform.toUpperCase()}**.\n\nAre you ready to begin your **${department.toUpperCase()}** application?`)
        .setColor(0x111111);
      
      const confirmRowPlatform = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`begin_app_yes_${department}_${platform}`)
          .setLabel("Yes, I'm ready")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("begin_app_no")
          .setLabel("No, not yet")
          .setStyle(ButtonStyle.Danger)
      );
      
      await interaction.user.send({
        embeds: [platformEmbed],
        components: [confirmRowPlatform],
      });
      
    }

    const { startApplication, handleAnswer } = require("./applicationSessionHandler");

    if (interaction.isButton() && interaction.customId.startsWith("begin_app_yes_")) {
      await interaction.deferUpdate();
      const [, department, platform] = interaction.customId.split("_").slice(2);
    
      try {
        const { embed, row } = startApplication(interaction.user.id, department, platform);
        await interaction.user.send({ embeds: [embed], components: [row] });
      } catch (err) {
        console.error("❌ Failed to start application:", err);
        await interaction.user.send("❌ Something went wrong starting your application. Please contact staff.");
      }
    }
    
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("app_question_")) {
      try {
        await handleAnswer(interaction);
      } catch (err) {
        console.error("❌ Error handling answer:", err);
        await interaction.reply({ content: "❌ Failed to process your answer. Please try again.", ephemeral: true });
      }
    }
    
    if (interaction.isButton() && interaction.customId === "begin_app_no") {
      await interaction.deferUpdate();
      await interaction.user.send("❌ No problem! You can restart the application whenever you're ready.");
    }
    
  } catch (err) {
    console.error("❌ Interaction error:", err);
    if (!interaction.replied) {
      try {
        await interaction.reply({ content: "Something went wrong.", ephemeral: true });
      } catch (_) {}
    }
      
  }
});

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const forum = await client.channels.fetch('1374934648857034863');
  console.log("Available tags:", forum.availableTags);

  const channelId = process.env.APPLICATION_PANEL_CHANNEL_ID;
  const channel = await client.channels.fetch(channelId).catch(console.error);
  if (!channel?.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 10 });
  const alreadyPosted = messages.some(
    (msg) => msg.author.id === client.user.id && msg.embeds[0]?.title?.includes("Prime Roleplay Applications")
  );

  if (!alreadyPosted) {
    const dropdown = new StringSelectMenuBuilder()
      .setCustomId("application_type")
      .setPlaceholder("Select an application type...")
      .addOptions([
        { label: "Civilian Application", value: "civilian" },
        { label: "Public Safety Office Application", value: "pso" },
        { label: "San Andreas Fire Rescue Application", value: "safr" },
      ]);

    const row = new ActionRowBuilder().addComponents(dropdown);

    const embed = new EmbedBuilder()
    .setTitle("📋 Prime Roleplay Applications")
    .setDescription(
      "**Hello prospective members!**\n" +
      "> We’re excited to have you on board, and now it’s time for you to apply to get into our main server! This is your first step toward becoming a fully engaged member of the community and jumping into the action!\n\n" +
      "> For guidance, please head over to **#┃application-guidence**. Here, you’ll find everything you need to know about the application process.\n\n" +
      "📌 **A Few Tips Before You Start:**\n" +
      "1. **Read the Rules Carefully**\n" +
      "> Before submitting your application, make sure you've read through the server rules and guidelines.\n\n" +
      "2. **Take Your Time**\n" +
      "> Don’t rush your application! Fill it out thoughtfully, and give enough detail about your experience and RP goals.\n\n" +
      "3. **Be Honest and Authentic**\n" +
      "> If you're new to RP, that’s fine! Let us know how you plan to grow. Everyone starts somewhere, and we’re here to support you.\n\n" +
      "🕒 Once you’ve submitted your application, we’ll review it and get back to you within **6–36 hours**!\n\n" +
      "**If you have any questions, don’t hesitate to reach out here.**\n\n" +
      "**Good luck!**\nSincerely,\n**The Prime Network**"
    )
    .setColor(0x2ecc71);  

    await channel.send({ embeds: [embed], components: [row] });
    console.log("✅ Application panel posted.");
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

client.login(process.env.DISCORD_TOKEN);
module.exports = client;
