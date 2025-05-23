require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 8080;

// Basic Middleware
app.use(express.json());
app.use(cors());
app.use(session({
  secret: "prime-session-secret",
  resave: false,
  saveUninitialized: true,
}));

// Routes
const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// Start Express Server
app.listen(PORT, () => {
  console.log(`🌐 Server + Bot live at http://localhost:${PORT}`);
});

// 🔁 Launch the bot
require("../index.js");
