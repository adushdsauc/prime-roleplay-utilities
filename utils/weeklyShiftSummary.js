// weeklyShiftSummary.js
const { EmbedBuilder } = require('discord.js');
const ShiftLog = require('../models/ShiftLog');
const schedule = require('node-schedule');

const XBOX_CHANNEL_ID = '1376607799622238469';
const PS_CHANNEL_ID = '1376607873945174119';

const PLATFORMS = {
  '1372312806107512894': { name: 'Xbox', channelId: XBOX_CHANNEL_ID },
  '1369495333574545559': { name: 'PlayStation', channelId: PS_CHANNEL_ID }
};

const DEPARTMENTS = ['Civilian', 'Public Safety', 'SA Fire Rescue'];

const formatDuration = (seconds) => {
  const minutes = Math.ceil(seconds / 60);
  const hrs = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `${hrs}h ${min}m`;
};


const buildPaginatedEmbeds = (department, entries) => {
  const pages = [];
  const maxFieldsPerPage = 9; // 3 fields per user row
  let currentPage = new EmbedBuilder()
    .setTitle(`${department} Shift Summary`)
    .setColor(0x2B2D31);

  let count = 0;
  for (const [index, entry] of entries.entries()) {
    currentPage.addFields(
      { name: 'User', value: `<@${entry.discordId}>`, inline: true },
      { name: 'Time', value: entry.totalTime, inline: true },
      { name: 'Shifts', value: `${entry.shiftCount}`, inline: true }
    );

    count += 3;
    if (count >= maxFieldsPerPage || index === entries.length - 1) {
      pages.push(currentPage);
      currentPage = new EmbedBuilder()
        .setTitle(`${department} Shift Summary (cont.)`)
        .setColor(0x2B2D31);
      count = 0;
    }
  }
  return pages;
};

const summarizeShifts = async (client) => {
  for (const platformKey in PLATFORMS) {
    const { name: platform, channelId } = PLATFORMS[platformKey];
    let channel;
    try {
      channel = await client.channels.fetch(channelId);
    } catch (err) {
      console.error(`❌ Failed to fetch summary channel for ${platform}:`, err);
      continue;
    }

    for (const department of DEPARTMENTS) {
      const logs = await ShiftLog.find({ platform, department });

      const summaryMap = new Map();

      for (const log of logs) {
        if (!summaryMap.has(log.discordId)) {
          summaryMap.set(log.discordId, { totalTime: 0, shiftCount: 0 });
        }
        const entry = summaryMap.get(log.discordId);
        entry.totalTime += log.totalTime;
        entry.shiftCount += 1;
      }

      const summaryArray = await Promise.all(
        Array.from(summaryMap.entries()).map(async ([discordId, data]) => {
          const user = await client.users.fetch(discordId).catch(() => null);
          return {
            discordId,
            userTag: user ? user.tag : `Unknown (${discordId})`,
            totalTime: formatDuration(data.totalTime),
            shiftCount: data.shiftCount
          };
        })
      );

      if (summaryArray.length === 0) continue;

      const embeds = buildPaginatedEmbeds(department, summaryArray);
      for (const embed of embeds) {
        await channel.send({ embeds: [embed] });
      }

      // ✅ Delete the logs for this department and platform after sending
      await ShiftLog.deleteMany({ platform, department });
    }
  }
};

// Schedule for every Sunday at 11:59 PM EST
schedule.scheduleJob({ hour: 23, minute: 59, dayOfWeek: 0, tz: 'America/New_York' }, async () => {
  const client = globalThis.discordClient;
  if (client) await summarizeShifts(client);
});

module.exports = summarizeShifts;
