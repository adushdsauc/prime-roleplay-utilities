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
const LOG_CHANNEL_ID = "1369094726124572712"; // ⬅️ Replace this
const createSecureInvite = require("./utils/createSecureInvite");

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

const QUESTIONS = {
  civilian: [
    "Age?",
    "Date of Birth (DOB)?",
    "What does 'Out of Character' (OOC) mean? Explain and give one example.",
    "What is 'Fail RP'? Describe and provide one example.",
    "Your character witnesses a serious car crash. What do they do?",
    "You receive an anonymous note saying you’re being watched. What’s your next move?",
    "How can civilians realistically make money in RP?",
    "You're pulled over for speeding, but you weren’t actually speeding. How does your character respond?",
    "The police accuse you of obstruction for staying silent. Do you talk or lawyer up?",
    "You crash into another civilian’s car. What do you do next?",
    "What’s metagaming in RP? Define it and give an example.",
    "You’re in the middle of a scene and suddenly get into an argument OOC. What should you do?",
    "What is a CAD/MDT system? Briefly explain its purpose in roleplay."
  ],
  pso: [
    "Age:",
    "Date of Birth (DOB):",
    "What is a CAD/MDT system? (Explain what it is and how it’s used in roleplay)",
    "While patrolling, you witness a car crash. What steps do you take to handle the situation?",
    "You arrive at the scene of a shots fired call. How do you respond?",
    "Name three commonly used 10 codes in police communication.",
    "During a traffic stop, the civilian suddenly drives away. What is your immediate action?",
    "You are pursuing a suspect who has kidnapped an officer and is holding them at gunpoint. The suspect tells you to back off. What do you do?",
    "Under what circumstances is it appropriate to use a firearm instead of a taser?",
    "What should you do before placing someone into custody?",
    "Explain the meanings of Code 1, Code 2, and Code 3 in relation to police response during calls.",
    "If a suspect flees on foot, what is the proper procedure to follow?",
    "How should you handle a situation where multiple civilians are yelling and refusing to comply with commands?"
  ],
  safr: [
    "Age:",
    "DOB:",
    "What is a CAD/MDT System?",
    "What is your first priority when arriving at a medical emergency?",
    "How do you check if a patient is breathing properly?",
    "When should you call for additional backup or resources?",
    "What steps do you take to control severe bleeding?",
    "How do you safely move a patient with a suspected spinal injury?",
    "What are the signs of a stroke you should look for during an emergency?",
    "If a civilian is in a lot of pain, what drug do you give them?",
    "How do you manage a burn victim at the scene?",
    "How do you help a trapped victim in a car after a crash?",
    "What steps do you take to prevent contamination when treating an open wound?"
  ]
};

client.on("interactionCreate", async (interaction) => {
  try {
    
    // Updated to use embeds for all bot messages, including DMs
    if (interaction.isButton() && interaction.customId.startsWith("accept_app_")) {
      const parts = interaction.customId.split("_");
      const userId = parts[2];
      const platform = parts[3];
    
      console.log("🧪 Accept parsed:", { userId, platform });
    
      const applicant = await client.users.fetch(userId).catch(() => null);
      if (!applicant) {
        return interaction.reply({ content: "❌ Could not find the user.", ephemeral: true });
      }
    
      console.log("🧪 Thread info:", {
        isDefined: Boolean(interaction.message.thread),
        threadId: interaction.message.thread?.id,
        messageId: interaction.message.id,
        content: interaction.message.content
      });
    
      const thread = interaction.channel?.isThread() ? interaction.channel : null;
    
      if (thread) {
        await thread.setAppliedTags(['1375025141347516487']); // ✅ Accepted
        console.log("✅ Tagged thread as Accepted");
      } else {
        console.warn("❌ Could not find thread to tag (Accept)");
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
    
      // ✅ Save accepted user to database
      const AcceptedUser = require('./models/AcceptedUser');
      try {
        await AcceptedUser.findOneAndUpdate(
          { discordId: userId },
          { discordId: userId, department: platform },
          { upsert: true, new: true }
        );
        console.log(`✅ Saved accepted user ${userId} to database.`);
      } catch (err) {
        console.error("❌ Failed to save accepted user:", err);
      }
    
      await interaction.update({
        content: `✅ <@${userId}> has been accepted. Awaiting OAuth verification...`,
        components: [],
      });
    
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
              { name: `Economy Server`, value: invites.Economy || "Invite failed." }
            )
            .setColor(0x2ecc71);
    
          await applicant.send({ embeds: [inviteEmbed] });
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

      await dm.send({
        content: `You selected the **${selected.toUpperCase()}** application.\nPlease choose your platform to continue:`,
        components: [platformRow],
      });
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
        .setTitle("✅ Platform Selected")
        .setDescription(`You selected **${platform.toUpperCase()}**.\n\nAre you ready to begin your **${department.toUpperCase()}** application?`)
        .setColor(0x2ecc71);
      
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

    if (interaction.isButton() && interaction.customId.startsWith("begin_app_yes_")) {
      await interaction.deferUpdate();
      const [, department, platform] = interaction.customId.split("_").slice(2);

      sessions.set(interaction.user.id, {
        department,
        platform,
        current: 0,
        answers: [],
      });

      const question = QUESTIONS[department][0];
      const questionEmbed = new EmbedBuilder()
      .setTitle(`📝 Question 1`)
      .setDescription(question)
      .setColor(0x3498db);
    
    await interaction.user.send({ embeds: [questionEmbed] });
    
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

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.channel.type !== 1) return;

  const session = sessions.get(message.author.id);
  if (!session) return;

  const question = QUESTIONS[session.department][session.current];
  session.answers.push({ q: question, a: message.content });
  session.current++;

  const nextQuestion = QUESTIONS[session.department][session.current];
  if (nextQuestion) {
    const questionEmbed = new EmbedBuilder()
      .setTitle(`📝 Question ${session.current + 1}`)
      .setDescription(nextQuestion)
      .setColor(0x3498db);
    await message.channel.send({ embeds: [questionEmbed] });
  } else {
    const completeEmbed = new EmbedBuilder()
      .setTitle("✅ Application Submitted")
      .setDescription("Thank you for applying! Your responses have been submitted for review.")
      .setColor(0x2ecc71);
    await message.channel.send({ embeds: [completeEmbed] });
  
    await postApplication({
      client,
      user: message.author,
      department: session.department,
      platform: session.platform,
      answers: session.answers,
      forumChannelId: process.env.APPLICATION_FORUM_CHANNEL_ID,
      staffRoleId: "1368345392516698222"
    });
  
    sessions.delete(message.author.id);
    
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
