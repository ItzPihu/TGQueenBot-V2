import { Bot, Context } from "grammy";
import http from "http";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import schedule from "node-schedule";
import config from "./config.js";
import { connectToDatabase, isLocalDatabase } from "./db.js";
import { checkRemoteUpdate, notifyAdmins } from "./updater.js";

export interface CommandConfig {
  name: string;
  aliases?: string[];
  version?: string;
  author?: string;
  countDown?: number;
  role?: number;
  shortDescription?: string | Record<string, string>;
  longDescription?: string | Record<string, string>;
  category?: string;
  guide?: string | Record<string, string>;
}

export interface CommandModule {
  config: CommandConfig;
  onStart?: (params: { bot: Bot<Context>; ctx: Context; args: string[]; db: any; message: any }) => Promise<any>;
  onChat?: (params: { bot: Bot<Context>; ctx: Context; db: any; message: any }) => Promise<any>;
  onReply?: (params: { bot: Bot<Context>; ctx: Context; Reply: any; args: string[]; db: any }) => Promise<any>;
  onReaction?: (params: { bot: Bot<Context>; ctx: Context; db: any }) => Promise<any>;
  handleCallback?: (bot: Bot<Context>, ctx: Context, args: string[], db: any) => Promise<any>;
  execute?: (bot: any, msg: any, args: string[], db: any) => Promise<any>;
}

export interface EventModule {
  name: string;
  execute: (bot: Bot<Context>, ctx: Context, groupName?: string, memberCount?: number, db?: any) => Promise<any>;
}

export const commands = new Map<string, CommandModule>();
export const commandAliases = new Map<string, string>();
export const events = new Map<string, EventModule>();
export const onReplyMap = new Map<number | string, { commandName: string; type: string; author: number; data?: any }>();
export const cooldowns = new Map<string, number>();

const bot = new Bot(config.bot.token);

async function loadCommands(): Promise<void> {
  const dir = path.resolve(process.cwd(), "commands");
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
  for (const file of files) {
    try {
      const modulePath = path.join(dir, file);
      const mod = await import(`file://${modulePath}`);
      const cmd: CommandModule = mod.default || mod;
      if (cmd?.config?.name) {
        commands.set(cmd.config.name.toLowerCase(), cmd);
        if (Array.isArray(cmd.config.aliases)) {
          for (const alias of cmd.config.aliases) {
            commandAliases.set(alias.toLowerCase(), cmd.config.name.toLowerCase());
          }
        }
      } else if (cmd?.config && (cmd as any).name) {
        const name = (cmd as any).name.toLowerCase();
        commands.set(name, cmd);
      }
    } catch (err: any) {
      console.error(chalk.red(`Failed loading command ${file}: ${err.message}`));
    }
  }
}

async function loadEvents(): Promise<void> {
  const dir = path.resolve(process.cwd(), "events");
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") || f.endsWith(".ts"));
  for (const file of files) {
    try {
      const modulePath = path.join(dir, file);
      const mod = await import(`file://${modulePath}`);
      const evt: EventModule = mod.default || mod;
      if (evt?.name) {
        events.set(evt.name, evt);
      }
    } catch (err: any) {
      console.error(chalk.red(`Failed loading event ${file}: ${err.message}`));
    }
  }
}

function startWebServer(): void {
  const server = http.createServer((_, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(`${config.bot.name} is running smoothly.`);
  });
  const port = process.env.PORT || config.server.port || 3000;
  server.listen(port, () => {
    console.log(chalk.cyan(`[Server] Listening on port ${port}`));
  });

  if (config.server.keepAlive) {
    setInterval(() => {
      const target = config.server.externalUrl || `http://localhost:${port}`;
      fetch(target).catch(() => {});
    }, config.server.pingInterval || 840000);
  }
}

async function checkUserRole(ctx: Context, requiredRole: number): Promise<boolean> {
  if (requiredRole === 0) return true;
  const userId = ctx.from?.id;
  if (!userId) return false;

  const isOwner = config.roles.owners.includes(userId);
  const isBotAdmin = isOwner || config.roles.admins.includes(userId);

  if (requiredRole === 2) {
    return isBotAdmin;
  }

  if (requiredRole === 1) {
    if (isBotAdmin) return true;
    if (ctx.chat?.type === "private") return true;
    try {
      const member = await ctx.getChatMember(userId);
      return ["creator", "administrator"].includes(member.status);
    } catch {
      return false;
    }
  }

  return true;
}

async function handleLevelXP(db: any, ctx: Context): Promise<void> {
  if (!config.features.rankUpNotification || !ctx.from || !ctx.chat) return;
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || "User";
  try {
    const userDoc = await db.collection("users").findOne({ userId });
    const currentXp = (userDoc?.xp || 0) + 1;
    const currentLevel = userDoc?.level || 1;
    const neededXp = currentLevel * 100;
    let leveledUp = false;
    let newLevel = currentLevel;

    if (currentXp >= neededXp) {
      leveledUp = true;
      newLevel += 1;
    }

    await db.collection("users").updateOne(
      { userId },
      { $set: { xp: currentXp, level: newLevel, username } },
      { upsert: true }
    );

    if (leveledUp) {
      await ctx.reply(`🎉 *Level Up!* 🎉\n✨ ${username} reached Level ${newLevel}! ✨`, { parse_mode: "Markdown" });
    }
  } catch {}
}

async function setupScheduledTasks(db: any): Promise<void> {
  if (!config.features.weeklyReport?.enabled) return;
  schedule.scheduleJob(config.features.weeklyReport.cronSchedule || "0 0 * * 0", async () => {
    try {
      const groups = await db.collection("groups").find({}).toArray();
      for (const group of groups) {
        const topUsers = await db.collection("users")
          .find({ groupId: group.groupId })
          .sort({ xp: -1 })
          .limit(10)
          .toArray();
        if (!topUsers.length) continue;
        let text = `📊 *Weekly Activity Report for ${group.groupName}*\n\n`;
        topUsers.forEach((u: any, i: number) => {
          text += `${i + 1}. ${u.username || "User"}: ${u.xp || 0} XP\n`;
        });
        await bot.api.sendMessage(group.groupId, text, { parse_mode: "Markdown" }).catch(() => {});
      }
    } catch {}
  });
}

export async function bootstrap(): Promise<void> {
  console.log(chalk.magenta.bold(`=== Starting ${config.bot.name} v${config.bot.version} by ${config.bot.author} ===`));

  startWebServer();
  const db = await connectToDatabase();
  console.log(chalk.green(`[Database] ${isLocalDatabase() ? "Local JSON mode" : "Connected to MongoDB"}`));

  await loadCommands();
  console.log(chalk.blue(`[Commands] Loaded ${commands.size} command handlers`));

  await loadEvents();
  console.log(chalk.blue(`[Events] Loaded ${events.size} event handlers`));

  await setupScheduledTasks(db);

  if (config.updater.enabled) {
    const updateInfo = await checkRemoteUpdate();
    if (updateInfo.hasUpdate) {
      console.log(chalk.yellow.bold(`[Updater] New version detected: ${updateInfo.remoteVersion} (Current: ${updateInfo.localVersion})`));
      await notifyAdmins(bot, updateInfo);
    }
    setInterval(async () => {
      const periodic = await checkRemoteUpdate();
      if (periodic.hasUpdate) {
        await notifyAdmins(bot, periodic);
      }
    }, config.updater.checkInterval || 3600000);
  }

  bot.on("message:new_chat_members", async (ctx) => {
    if (!config.features.welcomeMessage) return;
    const welcome = events.get("welcome");
    if (welcome) {
      const memberCount = await ctx.getChatMemberCount().catch(() => 0);
      await welcome.execute(bot, ctx, ctx.chat.title, memberCount, db);
    }
  });

  bot.on("message:left_chat_member", async (ctx) => {
    if (!config.features.goodbyeMessage) return;
    const goodbye = events.get("goodbye");
    if (goodbye) {
      const memberCount = await ctx.getChatMemberCount().catch(() => 0);
      await goodbye.execute(bot, ctx, ctx.chat.title, memberCount, db);
    }
  });

  bot.on("message_reaction", async (ctx) => {
    for (const cmd of commands.values()) {
      if (cmd.onReaction) {
        try {
          await cmd.onReaction({ bot, ctx, db });
        } catch (err: any) {
          console.error(chalk.red(`[Reaction Error] ${cmd.config?.name || "command"}: ${err.message}`));
        }
      }
    }
  });

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const [name, ...args] = data.split(":");
    const target = commands.get(name.toLowerCase()) || commands.get(commandAliases.get(name.toLowerCase()) || "");
    if (target?.handleCallback) {
      try {
        await target.handleCallback(bot, ctx, args, db);
      } catch (err: any) {
        await ctx.answerCallbackQuery({ text: "Error executing action", show_alert: true });
      }
    } else {
      await ctx.answerCallbackQuery();
    }
  });

  bot.on("message", async (ctx) => {
    if (config.features.whitelist?.enabled) {
      const senderId = ctx.from?.id;
      if (senderId && !config.features.whitelist.allowedUsers.includes(senderId) && !config.roles.owners.includes(senderId)) {
        return;
      }
    }

    if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
      await db.collection("groups").updateOne(
        { groupId: ctx.chat.id },
        { $set: { groupName: ctx.chat.title } },
        { upsert: true }
      );
      if (ctx.from) {
        await db.collection("users").updateOne(
          { userId: ctx.from.id },
          { $set: { groupId: ctx.chat.id } },
          { upsert: true }
        );
      }
    }

    await handleLevelXP(db, ctx);

    const text = ctx.message?.text || "";

    if (ctx.message?.reply_to_message) {
      const replyId = ctx.message.reply_to_message.message_id;
      const registered = onReplyMap.get(replyId);
      if (registered) {
        const cmd = commands.get(registered.commandName.toLowerCase());
        if (cmd?.onReply) {
          const args = text.trim().split(/\s+/);
          await cmd.onReply({ bot, ctx, Reply: registered, args, db });
          return;
        }
      }
    }

    for (const cmd of commands.values()) {
      if (cmd.onChat) {
        try {
          await cmd.onChat({ bot, ctx, db, message: ctx.message });
        } catch {}
      }
    }

    const prefix = config.bot.prefix || "/";
    if (!text.startsWith(prefix)) return;

    const parts = text.slice(prefix.length).trim().split(/\s+/);
    const rawName = parts.shift()?.toLowerCase();
    if (!rawName) return;

    const cmdName = commandAliases.get(rawName) || rawName;
    const command = commands.get(cmdName);
    if (!command) return;

    const role = command.config?.role ?? 0;
    const allowed = await checkUserRole(ctx, role);
    if (!allowed) {
      const roleName = role === 2 ? "Bot Owner/Admin" : "Group Admin";
      await ctx.reply(`🚫 Permission denied. This command requires ${roleName} access.`);
      return;
    }

    const cooldownSec = command.config?.countDown || 0;
    if (cooldownSec > 0 && ctx.from) {
      const key = `${ctx.from.id}_${cmdName}`;
      const now = Date.now();
      const last = cooldowns.get(key) || 0;
      if (now - last < cooldownSec * 1000) {
        const left = Math.ceil((cooldownSec * 1000 - (now - last)) / 1000);
        await ctx.reply(`⏳ Please wait ${left} second(s) before reusing \`${cmdName}\`.`);
        return;
      }
      cooldowns.set(key, now);
    }

    try {
      if (command.onStart) {
        await command.onStart({ bot, ctx, args: parts, db, message: ctx.message });
      } else if (command.execute) {
        await command.execute(bot, ctx.message, parts, db);
      }
    } catch (err: any) {
      console.error(chalk.red(`[Error] Executing ${cmdName}: ${err.message}`));
      await ctx.reply(`⚠️ An error occurred while executing \`${cmdName}\`.`);
    }
  });

  bot.catch((err) => {
    console.error(chalk.red(`[grammY Error]: ${err.message}`));
  });

  bot.start({
    allowed_updates: [
      "message",
      "edited_message",
      "channel_post",
      "edited_channel_post",
      "message_reaction",
      "message_reaction_count",
      "inline_query",
      "chosen_inline_result",
      "callback_query"
    ]
  });
  console.log(chalk.green.bold(`🚀 ${config.bot.name} successfully launched on grammY & Bun/Node!`));
}

bootstrap().catch((err) => {
  console.error(chalk.red.bold(`[Fatal Error]: ${err.message}`));
  process.exit(1);
});
