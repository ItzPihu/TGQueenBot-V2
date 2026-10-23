import { InputFile } from "grammy";
import config from "../config.js";

export const config_data = {
  name: "confess",
  aliases: ["crush"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Confess feelings or generate relationship card"
  },
  longDescription: {
    en: "Generates a romance card or humorous confession between you and the user you reply to"
  },
  category: "Fun",
  guide: {
    en: "Reply to someone's message with: /confess [optional message]"
  }
};

const confessionTemplates = [
  "I've secretly admired you for the longest time...",
  "You're always the first person I look for in the group...",
  "Every time you message here, you completely brighten my day...",
  "I've been holding back these feelings, but I can't keep quiet anymore...",
  "I think you and I would make an unstoppable team...",
  "My heart skips a beat whenever your name pops up on my screen..."
];

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const sender = ctx.from;
  const target = ctx.message?.reply_to_message?.from;

  if (!target) {
    await ctx.reply("💌 Please reply to the message of the person you want to confess to with `/confess`!", { parse_mode: "Markdown" });
    return;
  }

  if (target.id === sender.id) {
    await ctx.reply("💖 Self-love is important, but you need to reply to someone else to confess!");
    return;
  }

  const senderName = sender.username ? `@${sender.username}` : sender.first_name || "Secret Admirer";
  const targetName = target.username ? `@${target.username}` : target.first_name || "Crush";

  const customText = args.join(" ").trim();
  const confessionText = customText || confessionTemplates[Math.floor(Math.random() * confessionTemplates.length)];
  const loveScore = Math.floor(Math.random() * 51) + 50;

  let senderAvatar = "https://cdn.popcat.xyz/popcat.png";
  let targetAvatar = "https://cdn.popcat.xyz/popcat.png";

  try {
    const sPhotos = await ctx.api.getUserProfilePhotos(sender.id, { limit: 1 });
    if (sPhotos.total_count > 0 && sPhotos.photos[0]?.[0]) {
      const f = await ctx.api.getFile(sPhotos.photos[0][0].file_id);
      if (f.file_path) senderAvatar = `https://api.telegram.org/file/bot${config.bot.token}/${f.file_path}`;
    }
    const tPhotos = await ctx.api.getUserProfilePhotos(target.id, { limit: 1 });
    if (tPhotos.total_count > 0 && tPhotos.photos[0]?.[0]) {
      const f = await ctx.api.getFile(tPhotos.photos[0][0].file_id);
      if (f.file_path) targetAvatar = `https://api.telegram.org/file/bot${config.bot.token}/${f.file_path}`;
    }
  } catch {}

  const caption = `💌 *Official Confession Announcement* 💌\n\n` +
    `👤 *From:* ${senderName}\n` +
    `🎯 *To:* ${targetName}\n` +
    `💖 *Compatibility Score:* \`${loveScore}%\`\n\n` +
    `💬 *Confession:*\n_"${confessionText}"_`;

  try {
    const { Ship } = await import("canvafy");
    const buffer = await new Ship()
      .setAvatars(senderAvatar, targetAvatar)
      .setBackground("color", "#181a20")
      .setBorder("#f43f5e")
      .setOverlayOpacity(0.5)
      .setCustomNumber(loveScore)
      .build();

    await ctx.replyWithPhoto(new InputFile(buffer, "confession.png"), {
      caption,
      parse_mode: "Markdown"
    });
    return;
  } catch {}

  await ctx.reply(caption, { parse_mode: "Markdown" });
}

export default {
  config: config_data,
  onStart
};
