export const config = {
  bot: {
    name: "TGQueenBot-Beta",
    author: "Priyanshi Kaur",
    version: "2.0.0",
    prefix: "/",
    token: "8426423152:AAHJL3FyfBV2dsmfjQhiEn-Op8yNJcNvKCY"
  },
  roles: {
    owners: [8789877223],
    admins: [8789877223]
  },
  database: {
    type: "mongodb",
    uri: "mongodb+srv://ajay123455:ajay123455@queen.d9zk5go.mongodb.net/?appName=Queen",
    dbName: "Queen"
  },
  server: {
    port: 3000,
    keepAlive: true,
    pingInterval: 840000,
    externalUrl: ""
  },
  updater: {
    enabled: true,
    updateUrl: "https://raw.githubusercontent.com/ItzPriyanshi/TGQueenBot-V2/main/update.json",
    checkInterval: 3600000,
    autoNotifyAdmins: true
  },
  features: {
    rankUpNotification: true,
    welcomeMessage: true,
    goodbyeMessage: true,
    weeklyReport: {
      enabled: true,
      cronSchedule: "0 0 * * 0"
    },
    cooldowns: true,
    whitelist: {
      enabled: false,
      allowedUsers: []
    }
  }
};

export default config;
