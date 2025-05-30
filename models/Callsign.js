// models/Callsign.js
const mongoose = require("mongoose");

const callsignSchema = new mongoose.Schema({
  department: { type: String, required: true },
  number: { type: Number, required: true },
  discordId: { type: String, required: true },
  platform: { type: String, required: true }, // <-- Add this
}, { timestamps: true });

callsignSchema.index({ department: 1, number: 1 }, { unique: true });
callsignSchema.index({ discordId: 1, department: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model("Callsign", callsignSchema);
