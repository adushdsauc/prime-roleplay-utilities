const mongoose = require('mongoose');

const prioritySchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  requestId: { type: String, required: true, unique: true },
  requesterId: { type: String, required: true },
  participants: [String],
  type: String,
  reason: String,
  estimatedDuration: Number,
  status: {
    type: String,
    enum: ['pending', 'approved', 'active', 'ended', 'denied', 'canceled'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now },
  approvedAt: Date,
  startedAt: Date,
  endedAt: Date
  ,
  cooldownEndsAt: Date
});

module.exports = mongoose.model('Priority', prioritySchema);
