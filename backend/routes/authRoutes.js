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
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds"
  });
  res.redirect(`${DISCORD_API}/oauth2/authorize?${params.toString()}`);
});

router.get("/callback", async (req, res) => {
  console.log("↩️ /auth/callback query =", req.query);
  const { code, error } = req.query;

  if (error) return res.send(`OAuth error: ${error}`);
  if (!code) return res.send("Missing code");

  try {
    const data = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI
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

    const flagged = guildRes.data.filter(g => {
      const name = g.name.toLowerCase();
      return name.includes("roleplay") && !ALLOWED_GUILDS.includes(g.id);
    });

    if (flagged.length > 0) {
      return res.send("❌ You are a member of other roleplay servers. Access denied.");
    }

await AuthUser.findOneAndUpdate(
  { discordId: user.id },
  {
    discordId: user.id,
    username: user.username,
    accessToken: access_token,      // ✅ Store for later use
    tokenType: token_type           // ✅ Store for later use
  },
  { upsert: true }
);


    // Final success screen
    res.send(`
      <html>
        <body style="font-family:sans-serif; text-align:center; padding:50px;">
          <h1>✅ Authentication Complete</h1>
          <p>You will be invited shortly. You may now close this tab.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("OAuth error:", err?.response?.data || err.message);
    res.send("An error occurred during authentication.");
  }
});

module.exports = router;
