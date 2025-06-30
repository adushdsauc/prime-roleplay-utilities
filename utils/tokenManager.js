const axios = require('axios');
const { URLSearchParams } = require('url');
const AuthUser = require('../backend/models/authUser');

const DISCORD_API = 'https://discord.com/api';

async function getValidAccess(discordId) {
  const user = await AuthUser.findOne({ discordId });
  if (!user) return null;

  if (user.expiresAt && Date.now() < user.expiresAt - 60000) {
    return { tokenType: user.tokenType, accessToken: user.accessToken };
  }

  if (!user.refreshToken) return null;

  const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: user.refreshToken,
    redirect_uri: process.env.REDIRECT_URI
  });

  try {
    const res = await axios.post(`${DISCORD_API}/oauth2/token`, data.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token, expires_in, token_type } = res.data;
    user.accessToken = access_token;
    user.refreshToken = refresh_token;
    user.expiresAt = Date.now() + expires_in * 1000;
    user.tokenType = token_type;
    await user.save();

    return { tokenType: token_type, accessToken: access_token };
  } catch (err) {
    console.error('❌ Failed to refresh token:', err.response?.data || err.message);
    return null;
  }
}

module.exports = { getValidAccess };
