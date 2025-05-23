// backend/routes/authRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const { URLSearchParams } = require("url");
const AuthUser = require("../models/authUser");

const DISCORD_API = "https://discord.com/api";
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;
const ALLOWED_GUILDS = [
    "1372312806107512894",
    "1369495333574545559",
    "1369029438351867964",
    "945681941213089814",
    "795657260726091838",
    "229240178441584645",
    "1369545344529993768",
    "1368615880359153735"
  ];


router.get("/login", (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds",
  });
  return res.redirect(`${DISCORD_API}/oauth2/authorize?${params.toString()}`);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("Missing code");

  try {
    const data = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      scope: "identify guilds",
    });

    const tokenRes = await axios.post(`${DISCORD_API}/oauth2/token`, data.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, token_type } = tokenRes.data;

    const [userRes, guildRes] = await Promise.all([
      axios.get(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `${token_type} ${access_token}` },
      }),
      axios.get(`${DISCORD_API}/users/@me/guilds`, {
        headers: { Authorization: `${token_type} ${access_token}` },
      })
    ]);

    const user = userRes.data;
    const userGuilds = guildRes.data.map(g => g.id);
    console.log("🔍 User is in these guilds:", userGuilds);
    const allowedIds = new Set(ALLOWED_GUILDS);
    const flagged = [];
    
    for (const guild of guildRes.data) {
      const name = guild.name.toLowerCase();
      const isRP = name.includes("roleplay");
      const isAllowed = allowedIds.has(guild.id);
    
      if (isRP && !isAllowed) {
        flagged.push({ id: guild.id, name: guild.name });
      }
    }
    
    if (flagged.length > 0) {
      console.log("❌ Blocked for being in other RP servers:", flagged);
      return res.send("❌ You are a member of other roleplay servers. Access denied.");
    }

    await AuthUser.findOneAndUpdate(
      { discordId: user.id },
      { discordId: user.id, username: user.username },
      { upsert: true }
    );

res.send(`
  <html>
    <head><title>Auth Complete</title></head>
    <body style="font-family:sans-serif; text-align:center; padding:50px;">
      <h1>✅ Authentication Complete</h1>
      <p>You will be invited to Prime Roleplay shortly.</p>
      <p>You can now close this window.</p>
    </body>
  </html>
`);
  } catch (err) {
    console.error("OAuth error:", err);
    res.send("An error occurred during authentication.");
  }
});

module.exports = router;
