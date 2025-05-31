// applicationSessionHandler.js
const gradeApplication = require("./utils/gradeApplication");
const path = require("path");
const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require("discord.js");

const sessions = new Map();

function loadQuestions(department) {
    const filePath = path.join(__dirname, "data", "questions", `${department}.js`);
    console.log("📦 Loading questions from:", filePath); // debug
    return require(filePath);
  }  

function startApplication(userId, department, platform) {
  const questions = loadQuestions(department);
  sessions.set(userId, {
    department,
    platform,
    currentIndex: 0,
    answers: [],
    questions,
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
          value: opt,
        }))
      )
  );

  const embed = new EmbedBuilder()
    .setTitle(`📋 Question ${session.currentIndex + 1}`)
    .setDescription(currentQ.question)
    .setColor(0x3498db);

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
    const embed = new EmbedBuilder()
      .setTitle(result.passed ? "✅ Application Passed" : "❌ Application Failed")
      .setDescription(`Score: **${result.score}/10**\nPlatform: **${session.platform}**\nDepartment: **${session.department.toUpperCase()}**`)
      .setColor(result.passed ? 0x2ecc71 : 0xe74c3c);

    await interaction.update({ embeds: [embed], components: [] });
    sessions.delete(userId);
  } else {
    const next = buildQuestionMenu(userId);
    await interaction.update({ embeds: [next.embed], components: [next.row] });
  }
}

module.exports = {
  startApplication,
  handleAnswer,
};
