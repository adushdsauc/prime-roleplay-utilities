const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("auth")
    .setDescription("Authenticate or reauthenticate through the bot (OAuth)"),

  async execute(interaction) {
    const loginUrl = `https://prime-roleplay-utilities-production.up.railway.app/auth/login`;

    try {
      await interaction.user.send({
        content: `🔐 Click the link below to authenticate:\n${loginUrl}`
      });

      await interaction.reply({
        content: "✅ I’ve sent you a DM with the authentication link.",
        ephemeral: true
      });
    } catch (err) {
      console.error("❌ Failed to send DM:", err.message);
      await interaction.reply({
        content: `🔗 Here’s your authentication link:\n${loginUrl}`,
        ephemeral: true
      });
    }
  }
};
