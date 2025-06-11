const mongoose = require('mongoose');

const shiftLogSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  guildId: { type: String, required: true },
  platform: { type: String, enum: ['Xbox', 'PlayStation'], required: true },
  department: { type: String, enum: ['Civilian', 'Public Safety', 'SA Fire Rescue'], required: true },
  shiftId: { type: String, required: true },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  totalTime: { type: Number } // in seconds
});

module.exports = mongoose.model('ShiftLog', shiftLogSchema);
