import { InputFile } from "grammy";
import config from "../config.js";

export const config_data = {
  name: "rank",
  aliases: ["level", "xp"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 0,
  shortDescription: {
    en: "View your level, XP, and rank card"
  },
  longDescription: {
    en: "Calculates current user XP progress, rank tier, and outputs a formatted rank card"
  },
  category: "Leveling",
  guide: {
    en: "/rank"
  }
};

const levels = [
  { name: "Novice", minXP: 0 },
  { name: "Apprentice", minXP: 100 },
  { name: "Adept", minXP: 500 },
  { name: "Expert", minXP: 1000 },
  { name: "Master", minXP: 5000 }
];

export async function updateUserXP(db: any, userId: number, username: string): Promise<{ leveledUp: boolean; newLevel: number }> {
  try {
    const user = await db.collection("users").findOne({ userId });
    const currentXp = (user?.xp || 0) + 1;
    const currentLevel = user?.level || 1;
    const requiredXp = currentLevel * 100;
    let leveledUp = false;
    let newLevel = currentLevel;

    if (currentXp >= requiredXp) {
      leveledUp = true;
      newLevel += 1;
    }

    await db.collection("users").updateOne(
      { userId },
      { $set: { xp: currentXp, level: newLevel, username } },
      { upsert: true }
    );

    return { leveledUp, newLevel };
  } catch {
    return { leveledUp: false, newLevel: 1 };
  }
}

export async function onStart({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  if (!userId) return;

  try {
    const user = await db.collection("users").findOne({ userId });
    if (!user || !user.xp) {
      await ctx.reply(`👋 Hello ${username}, you haven't accumulated any XP yet. Chat in the group to gain XP!`);
      return;
    }

    const xp = user.xp || 0;
    const currentTier = levels.filter(l => l.minXP <= xp).pop() || levels[0];
    const nextTier = levels.find(l => l.minXP > xp) || levels[levels.length - 1];
    const needed = nextTier.minXP;
    const currentLevelNum = user.level || 1;

    let avatarUrl = "https://cdn.popcat.xyz/popcat.png";
    try {
      const photos = await ctx.api.getUserProfilePhotos(userId, { limit: 1 });
      if (photos.total_count > 0 && photos.photos[0]?.[0]) {
        const file = await ctx.api.getFile(photos.photos[0][0].file_id);
        if (file.file_path) {
          avatarUrl = `https://api.telegram.org/file/bot${config.bot.token}/${file.file_path}`;
        }
      }
    } catch {}

    try {
      const { Rank } = await import("canvafy");
      const card = await new Rank()
        .setAvatar(avatarUrl)
        .setBackground("color", "#181a20")
        .setUsername(username)
        .setBorder("#3b82f6")
        .setAvatarBorder("#ffffff")
        .setOverlayOpacity(0.5)
        .setLevel(currentLevelNum)
        .setCurrentXp(xp)
        .setRequiredXp(needed)
        .build();

      await ctx.replyWithPhoto(new InputFile(card, "rank.png"), {
        caption: `👑 *${username}'s Profile Card*\n` +
          `🎖️ *Rank Tier:* ${currentTier.name}\n` +
          `⭐ *Level:* ${currentLevelNum}\n` +
          `✨ *Experience:* ${xp} / ${needed} XP`,
        parse_mode: "Markdown"
      });
      return;
    } catch {}

    const barLength = 10;
    const progressRatio = Math.min(1, Math.max(0, (xp - currentTier.minXP) / Math.max(1, needed - currentTier.minXP)));
    const filled = Math.round(barLength * progressRatio);
    const progressBar = "▰".repeat(filled) + "▱".repeat(barLength - filled);

    const message = `📊 *Rank Statistics for ${username}*\n\n` +
      `🎖️ *Tier:* ${currentTier.name}\n` +
      `⭐ *Level:* ${currentLevelNum}\n` +
      `✨ *XP:* ${xp} / ${needed}\n` +
      `📈 *Progress:* [${progressBar}] ${Math.round(progressRatio * 100)}%`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An error occurred while retrieving your rank data.");
  }
}

export default {
  config: config_data,
  onStart,
  updateUserXP
};
