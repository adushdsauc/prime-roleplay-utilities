// commands/callsign-manually-add.js
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
  } = require("discord.js");
  const Callsign = require("../models/Callsign");
  
  const XBOX_GUILD_ID = "1372312806107512894";
  const PLAYSTATION_GUILD_ID = "1369495333574545559";
  
  const LOWEST_RANK_MAPPINGS = {
    PSO: {
      range: "C-1251 - C-2000",
      xbox: ["1372312806204117013", "1372312806220890247"],
      playstation: ["1369497170432229417", "1370878407856099408"],
    },
    SAFR: {
      range: "FF-R1 - FF-R100",
      xbox: ["1372312806166102076", "1372312806220890246"],
      playstation: ["1369520232426770453", "1370878410364162058"],
    },
    Civilian: {
      range: "1250 - 1750",
      xbox: ["1372312806145392768", "1372312806220890245"],
      playstation: ["1369497197489684650", "1370878408573063228"],
    },
  };
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName("callsign-manually-add")
      .setDescription("Manually assign a callsign and lowest role to a user")
      .addUserOption(option =>
        option.setName("user").setDescription("User to assign").setRequired(true)
      )
      .addStringOption(option =>
        option.setName("department")
          .setDescription("Department")
          .setRequired(true)
          .addChoices(
            { name: "PSO", value: "PSO" },
            { name: "SAFR", value: "SAFR" },
            { name: "Civilian", value: "Civilian" }
          )
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
  
      const user = interaction.options.getUser("user");
      const department = interaction.options.getString("department");
      const guild = interaction.guild;
      const member = await guild.members.fetch(user.id).catch(() => null);
  
      const platform =
        guild.id === XBOX_GUILD_ID ? "xbox" :
        guild.id === PLAYSTATION_GUILD_ID ? "playstation" : null;
  
      if (!platform || !member) {
        return interaction.editReply({ content: "❌ Could not determine platform or member not found." });
      }
  
      const config = LOWEST_RANK_MAPPINGS[department];
      const [startStr, endStr] = config.range.match(/\d+/g);
      const start = parseInt(startStr);
      const end = parseInt(endStr);
      const prefix = config.range.match(/[A-Za-z\-]+/g)?.[0]?.trim() || "";
  
      const usedNumbers = new Set(
        (await Callsign.find({ department })).map(c => c.number)
      );
  
      let assignedNumber = null;
      for (let i = start; i <= end; i++) {
        if (!usedNumbers.has(i)) {
          assignedNumber = i;
          break;
        }
      }
  
      if (!assignedNumber) {
        return interaction.editReply({ content: `❌ No available callsigns left for ${department}.` });
      }
  
      await Callsign.create({
        department,
        number: assignedNumber,
        discordId: user.id
      });
  
      for (const roleId of config[platform]) {
        await member.roles.add(roleId).catch(() => {});
      }
  
      const newNickname = `${prefix}${assignedNumber} | ${user.username}`.slice(0, 32);
      if (member.nickname !== newNickname) {
        await member.setNickname(newNickname).catch(err => {
          console.warn("⚠️ Failed to update nickname:", err.message);
        });
      }
  
      const embed = new EmbedBuilder()
        .setTitle("📋 Manual Callsign Assigned")
        .setDescription(`<@${user.id}> was manually assigned a callsign in **${department}**`)
        .addFields(
          { name: "Platform", value: platform.toUpperCase(), inline: true },
          { name: "Callsign", value: `${prefix}${assignedNumber}`, inline: true }
        )
        .setColor(0x3498db)
        .setFooter({ text: "Prime RP Utilities • Callsign Add" })
        .setTimestamp();
  
      return interaction.editReply({ embeds: [embed] });
    }
  };
  
