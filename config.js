const config = {
  bot: {
    name: "TGQueenBot-V2",
    version: "2.0.0",
    author: "Priyanshi Kaur",
    token: "8426423152:AAHJL3FyfBV2dsmfjQhiEn-Op8yNJcNvKCY",
    prefix: "/",
    port: 3000,
    keepAlive: true,
    keepAliveUrl: ""
  },
  owners: ["8789877223"],
  admins: ["8789877223"],
  database: {
    mongoUri: "mongodb+srv://ajay123455:ajay123455@queen.d9zk5go.mongodb.net/?appName=Queen",
    dbName: "economyBot",
    useLocalFallback: true
  },
  features: {
    levelSystem: true,
    welcomeMessage: true,
    goodbyeMessage: true,
    weeklyReport: true,
    economy: true,
    aiChat: true,
    moderation: true,
    games: true,
    mediaDownloaders: true,
    autoUpdater: true
  },
  updater: {
    updateJsonUrl: "https://raw.githubusercontent.com/ItzPriyanshi/TGQueenBot-V2/main/update.json",
    repoGitUrl: "https://github.com/ItzPriyanshi/TGQueenBot-V2.git",
    branch: "main",
    checkOnStartup: true,
    checkIntervalMinutes: 30,
    notifyOwnersOnUpdate: true
  },
  economy: {
    currencySymbol: "🪙",
    currencyName: "Coins",
    initialBalance: 500,
    dailyReward: 250,
    workMinReward: 50,
    workMaxReward: 300
  },
  apiKeys: {
    gemini: "",
    weather: ""
  }
};

export default config;
