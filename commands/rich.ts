export const config_data = {
  name: "rich",
  aliases: ["top", "leaderboard", "richlist"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 0,
  shortDescription: {
    en: "Show the top 10 richest users"
  },
  longDescription: {
    en: "Displays the wealth leaderboard for the current chat or globally"
  },
  category: "Economy",
  guide: {
    en: "/rich"
  }
};

const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export async function onStart({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  const query = isGroup ? { groupId: ctx.chat.id } : {};

  try {
    let topUsers = await db.collection("users")
      .find(query)
      .sort({ balance: -1 })
      .limit(10)
      .toArray();

    if (!topUsers.length && isGroup) {
      topUsers = await db.collection("users")
        .find({})
        .sort({ balance: -1 })
        .limit(10)
        .toArray();
    }

    if (!topUsers.length) {
      await ctx.reply("ℹ️ No registered wealth accounts found yet. Use `/daily` or `/work` to join the economy!");
      return;
    }

    const title = isGroup ? (ctx.chat.title || "Group") : "Global";
    let message = `🏆 *Top 10 Richest Members (${title})* 🏆\n\n`;

    topUsers.forEach((u: any, idx: number) => {
      const medal = medals[idx] || `${idx + 1}.`;
      const name = u.username ? `@${u.username}` : (u.firstName || `User \`${u.userId}\``);
      const coins = (u.balance || 0).toLocaleString();
      message += `${medal} *${name}* — \`${coins}\` coins\n`;
    });

    message += `\n💡 *Tip:* Check your own balance anytime with \`/balance\`.`;
    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An unexpected error occurred while fetching the leaderboard.");
  }
}

export default {
  config: config_data,
  onStart
};
