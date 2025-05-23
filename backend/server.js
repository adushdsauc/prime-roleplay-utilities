require("dotenv").config({ path: "../.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.get("/", (req, res) => res.send("Auth server is running"));
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));
