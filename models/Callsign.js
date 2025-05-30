// models/Callsign.js
const mongoose = require("mongoose");

const callsignSchema = new mongoose.Schema({
  discordId: { type: String, required: true },           // The user
  department: { type: String, required: true },          // PSO, SAFR, Civilian
  number: { type: Number, required: true },              // The actual callsign number (e.g., 751)
  platform: { type: String, required: true },            // xbox or playstation
}, { timestamps: true });

// Enforce uniqueness of callsign per department + platform
callsignSchema.index({ department: 1, number: 1, platform: 1 }, { unique: true });

// Allow one callsign per user per department per platform
callsignSchema.index({ discordId: 1, department: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model("Callsign", callsignSchema);
