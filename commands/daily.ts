export const config_data = {
  name: "daily",
  aliases: ["claim", "reward"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Claim your daily coin reward"
  },
  longDescription: {
    en: "Awards a daily bonus of coins once every 24 hours with cooldown tracking"
  },
  category: "Economy",
  guide: {
    en: "/daily"
  }
};

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

export async function onStart({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  if (!userId) return;

  const now = Date.now();
  const rewardAmount = 250;
  const cooldownPeriod = 24 * 60 * 60 * 1000;

  try {
    const user = await db.collection("users").findOne({ userId });
    const lastDaily = user?.lastDaily ? new Date(user.lastDaily).getTime() : 0;
    const diff = now - lastDaily;

    if (diff < cooldownPeriod) {
      const remaining = cooldownPeriod - diff;
      await ctx.reply(`⏳ You've already collected your daily bonus! Please return in *${formatDuration(remaining)}*.`, { parse_mode: "Markdown" });
      return;
    }

    await db.collection("users").updateOne(
      { userId },
      {
        $inc: { balance: rewardAmount },
        $set: { lastDaily: new Date(now), username }
      },
      { upsert: true }
    );

    const newBalance = (user?.balance || 0) + rewardAmount;
    const message = `🎁 *Daily Reward Claimed!* 🎁\n\n` +
      `👤 *User:* ${username}\n` +
      `🪙 *Reward:* +${rewardAmount.toLocaleString()} coins\n` +
      `💰 *Total Balance:* ${newBalance.toLocaleString()} coins\n\n` +
      `Come back in 24 hours to collect your next bonus!`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An error occurred while processing your daily reward.");
  }
}

export default {
  config: config_data,
  onStart
};
