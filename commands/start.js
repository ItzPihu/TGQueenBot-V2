import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { InputFile } from "grammy";
import config from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: "start",
  description: "Starts the bot and sends a welcome greeting",
  ownerOnly: false,
  adminOnly: false,

  async execute(ctx, args, db) {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name || "User";
    const imagePath = path.join(__dirname, "..", "assets", "nexa.jpg");

    const welcomeCaption =
      `👑 *Welcome to ${config.bot.name}!* 👑\n\n` +
      `Hello ${username}! I am your high-performance modular Telegram bot running on Bun.js and ESM.\n\n` +
      `⚡ *Version:* \`${config.bot.version}\`\n` +
      `👤 *Author:* ${config.bot.author}\n\n` +
      `Type \`/help\` to explore all available commands and features!`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "📚 Help Menu", callback_data: "help:menu" },
          { text: "⚡ System Updates", callback_data: "update:check" }
        ]
      ]
    };

    try {
      if (fs.existsSync(imagePath)) {
        await ctx.replyWithPhoto(new InputFile(imagePath), {
          caption: welcomeCaption,
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(welcomeCaption, {
          parse_mode: "Markdown",
          reply_markup: keyboard
        });
      }
    } catch {
      await ctx.reply(welcomeCaption, {
        parse_mode: "Markdown",
        reply_markup: keyboard
      }).catch(() => {});
    }

    if (db) {
      await db.collection("users").updateOne(
        { userId },
        {
          $set: { username, lastActive: new Date(), chatId },$inc: { commandsUsed: 1 }
        },
        { upsert: true }
      ).catch(() => {});
    }
  }
};
