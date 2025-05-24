// models/Callsign.js
const mongoose = require("mongoose");

const callsignSchema = new mongoose.Schema({
  department: { type: String, required: true }, // Civilian, PSO, SAFR
  number: { type: Number, required: true },
  discordId: { type: String, required: true },
}, { timestamps: true });

callsignSchema.index({ department: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("Callsign", callsignSchema);
