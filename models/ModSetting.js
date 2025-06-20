const mongoose = require('mongoose');

const modSettingSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  modLogChannelId: { type: String, required: true }
});

module.exports = mongoose.model('ModSetting', modSettingSchema);
