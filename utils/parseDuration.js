module.exports = function parseDuration(str) {
  if (!str) return null;
  const match = /^([0-9]+)([smhd])$/i.exec(str.trim());
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (multipliers[unit] || 0);
};
