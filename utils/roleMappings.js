const roleMappings = {
PSO: {
  order: [
    "PSO | Rookie",
    "PSO | Officer",
    "PSO | Sr. Officer",
    "PSO | Sergeant",
    "PSO | Master Sergeant",
    "PSO | Lieutenant",
    "PSO | Captain",
    "PSO | Commander",
    "Assistant Director Of Public Safety",
    "Director Of Public Safety"
  ],
 "PSO | Rookie": {
    xbox: { range: "C-1251 - C-2000", roleId: "1372312806204117013" },
    playstation: { range: "C-1251 - C-2000", roleId: "1369497170432229417" }
  },
  "PSO | Officer": {
    xbox: { range: "B-751 - B-1250", roleId: "1372312806204117014" },
    playstation: { range: "B-751 - B-1250", roleId: "1369520223643766794" }
  },
  "PSO | Sr. Officer": {
    xbox: { range: "B-451 - B-750", roleId: "1372312806204117015" },
    playstation: { range: "B-451 - B-750", roleId: "1369520219315503154" }
  },
  "PSO | Sergeant": {
    xbox: { range: "B-251 - B-450", roleId: "1372312806204117016" },
    playstation: { range: "B-251 - B-450", roleId: "1369520227829809223" }
  },
  "PSO | Master Sergeant": {
    xbox: { range: "B-151 - B-250", roleId: "1372312806204117017" },
    playstation: { range: "B-151 - B-250", roleId: "1369757277656973362" }
  },
  "PSO | Lieutenant": {
    xbox: { range: "B-116 - B-150", roleId: "1372312806204117018" },
    playstation: { range: "B-116 - B-150", roleId: "1369520226344898581" }
  },
  "PSO | Captain": {
    xbox: { range: "D-109 - D-115", roleId: "1372312806204117019" },
    playstation: { range: "D-109 - D-115", roleId: "1369497203600654406" }
  },
  "PSO | Commander": {
    xbox: { range: "D-103 - D-108", roleId: "1372312806204117020" },
    playstation: { range: "D-103 - D-108", roleId: "1369520228010037308" }
  },
  "Assistant Director Of Public Safety": {
    xbox: { range: "D-102", roleId: "1372312806212239408" },
    playstation: { range: "D-102", roleId: "1370380132597895268" }
  },
  "Director Of Public Safety": {
    xbox: { range: "D-101", roleId: "1372312806212239409" },
    playstation: { range: "D-101", roleId: "1369497153918996630" }
  }
},
SAFR: {
  order: [
    "Recruit",
    "Firefighter",
    "Senior Firefighter",
    "Lieutenant",
    "Captain",
    "Battalion Chief",
    "Assistant Director",
    "Director"
  ],
   "Recruit": {
    xbox: { roleId: "1372312806166102076", range: "FF-R1 - FF-R100" },
    playstation: { roleId: "1369520232426770453", range: "FF-R1 - FF-R100" }
  },
  "Firefighter": {
    xbox: { roleId: "1372312806166102078", range: "FF-36 - FF-50" },
    playstation: { roleId: "1370884308012761188", range: "FF-36 - FF-50" }
  },
  "Senior Firefighter": {
    xbox: { roleId: "1372312806166102080", range: "FF-21 - FF-35" },
    playstation: { roleId: "1369520231915061268", range: "FF-21 - FF-35" }
  },
  "Lieutenant": {
    xbox: { roleId: "1372312806166102083", range: "FF-11 - FF-20" },
    playstation: { roleId: "1369520230417567744", range: "FF-11 - FF-20" }
  },
  "Captain": {
    xbox: { roleId: "1372312806166102082", range: "FF-05 - FF-10" },
    playstation: { roleId: "1369520231285915749", range: "FF-05 - FF-10" }
  },
  "Battalion Chief": {
    xbox: { roleId: "1372312806166102084", range: "BAT-01 - BAT-01" },
    playstation: { roleId: "1369520230023430184", range: "BAT-01 - BAT-01" }
  },
  "Assistant Director": {
    xbox: { roleId: "1372312806191399026", range: "Command 2 - Command 2" },
    playstation: { roleId: "1370380133801922580", range: "Command 2 - Command 2" }
  },
  "Director": {
    xbox: { roleId: "1372312806191399027", range: "Command 1 - Command 1" },
    playstation: { roleId: "1369497154976088094", range: "Command 1 - Command 1" }
  }
},
      
Civilian: {
  order: ["Prob", "Civ 1", "Civ 2", "Civ 3", "Civ 4", "Civ 5"],
  "Prob": {
    xbox: { roleId: "1372312806145392768", range: "Civ-1250 - Civ-1750" },
    playstation: { roleId: "1369497197489684650", range: "Civ-1250 - Civ-1750" }
  },
  "Civ 1": {
    xbox: { roleId: "1372312806145392769", range: "Civ-900 - Civ-1250" },
    playstation: { roleId: "1369497195929145404", range: "Civ-900 - Civ-1250" }
  },
  "Civ 2": {
    xbox: { roleId: "1372312806145392770", range: "Civ-600 - Civ-900" },
    playstation: { roleId: "1369497194314596494", range: "Civ-600 - Civ-900" }
  },
  "Civ 3": {
    xbox: { roleId: "1372312806145392771", range: "Civ-400 - Civ-600" },
    playstation: { roleId: "1369497192829812776", range: "Civ-400 - Civ-600" }
  },
  "Civ 4": {
    xbox: { roleId: "1372312806145392772", range: "Civ-150 - Civ-400" },
    playstation: { roleId: "1369497196759744712", range: "Civ-150 - Civ-400" }
  },
  "Civ 5": {
    xbox: { roleId: "1372312806145392773", range: "Civ-30 - Civ-150" },
    playstation: { roleId: "1369497170985881630", range: "Civ-30 - Civ-150" }
  }
}
      };
  module.exports = roleMappings;
  
