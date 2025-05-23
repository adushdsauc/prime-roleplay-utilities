const mongoose = require("mongoose");

const authUserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
  accessToken: String,
  tokenType: String,
});

module.exports = mongoose.model("AuthUser", authUserSchema);
