const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

module.exports = async function registerCommands() {
  const commandsDir = path.join(__dirname, '..', 'commands');
  const commandFiles = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));

  const commandData = [];
  for (const file of commandFiles) {
    const cmdPath = path.join(commandsDir, file);
    const command = require(cmdPath);
    if (!command.data || !command.data.toJSON) {
      console.error(`❌ Skipping ${file}: .data or .toJSON() is missing or malformed.`);
      continue;
    }
    commandData.push({ name: command.data.name, json: command.data.toJSON() });
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  console.log('🔄 Refreshing application commands...');
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commandData.map(c => c.json) }
    );
    console.log(`✅ Registered ${commandData.length} commands:`);
    for (const c of commandData) {
      console.log(`   - ${c.name}`);
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
};
