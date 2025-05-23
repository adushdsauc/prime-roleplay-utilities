const mongoose = require("mongoose");

const inviteSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  platform: { type: String },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: '1d' } // auto-delete after 24 hours
});

module.exports = mongoose.model("Invite", inviteSchema);
