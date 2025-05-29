// utils/postApplication.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = async function postApplication({ client, user, department, platform, answers, forumChannelId, staffRoleId }) {
  console.log("📬 Posting application...");

  const forum = await client.channels.fetch(forumChannelId).catch(err => {
    console.error("❌ Fetch error:", err);
  });

  console.log("Fetched channel type:", forum?.type); // Should log 15 for forum
  if (!forum || forum.type !== 15) return console.error("❌ Not a forum channel.");
  const title = `${user.username} - ${department.toUpperCase()} Application`;

  const fields = [
    { name: "Applicant", value: `<@${user.id}> (${user.tag})`, inline: true },
    { name: "Platform", value: platform.toUpperCase(), inline: true },
    { name: "Department", value: department.toUpperCase(), inline: true },
    { name: "\u200B", value: "\u200B" },
  ];

  answers.forEach((a, i) => {
    const question = (typeof a.q === "string" && a.q.trim()) || `Question ${i + 1}`;
    let answer = (typeof a.a === "string" && a.a.trim()) || "No response";

    if (answer.length > 1024) answer = answer.slice(0, 1021) + "...";

    fields.push({
      name: `Q${i + 1}: ${question}`,
      value: answer,
    });
  });  

  const embed = new EmbedBuilder()
    .setTitle(title)
    .addFields(fields)
    .setColor(0x2ecc71)
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`accept_app_${user.id}_${platform}_${department}`)
      .setLabel("✅ Accept")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`deny_app_${user.id}`)
      .setLabel("❌ Deny")
      .setStyle(ButtonStyle.Danger)
  );

  const thread = await forum.threads.create({
    name: title,
    appliedTags: ['1375025290362753074'], // 🆕 New Application
    message: {
      content: `<@&${1375605232226140300}> New application received.`,
      embeds: [embed],
      components: [buttons],
    },
    reason: `New ${department} application from ${user.tag}`,
  });

  return thread;
};
