const Callsign = require("../models/Callsign");

const ROLE_IDS = {
  '1372312806107512894': {
    platform: 'xbox',
    always: ['1372312806136877186'],
    CIVILIAN: ['1372312806145392768', '1372312806220890245'],
    PSO: ['1372312806220890247', '1372312806204117013'],
    SAFR: ['1372312806166102076', '1372312806220890246'],
  },
  '1369495333574545559': {
    platform: 'playstation',
    always: ['1369497153189187594'],
    CIVILIAN: ['1370878408573063228', '1369497197489684650'],
    PSO: ['1369497170432229417', '1370878407856099408'],
    SAFR: ['1369520232426770453', '1370878410364162058'],
  },
};

const CALLSIGN_RANGES = {
  CIVILIAN: { start: 1250, end: 1750, prefix: 'Civ' },
  PSO: { start: 1251, end: 2000, prefix: 'C' },
  SAFR: { start: 1, end: 100, prefix: 'FF-R' },
};

async function generateCallsign(discordId, department, platform) {
  const range = CALLSIGN_RANGES[department.toUpperCase()];
  if (!range) throw new Error(`Unknown department: ${department}`);

  const existing = await Callsign.find({ department: department.toUpperCase(), platform });
  const usedNumbers = new Set(existing.map(cs => cs.number));

  for (let number = range.start; number <= range.end; number++) {
    if (!usedNumbers.has(number)) {
      await Callsign.create({ discordId, department: department.toUpperCase(), number, platform });
      return `${range.prefix}-${number}`;
    }
  }
  throw new Error('No available callsigns in range');
}

async function assignDepartment(member, department) {
  const guildId = member.guild.id;
  const config = ROLE_IDS[guildId];
  if (!config) throw new Error('No role configuration for this guild');

  const platform = config.platform;
  const callsign = await generateCallsign(member.id, department, platform);

  const roleIds = [...(config.always || []), ...(config[department] || [])];
  for (const roleId of roleIds) {
    const role = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);
    if (role) {
      try {
        await member.roles.add(role);
      } catch (err) {
        console.warn(`Failed to assign role ${roleId} to ${member.user.tag}:`, err.message);
      }
    }
  }

  const nickname = `${callsign} | ${member.user.username}`.slice(0, 32);
  await member.setNickname(nickname).catch(() => {});

  return callsign;
}

module.exports = { assignDepartment };
