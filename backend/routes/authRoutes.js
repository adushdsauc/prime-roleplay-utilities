const express = require("express");
const axios = require("axios");
const router = express.Router();
const { URLSearchParams } = require("url");
const AuthUser = require("../models/authUser");
const client = require("../../index.js"); // or the correct relative path to your bot file

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

// Step 1: Send user to Discord OAuth2
router.get("/login", (req, res) => {
  const isBypass = req.query.bypass === "true";

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI, // Must match exactly what's in Discord Dev Portal
    response_type: "code",
    scope: "identify guilds",
    state: isBypass ? "bypass" : "standard"
  });

  res.redirect(`${DISCORD_API}/oauth2/authorize?${params.toString()}`);
});

// Step 2: Handle Discord OAuth2 callback
router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const isBypass = req.query.state === "bypass";
  if (!code) return res.send("❌ Missing code.");

  try {
    // Exchange code for access token
    const data = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI
    });

    const tokenRes = await axios.post(`${DISCORD_API}/oauth2/token`, data.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const { access_token, refresh_token, expires_in, token_type } = tokenRes.data;

    // Get user info
    const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `${token_type} ${access_token}` }
    });

    const user = userRes.data;

    // Get user guilds
    const guildRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `${token_type} ${access_token}` }
    });

    // Filter for unauthorized RP guilds
   if (!isBypass) {
  const flagged = guildRes.data.filter(g =>
    g.name.toLowerCase().includes("roleplay") &&
    !ALLOWED_GUILDS.includes(g.id)
  );

  if (flagged.length > 0) {
    // ✅ ONLY log here, when actually blocked
    const failLogChannel = client.channels.cache.get(process.env.AUTH_FAIL_LOG_CHANNEL);
    if (failLogChannel) {
      const guildList = flagged
        .map(g => `• ${g.name || "Unknown Guild"} (${g.id})`)
        .join("\n");

      failLogChannel.send({
        embeds: [
          {
            title: "❌ OAuth Blocked: Unauthorized RP Servers",
            description: `User: <@${user.id}> (${user.username})\nFlagged Guilds:\n${guildList}`,
            color: 0xff0000,
            timestamp: new Date().toISOString()
          }
        ]
      }).catch(console.error);
      try {
        const flaggedUser = await client.users.fetch(user.id);
        await flaggedUser.send({
          embeds: [
            {
              title: "⚠️ Authorization Blocked",
              description:
                "We noticed you're part of another roleplay server that isn't approved by Prime Roleplay. Please open a ticket here: <#1368536515575156796> and provide a screenshot of your server list so we can assist you.",
              color: 0xffa500,
              timestamp: new Date().toISOString(),
              footer: {
                text: "Prime Roleplay Verification System"
              }
            }
          ]
        });
      } catch (err) {
        console.warn("⚠️ Could not DM flagged user:", err.message);
      }
      
    }

    return res.send("It has been detected that you are apart of another roleplay server. Before you proceed please create a support ticket in Prime Network HQ server and provide a picture of your server list. Our team will assist you as soon as possible!");
  }
}

    // Save to DB
    await AuthUser.findOneAndUpdate(
      { discordId: user.id },
      {
        discordId: user.id,
        username: user.username,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: Date.now() + expires_in * 1000,
        tokenType: token_type
      },
      { upsert: true }
    );
    
    const saved = await AuthUser.findOne({ discordId: user.id });
console.log("✅ AuthUser saved:", saved);


    return res.send(`
      <html>
        <head><title>Authentication Complete</title></head>
        <body style="font-family:sans-serif; text-align:center; padding:40px;">
          <h1 style="color:green;">✅ Authentication Complete</h1>
          <p>${isBypass
            ? "Staff will review your request shortly. You may now close this tab."
            : "You are now verified. You may now close this tab."}</p>
        </body>
      </html>
    `);

} catch (err) {
  console.error("OAuth error:", {
    message: err?.message,
    response: err?.response?.data,
    stack: err?.stack
  });

  return res.send("❌ An error occurred during authentication.");
}

});

module.exports = router;
