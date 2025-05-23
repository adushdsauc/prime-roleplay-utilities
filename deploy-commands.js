require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");

const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  if (!command.data || !command.data.toJSON) {
    console.error(`❌ Skipping ${file}: .data or .toJSON() is missing or malformed.`);
    continue;
  }
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("🔄 Refreshing application commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Commands successfully registered.");
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();
