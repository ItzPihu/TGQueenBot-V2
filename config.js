export const config = {
  bot: {
    name: "TGQueenBot-Beta",
    author: "Priyanshi Kaur",
    version: "2.0.0",
    prefix: "/",
    token: "YOUR_BOT_FATHER_TOKEN"
  },
  roles: {
    owners: ["BOT_ADMIN_UID"],
    admins: ["BOT_OWNER_UID"]
  },
  database: {
    type: "mongodb",
    uri: "YOUR_MONGODB_URL",
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
    updateUrl: "https://raw.githubusercontent.com/ItzPihu/TGQueenBot-V2/main/update.json",
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
