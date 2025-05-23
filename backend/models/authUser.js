const mongoose = require("mongoose");

const authUserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  username: String,
  accessToken: String,
  tokenType: String
});

module.exports = mongoose.model("AuthUser", authUserSchema);
