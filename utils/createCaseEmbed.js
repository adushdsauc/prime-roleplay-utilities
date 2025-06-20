const { EmbedBuilder } = require('discord.js');

module.exports = function createCaseEmbed({ guild, moderator, action, reason, caseId, color = 0x3498db }) {
  return new EmbedBuilder()
    .setColor(color)
    .addFields(
      { name: 'Server', value: guild.name, inline: false },
      { name: 'Actioned by', value: moderator.tag ? `${moderator.tag}` : `<@${moderator.id}>`, inline: false },
      { name: 'Action', value: action, inline: false },
      { name: 'Reason', value: reason, inline: false }
    )
    .setFooter({ text: `Case #${caseId}` })
    .setTimestamp();
};
