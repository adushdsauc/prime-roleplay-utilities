// ✅ Modified handleAnswer() to match the exact flow of your manual approval system
// File: applicationSessionHandler.js

const path = require("path");
const gradeApplication = require("./utils/gradeApplication");
const AuthUser = require("./backend/models/authUser");
const createSecureInvite = require("./utils/createSecureInvite");
const AcceptedUser = require("./models/AcceptedUser");
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");

const sessions = new Map();

function loadQuestions(department) {
  const filePath = path.join(__dirname, `./data/questions/${department}.js`);
  return require(filePath);
}

function startApplication(userId, department, platform) {
  const questions = loadQuestions(department);
  sessions.set(userId, {
    department,
    platform,
    currentIndex: 0,
    answers: [],
    questions
  });

  return buildQuestionMenu(userId);
}

function buildQuestionMenu(userId) {
  const session = sessions.get(userId);
  const currentQ = session.questions[session.currentIndex];

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`app_question_${userId}`)
      .setPlaceholder("Select your answer")
      .addOptions(
        currentQ.options.map((opt) => ({
          label: opt,
          value: opt
        }))
      )
  );

  const embed = new EmbedBuilder()
    .setTitle(`📋 Question ${session.currentIndex + 1}`)
    .setDescription(currentQ.question)
    .setColor(0x111111);

  return { embed, row };
}

async function handleAnswer(interaction) {
  const userId = interaction.user.id;
  const selected = interaction.values[0];
  const session = sessions.get(userId);

  session.answers.push(selected);
  session.currentIndex++;

  if (session.currentIndex >= session.questions.length) {
    const result = gradeApplication(session.answers, session.questions);
    const passed = result.passed;

    const reviewEmbed = new EmbedBuilder()
      .setTitle(passed ? "✅ Application Passed" : "❌ Application Failed")
      .setDescription(`Score: **${result.score}/10**\nPlatform: **${session.platform}**\nDepartment: **${session.department.toUpperCase()}**`)
      .setColor(passed ? 0x111111 : 0x111111);

    await interaction.update({ embeds: [reviewEmbed], components: [] });

    if (!passed) return sessions.delete(userId);

    // ✅ Save to AcceptedUser
    await AcceptedUser.findOneAndUpdate(
      { discordId: userId },
      { discordId: userId, department: session.department },
      { upsert: true, new: true }
    );

    // ✅ Prompt authentication link
    const loginEmbed = new EmbedBuilder()
      .setTitle("🎉 You Passed!")
      .setDescription("Please log in with Discord to verify and receive your invites.")
      .addFields({ name: "Login", value: `[Click here to verify](${process.env.OAUTH_LOGIN_URL})` })
      .setColor(030303);

    await interaction.user.send({ embeds: [loginEmbed] });

    // 🔄 Poll for verification
    let attempts = 0;
    const interval = setInterval(async () => {
      const verified = await AuthUser.findOne({ discordId: userId });
      if (verified) {
        clearInterval(interval);

        const platformLabel = session.platform.charAt(0).toUpperCase() + session.platform.slice(1);
        const invites = {};

        invites.Economy = await createSecureInvite({
          client: interaction.client,
          guildId: process.env.ECONOMY_SERVER_ID,
          userId,
          platform: session.platform
        });

        const platformGuildId = process.env[`${session.platform.toUpperCase()}_SERVER_ID`];
        invites[platformLabel] = await createSecureInvite({
          client: interaction.client,
          guildId: platformGuildId,
          userId,
          platform: session.platform
        });

        const inviteEmbed = new EmbedBuilder()
          .setTitle("✅ Verified & Ready!")
          .setDescription("Here are your one-time use invite links (valid for 24 hours):")
          .addFields(
            { name: `${platformLabel} Server`, value: invites[platformLabel] || "Invite failed." },
            { name: "Economy Server", value: invites.Economy || "Invite failed." }
          )
          .setColor(0x111111);

        await interaction.user.send({ embeds: [inviteEmbed] });
        sessions.delete(userId);
        return;
      }

      if (++attempts > 18) {
        clearInterval(interval);
        await interaction.user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("⚠️ Verification Timeout")
              .setDescription("Your session expired. Please restart the application process.")
              .setColor(0x111111)
          ]
        });
        sessions.delete(userId);
      }
    }, 10000);
  } else {
    const next = buildQuestionMenu(userId);
    await interaction.update({ embeds: [next.embed], components: [next.row] });
  }
}

module.exports = {
  startApplication,
  handleAnswer,
};
