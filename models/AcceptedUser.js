const mongoose = require('mongoose');

const acceptedUserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  department: { type: String, required: true }, // e.g., 'PSO', 'SAFR'
}, { timestamps: true });

module.exports = mongoose.model('AcceptedUser', acceptedUserSchema);
