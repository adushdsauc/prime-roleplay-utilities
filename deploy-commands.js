require('dotenv').config();
const registerCommands = require('./utils/registerCommands');

registerCommands().then(() => {
  console.log('✅ Command registration complete.');
  process.exit(0); // <-- This line is critical
}).catch((err) => {
  console.error('❌ Command registration failed:', err);
  process.exit(1); // Exit with failure if error occurs
});
