import { InputFile, InlineKeyboard } from "grammy";
import fs from "fs";
import path from "path";
import config from "../config.js";

export const config_data = {
  name: "start",
  aliases: ["hello", "menu"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Starts the bot and sends the welcome dashboard"
  },
  longDescription: {
    en: "Starts the bot, initializes user record in the database, and provides quick navigation"
  },
  category: "General",
  guide: {
    en: "/start"
  }
};

export async function onStart({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  const chatId = ctx.chat?.id;

  if (userId) {
    try {
      await db.collection("users").updateOne(
        { userId },
        {
          $set: {
            username,
            lastActive: new Date(),
            chatId
          },
          $inc: { commandsUsed: 1 }
        },
        { upsert: true }
      );
    } catch {}
  }

  const caption = `👑 *Welcome to ${config.bot.name}!* 👑\n\n` +
    `Hello <a href="tg://user?id=${userId}">${username}</a>!\n` +
    `I am an advanced multipurpose Telegram bot powered by **grammY** & **Bun.js**.\n\n` +
    `⚡ *Author:* ${config.bot.author}\n` +
    `📦 *Version:* \`${config.bot.version}\`\n\n` +
    `Type \`/help\` to explore all available commands.`;

  const keyboard = new InlineKeyboard()
    .text("📜 Help & Commands", "help:list")
    .text("✨ Updates", "update:check");

  const imagePath = path.resolve(process.cwd(), "assets", "nexa.jpg");

  try {
    if (fs.existsSync(imagePath)) {
      await ctx.replyWithPhoto(new InputFile(imagePath), {
        caption,
        parse_mode: "HTML",
        reply_markup: keyboard
      });
      return;
    }
  } catch {}

  await ctx.reply(caption, {
    parse_mode: "HTML",
    reply_markup: keyboard
  });
}

export default {
  config: config_data,
  onStart
};
