const mongoose = require("mongoose");
const AuthUserSchema = new mongoose.Schema({
  discordId: String,
  username: String,
});
module.exports = mongoose.model("AuthUser", AuthUserSchema);
