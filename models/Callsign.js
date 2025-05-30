const mongoose = require("mongoose");

const CallsignSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  department: { type: String, required: true },
  platform: { type: String, required: true }, // xbox or playstation
  number: { type: Number, required: true }
});

// ✅ This ensures uniqueness across department + platform + number
CallsignSchema.index({ department: 1, number: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model("Callsign", CallsignSchema);
