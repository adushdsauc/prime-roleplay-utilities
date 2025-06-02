const { Events, EmbedBuilder } = require("discord.js");
const AcceptedUser = require("../models/AcceptedUser");
const Invite = require("../models/Invite");
const Callsign = require("../models/Callsign");

const XBOX_GUILD_ID = "1372312806107512894";
const PLAYSTATION_GUILD_ID = "1369495333574545559";
const MASTER_LOG_CHANNEL_ID = "1379209193520627743";

const LOG_CHANNELS = {
  [XBOX_GUILD_ID]: "1372312809500835996",
  [PLAYSTATION_GUILD_ID]: "1371862183058608178",
};

const ROLE_IDS = {
  [XBOX_GUILD_ID]: {
    platform: "xbox",
    always: ["1372312806136877186"],
    Civilian: ["1372312806145392768", "1372312806220890245"],
    PSO: ["1372312806220890247", "1372312806204117013"],
    SAFR: ["1372312806166102076", "1372312806220890246"],
  },
  [PLAYSTATION_GUILD_ID]: {
    platform: "playstation",
    always: ["1369497153189187594"],
    Civilian: ["1370878408573063228", "1369497197489684650"],
    PSO: ["1369497170432229417", "1370878407856099408"],
    SAFR: ["1369520232426770453", "1370878410364162058"],
  },
};

const inviteCache = new Map();

async function generateCallsign(discordId, department, platform) {
  const ranges = {
    CIVILIAN: { start: 1250, end: 1750, prefix: "Civ" },
    PSO: { start: 1251, end: 2000, prefix: "C" },
    SAFR: { start: 1, end: 100, prefix: "FF-R" },
  };

  const key = department.toUpperCase();
  const range = ranges[key];
  if (!range) throw new Error(`Unknown department: ${department}`);

  const existing = await Callsign.find({ department: key, platform });
  const usedNumbers = new Set(existing.map(cs => parseInt(cs.number.toString().match(/\d+/)?.[0])));

  for (let number = range.start; number <= range.end; number++) {
    if (!usedNumbers.has(number)) {
      const fullCallsign = `${range.prefix}-${number}`;
      await Callsign.create({ discordId, department: key, number, platform });
      return fullCallsign;
    }
  }

  throw new Error("No available callsigns in range");
}

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    console.log("✅ guildMemberAdd fired for:", member.user.tag);

    if (!member || !member.user || !member.guild) {
      console.warn(`⚠️ Invalid GuildMember object`);
      return;
    }

    const guildId = member.guild.id;
    const config = ROLE_IDS[guildId];
    const platform = config?.platform;
    const logChannel = member.guild.channels.cache.get(LOG_CHANNELS[guildId]) || member.client.channels.cache.get(MASTER_LOG_CHANNEL_ID);

    if (!config || !platform) {
      const msg = `❌ No ROLE_IDS config or platform for guild: ${guildId}`;
      console.warn(msg);
      if (logChannel) logChannel.send(msg).catch(() => {});
      return;
    }

    const freshMember = await member.guild.members.fetch(member.id).catch(() => member);

    try {
      const cachedInvites = inviteCache.get(guildId);
      const currentInvites = await member.guild.invites.fetch();
      const usedInvite = [...currentInvites.values()].find(i => cachedInvites && cachedInvites.get(i.code) < i.uses);

      if (usedInvite) {
        const inviteData = await Invite.findOne({ code: usedInvite.code });
        if (inviteData?.userId !== member.id) {
          if (logChannel?.isTextBased()) {
            await logChannel.send({
              content: `<@${member.id}> was **kicked** for using an unauthorized invite.\nInvite code: \`${usedInvite.code}\`\nIntended for: <@${inviteData?.userId}>`,
            });
          }
          await member.send("🚫 This invite wasn’t meant for you. You’ve been removed from the server.").catch(() => {});
          await member.kick("Unauthorized invite use");
          return;
        } else {
          inviteData.used = true;
          await inviteData.save();
        }
      }
      inviteCache.set(guildId, new Map(currentInvites.map(i => [i.code, i.uses])));
    } catch (err) {
      const msg = `❌ Error in invite validation for ${member.user.tag}: ${err.message}`;
      console.error(msg);
      if (logChannel) logChannel.send(msg).catch(() => {});
    }

    let department = "Civilian";
    let callsign = "Pending";
    try {
      const accepted = await AcceptedUser.findOneAndUpdate(
        { discordId: member.id },
        { status: "joined", joinedAt: new Date() },
        { new: true }
      );

      if (accepted?.department) {
        department = accepted.department.charAt(0).toUpperCase() + accepted.department.slice(1).toLowerCase();
        callsign = await generateCallsign(member.id, department, platform);
      } else {
        const msg = `⚠️ No department found in AcceptedUser for ${member.user.tag}`;
        console.warn(msg);
        if (logChannel) logChannel.send(msg).catch(() => {});
      }
    } catch (err) {
      const msg = `❌ Error assigning department or generating callsign for ${member.user.tag}: ${err.message}`;
      console.error(msg);
      if (logChannel) logChannel.send(msg).catch(() => {});
    }

    try {
const departmentKey = department.toUpperCase();
const roleIds = [...(config.always || []), ...(config[departmentKey] || [])];
      const addedRoles = [];
      for (const roleId of roleIds) {
        let role = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          const msg = `⚠️ Role ID ${roleId} not found in guild cache for ${member.user.tag}`;
          console.warn(msg);
          if (logChannel) logChannel.send(msg).catch(() => {});
          continue;
        }

        try {
          await freshMember.roles.add(role);
          addedRoles.push(roleId);
        } catch (err) {
          const msg = `❌ Role assignment failed for ${member.user.tag} (Role ID: ${roleId}): ${err.message}`;
          console.warn(msg);
          if (logChannel) logChannel.send(msg).catch(() => {});

          await new Promise(res => setTimeout(res, 3000));
          await freshMember.roles.add(role).catch(retryErr => {
            const retryMsg = `❌ Retry failed for role ${roleId} on ${member.user.tag}: ${retryErr.message}`;
            console.warn(retryMsg);
            if (logChannel) logChannel.send(retryMsg).catch(() => {});
          });
        }
      }
      if (addedRoles.length === 0 && department && config[department]) {
        const retryRoles = [...(config.always || []), ...(config[department] || [])];
        await freshMember.roles.add(retryRoles).then(() => {
          const msg = `🔁 Fallback retry: successfully added department roles for ${member.user.tag}`;
          console.log(msg);
          if (logChannel) logChannel.send(msg).catch(() => {});
        }).catch(err => {
          const msg = `❌ Final retry failed to assign department roles for ${member.user.tag}: ${err.message}`;
          console.warn(msg);
          if (logChannel) logChannel.send(msg).catch(() => {});
        });
      } else {
        const msg = `✅ Successfully added roles [${addedRoles.join(", ")}] to ${member.user.tag}`;
        console.log(msg);
        if (logChannel) logChannel.send(msg).catch(() => {});
      }
    } catch (err) {
      const msg = `❌ Bulk role assignment error for ${member.user.tag}: ${err.message}`;
      console.warn(msg);
      if (logChannel) logChannel.send(msg).catch(() => {});
    }

    try {
      const nickname = `${callsign} | ${member.user.username}`;
      await freshMember.setNickname(nickname).catch(async (err) => {
        const msg = `❌ Failed to set nickname for ${member.user.tag}: ${err.message}`;
        console.warn(msg);
        if (logChannel) logChannel.send(msg).catch(() => {});
        await new Promise(res => setTimeout(res, 3000));
        await freshMember.setNickname(nickname).catch(() => {});
      });
    } catch (err) {
      const msg = `❌ Nickname setting exception for ${member.user.tag}: ${err.message}`;
      console.warn(msg);
      if (logChannel) logChannel.send(msg).catch(() => {});
    }

    try {
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("👤 New Member Joined")
          .addFields(
            { name: "User", value: `<@${member.id}> (${member.user.tag})`, inline: false },
            { name: "Department", value: department, inline: true },
            { name: "Callsign", value: callsign, inline: true }
          )
          .setColor(0x00b0f4)
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      const msg = `❌ Failed to log member join for ${member.user.tag}: ${err.message}`;
      console.warn(msg);
    }

    console.log(`✅ ${member.user.tag} joined ${department}, callsign ${callsign}`);
  },
};
