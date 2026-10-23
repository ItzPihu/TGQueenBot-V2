export const config_data = {
  name: "gamble",
  aliases: ["bet", "dice", "slot"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 4,
  role: 0,
  shortDescription: {
    en: "Wager your coins for multiplier payouts"
  },
  longDescription: {
    en: "Bet coins on a chance-based roll for double payouts and jackpot bonuses"
  },
  category: "Economy",
  guide: {
    en: "/gamble <amount>\n/gamble all"
  }
};

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  if (!userId) return;

  const rawAmount = (args[0] || "").toLowerCase();
  if (!rawAmount) {
    await ctx.reply("⚠️ Please specify an amount to gamble.\nUsage: `/gamble <amount>` or `/gamble all`", { parse_mode: "Markdown" });
    return;
  }

  try {
    const user = await db.collection("users").findOne({ userId });
    const currentBalance = user?.balance || 0;

    if (currentBalance <= 0) {
      await ctx.reply("❌ You do not have any coins to gamble. Use `/daily` or `/work` to earn coins first.");
      return;
    }

    let betAmount = 0;
    if (rawAmount === "all" || rawAmount === "max") {
      betAmount = currentBalance;
    } else {
      betAmount = parseInt(rawAmount, 10);
    }

    if (isNaN(betAmount) || betAmount <= 0) {
      await ctx.reply("⚠️ Please provide a valid positive number of coins to bet.");
      return;
    }

    if (betAmount > currentBalance) {
      await ctx.reply(`❌ You cannot bet *${betAmount.toLocaleString()}* coins because your balance is only *${currentBalance.toLocaleString()}* coins.`, { parse_mode: "Markdown" });
      return;
    }

    const roll = Math.random();
    let change = 0;
    let resultMessage = "";

    if (roll < 0.48) {
      change = -betAmount;
      resultMessage = `💀 *Unlucky Roll!*\n` +
        `You lost \`${betAmount.toLocaleString()}\` coins.\n` +
        `💰 *New Balance:* \`${(currentBalance + change).toLocaleString()}\` coins`;
    } else if (roll < 0.90) {
      change = betAmount;
      resultMessage = `🎉 *Winner!* 🎉\n` +
        `You won \`+${betAmount.toLocaleString()}\` coins (2x payout)!\n` +
        `💰 *New Balance:* \`${(currentBalance + change).toLocaleString()}\` coins`;
    } else {
      change = betAmount * 2;
      resultMessage = `💎 *JACKPOT!* 💎\n` +
        `Incredible luck! You hit the jackpot and won \`+${change.toLocaleString()}\` coins (3x payout)!\n` +
        `💰 *New Balance:* \`${(currentBalance + change).toLocaleString()}\` coins`;
    }

    await db.collection("users").updateOne(
      { userId },
      { $inc: { balance: change } }
    );

    await ctx.reply(`🎲 *${username}'s Gamble Result* 🎲\n\n${resultMessage}`, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An unexpected error occurred while rolling the gamble dice.");
  }
}

export default {
  config: config_data,
  onStart
};
