export const config_data = {
  name: "balance",
  aliases: ["bal", "money", "coins"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Check your current coin balance"
  },
  longDescription: {
    en: "Retrieves your active wallet balance from the economy database"
  },
  category: "Economy",
  guide: {
    en: "/balance"
  }
};

export async function onStart({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  if (!userId) return;

  try {
    const user = await db.collection("users").findOne({ userId });
    const balance = user?.balance ?? 0;

    const message = `💰 *Wallet Balance for ${username}*\n\n` +
      `🪙 *Coins:* \`${balance.toLocaleString()}\`\n` +
      `💳 *Account Status:* Active\n\n` +
      `💡 *Tip:* Use \`/daily\` to claim your daily bonus or \`/work\` to earn more coins!`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An error occurred while retrieving your balance.");
  }
}

export default {
  config: config_data,
  onStart
};
