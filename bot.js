import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Bot } from "grammy";
import { run } from "@grammyjs/runner";
import { hydrate } from "@grammyjs/hydrate";
import schedule from "node-schedule";
import chalk from "chalk";
import config from "./config.js";
import { connectToDatabase, isLocalDatabase } from "./db.js";
import updater from "./updater.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bot = new Bot(config.bot.token);
bot.use(hydrate());

const commands = new Map();
const events = new Map();

function fancyBox(text) {
  const width = text.length + 4;
  const top = "╔" + "═".repeat(width) + "╗";
  const middle = "║ " + text + " ║";
  const bottom = "╚" + "═".repeat(width) + "╝";
  return `${top}\n${middle}\n${bottom}`;
}

const banner = `
 ████████╗ ██████╗  ██████╗ ██╗   ██╗███████╗███████╗███╗   ██╗
 ╚══██╔══╝██╔════╝ ██╔═══██╗██║   ██║██╔════╝██╔════╝████╗  ██║
    ██║   ██║  ███╗██║   ██║██║   ██║█████╗  █████╗  ██╔██╗ ██║
    ██║   ██║   ██║██║▄▄ ██║██║   ██║██╔══╝  ██╔══╝  ██║╚██╗██║
    ██║   ╚██████╔╝╚██████╔╝╚██████╔╝███████╗███████╗██║ ╚████║
    ╚═╝    ╚═════╝  ╚══▀▀═╝  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═══╝
               👑 ${config.bot.name} v${config.bot.version} 👑
               👤 Author: ${config.bot.author}
               ⚡ Runtime: Bun.js / Node ESM
`;

async function loadCommands() {
  const commandsPath = path.join(__dirname, "commands");
  if (!fs.existsSync(commandsPath)) return;

  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
  for (const file of files) {
    try {
      const fullPath = path.join(commandsPath, file);
      const imported = await import(pathToFileURL(fullPath).href);
      const command = imported.default || imported;
      if (command && command.name) {
        commands.set(command.name.toLowerCase(), command);
        if (Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            commands.set(alias.toLowerCase(), command);
          }
        }
      }
    } catch (err) {
      console.error(chalk.red(`Failed loading command ${file}:`), err.message);
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, "events");
  if (!fs.existsSync(eventsPath)) return;

  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
  for (const file of files) {
    try {
      const fullPath = path.join(eventsPath, file);
      const imported = await import(pathToFileURL(fullPath).href);
      const event = imported.default || imported;
      if (event && event.name) {
        events.set(event.name.toLowerCase(), event);
      }
    } catch (err) {
      console.error(chalk.red(`Failed loading event ${file}:`), err.message);
    }
  }
}

function startHealthServer() {
  const port = config.bot.port || 3000;
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "online",
      bot: config.bot.name,
      version: config.bot.version,
      author: config.bot.author,
      uptime: process.uptime()
    }));
  });

  server.listen(port, () => {
    console.log(chalk.cyan(`[HTTP] Health server running on port ${port}`));
  });

  if (config.bot.keepAlive && config.bot.keepAliveUrl) {
    setInterval(async () => {
      try {
        await fetch(config.bot.keepAliveUrl);
      } catch {}
    }, 14 * 60 * 1000);
  }
}

async function sendWeeklyReport(botInstance, db) {
  if (!config.features?.weeklyReport) return;
  try {
    const groups = await db.collection("groups").find({}).toArray();
    for (const group of groups) {
      const topUsers = await db.collection("users")
        .find({ groupId: group.groupId })
        .sort({ xp: -1 })
        .limit(10)
        .toArray();

      let text = `📊 *Weekly Activity Report for ${group.groupName || "Group"}*\n\nTop 10 Active Members:\n`;
      topUsers.forEach((u, i) => {
        text += `${i + 1}. *${u.username || "Anonymous"}* - ${u.xp || 0} XP\n`;
      });

      await botInstance.api.sendMessage(group.groupId, text, { parse_mode: "Markdown" }).catch(() => {});
    }
  } catch (err) {
    console.error("Weekly report error:", err.message);
  }
}

async function updateUserXP(db, userId, username) {
  if (!config.features?.levelSystem) return { leveledUp: false, newLevel: 0 };
  const user = await db.collection("users").findOne({ userId });
  const currentXP = (user?.xp || 0) + 10;
  const currentLevel = user?.level || 1;
  const nextLevelXP = currentLevel * 100;
  let leveledUp = false;
  let newLevel = currentLevel;

  if (currentXP >= nextLevelXP) {
    leveledUp = true;
    newLevel = currentLevel + 1;
  }

  await db.collection("users").updateOne(
    { userId },
    { $set: { username, xp: currentXP, level: newLevel } },
    { upsert: true }
  );

  return { leveledUp, newLevel };
}

async function startBot() {
  console.log(chalk.magenta(banner));
  console.log(chalk.green(fancyBox("✨ Starting TGQueenBot-V2 ✨")));

  startHealthServer();
  const db = await connectToDatabase();
  console.log(chalk.blue(fancyBox(isLocalDatabase() ? "Connected to Local JSON Database" : "Connected to MongoDB")));

  await loadCommands();
  console.log(chalk.yellow(`[System] Loaded ${commands.size} commands`));

  await loadEvents();
  console.log(chalk.yellow(`[System] Loaded ${events.size} event modules`));

  if (config.features?.autoUpdater && config.updater?.checkOnStartup) {
    updater.notifyOwnersOfUpdate(bot).catch(err => console.error("Startup update check failed:", err.message));
  }

  if (config.features?.autoUpdater && config.updater?.checkIntervalMinutes) {
    const intervalMs = config.updater.checkIntervalMinutes * 60 * 1000;
    setInterval(() => {
      updater.notifyOwnersOfUpdate(bot).catch(() => {});
    }, intervalMs);
  }

  schedule.scheduleJob("0 0 * * 0", () => sendWeeklyReport(bot, db));

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || "User";
    const chatType = ctx.chat.type;

    if (config.features?.levelSystem) {
      const { leveledUp, newLevel } = await updateUserXP(db, userId, username);
      if (leveledUp) {
        await ctx.reply(`🎉 Congratulations ${username}! You leveled up to Level ${newLevel}! ✨`).catch(() => {});
      }
    }

    if (chatType === "group" || chatType === "supergroup") {
      await db.collection("groups").updateOne(
        { groupId: ctx.chat.id },
        { $set: { groupName: ctx.chat.title, active: true } },
        { upsert: true }
      ).catch(() => {});

      await db.collection("users").updateOne(
        { userId },
        { $set: { groupId: ctx.chat.id, username } },
        { upsert: true }
      ).catch(() => {});
    }

    const prefix = config.bot.prefix || "/";
    if (!text.startsWith(prefix)) return;

    const parts = text.slice(prefix.length).trim().split(/\s+/);
    const commandName = parts[0]?.toLowerCase().split("@")[0];
    const args = parts.slice(1);

    if (!commands.has(commandName)) return;
    const command = commands.get(commandName);

    const isOwner = config.owners.map(String).includes(String(userId));
    if (command.ownerOnly && !isOwner) {
      return ctx.reply("🚫 This command is reserved for bot owners only.");
    }

    if (command.adminOnly) {
      const isAdmin = config.admins.map(String).includes(String(userId)) || isOwner;
      if (!isAdmin && (chatType === "group" || chatType === "supergroup")) {
        try {
          const member = await ctx.getChatMember(userId);
          const isGroupAdmin = ["creator", "administrator"].includes(member.status);
          if (!isGroupAdmin) {
            return ctx.reply("🚫 This command is reserved for administrators.");
          }
        } catch {
          return ctx.reply("🚫 Unable to verify administrator permissions.");
        }
      }
    }

    try {
      if (command.execute.length === 4) {
        await command.execute(bot, ctx.message, args, db);
      } else {
        await command.execute(ctx, args, db);
      }
    } catch (err) {
      console.error(chalk.red(`Command error [${commandName}]:`), err);
      await ctx.reply("❌ An error occurred while executing this command.").catch(() => {});
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    try {
      const [cmdName, ...cbArgs] = ctx.callbackQuery.data.split(":");
      const command = commands.get(cmdName?.toLowerCase());
      if (command && typeof command.handleCallback === "function") {
        await command.handleCallback(ctx, cbArgs, db);
      }
      await ctx.answerCallbackQuery().catch(() => {});
    } catch (err) {
      console.error(chalk.red("Callback error:"), err);
      await ctx.answerCallbackQuery({ text: "Error handling action", show_alert: true }).catch(() => {});
    }
  });

  bot.on(":new_chat_members", async (ctx) => {
    if (!config.features?.welcomeMessage) return;
    const welcomeEvent = events.get("welcome");
    if (welcomeEvent && typeof welcomeEvent.execute === "function") {
      try {
        await welcomeEvent.execute(ctx, db);
      } catch (err) {
        console.error("Welcome event error:", err.message);
      }
    }
  });

  bot.on(":left_chat_member", async (ctx) => {
    if (!config.features?.goodbyeMessage) return;
    const goodbyeEvent = events.get("goodbye");
    if (goodbyeEvent && typeof goodbyeEvent.execute === "function") {
      try {
        await goodbyeEvent.execute(ctx, db);
      } catch (err) {
        console.error("Goodbye event error:", err.message);
      }
    }
  });

  run(bot);
  console.log(chalk.green(fancyBox("🚀 TGQueenBot-V2 Runner Active! 🚀")));
}

startBot().catch(err => {
  console.error(chalk.red("Fatal startup error:"), err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error(chalk.red("Unhandled Rejection:"), reason);
});

process.on("uncaughtException", (err) => {
  console.error(chalk.red("Uncaught Exception:"), err);
});
