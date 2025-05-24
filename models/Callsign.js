// models/Callsign.js
const mongoose = require("mongoose");

const callsignSchema = new mongoose.Schema({
  department: { type: String, required: true }, // Civilian, PSO, SAFR
  number: { type: Number, required: true },
  discordId: { type: String, required: true },
}, { timestamps: true });

callsignSchema.index({ department: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("Callsign", callsignSchema);

// utils/generateCallsign.js
const Callsign = require("../models/Callsign");

const RANGES = {
  Civilian: { start: 1250, end: 9999, prefix: "Civ-" },
  PSO: { start: 1251, end: 2000, prefix: "C-" },
  SAFR: { start: 1, end: 100, prefix: "FF-R" }
};

module.exports = async function generateCallsign(discordId, department) {
  const range = RANGES[department];
  if (!range) throw new Error("Invalid department for callsign generation");

  for (let i = range.start; i <= range.end; i++) {
    const exists = await Callsign.findOne({ department, number: i });
    if (!exists) {
      await Callsign.create({ department, number: i, discordId });
      return `${range.prefix}${i}`;
    }
  }

  throw new Error(`No available callsigns left for ${department}`);
};
