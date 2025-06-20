const mongoose = require('mongoose');

const modCaseSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  action: { type: String, required: true },
  reason: { type: String },
  duration: { type: Number },
  caseId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ModCase', modCaseSchema);
