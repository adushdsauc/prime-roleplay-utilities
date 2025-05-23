const express = require("express");
const axios = require("axios");
const router = express.Router();
const { URLSearchParams } = require("url");
const AuthUser = require("../models/authUser");

const DISCORD_API = "https://discord.com/api";
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

// Replace with your allowed guild IDs
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
  redirect_uri: REDIRECT_URI + (req.query.bypass ? "?bypass=true" : ""),
  response_type: "code",
  scope: "identify guilds"
});
  res.redirect(`${DISCORD_API}/oauth2/authorize?${params.toString()}`);
});

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const isBypass = req.query.bypass === "true";
  if (!code) return res.send("Missing code");

  try {
    // Exchange code for access token
    const tokenData = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI + (isBypass ? "?bypass=true" : "")
    });

    const tokenRes = await axios.post(`${DISCORD_API}/oauth2/token`, tokenData.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, token_type } = tokenRes.data;

    // Get user info
    const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `${token_type} ${access_token}` },
    });

    const user = userRes.data;

    // Get guilds
    const guildRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `${token_type} ${access_token}` },
    });

    // Block users in unauthorized RP servers, unless it's a bypass
    if (!isBypass) {
      const flagged = guildRes.data.filter(g =>
        g.name.toLowerCase().includes("roleplay") &&
        !ALLOWED_GUILDS.includes(g.id)
      );

      if (flagged.length > 0) {
        return res.send("❌ You are a member of other roleplay servers. Access denied.");
      }
    }

    // Save or update auth data
    await AuthUser.findOneAndUpdate(
      { discordId: user.id },
      {
        discordId: user.id,
        username: user.username,
        accessToken: access_token,
        tokenType: token_type,
      },
      { upsert: true }
    );

    return res.send(`
      <html>
        <body style="font-family:sans-serif; text-align:center; padding:50px;">
          <h1>✅ Authentication Complete</h1>
          <p>${isBypass ? "Staff will review your request shortly." : "You are now verified."}</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error("OAuth error:", err?.response?.data || err.message);
    return res.send("❌ An error occurred during authentication.");
  }
});

module.exports = router;
