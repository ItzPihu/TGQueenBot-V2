export const config_data = {
  name: "rob",
  aliases: ["steal", "heist"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Attempt to steal coins from another user"
  },
  longDescription: {
    en: "Attempts to heist coins from a target user with risk-reward probability and police fines"
  },
  category: "Economy",
  guide: {
    en: "Reply to target with: /rob\nOr: /rob @username"
  }
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  if (!userId) return;

  const now = Date.now();
  const cooldownPeriod = 60 * 60 * 1000;

  let targetId: number | null = null;
  let targetUsername: string = "";

  if (ctx.message?.reply_to_message?.from) {
    const fromUser = ctx.message.reply_to_message.from;
    targetId = fromUser.id;
    targetUsername = fromUser.username || fromUser.first_name || "Target";
  } else if (args[0]) {
    const clean = args[0].replace("@", "");
    if (!isNaN(Number(clean))) {
      targetId = Number(clean);
    } else {
      const found = await db.collection("users").findOne({
        username: { $regex: new RegExp(`^${clean}$`, "i") }
      });
      if (found) {
        targetId = found.userId;
        targetUsername = found.username || "Target";
      }
    }
  }

  if (!targetId) {
    await ctx.reply("⚠️ Please reply to the user you want to rob or tag them: `/rob @username`", { parse_mode: "Markdown" });
    return;
  }

  if (targetId === userId) {
    await ctx.reply("🚫 You cannot rob yourself!");
    return;
  }

  try {
    const robber = await db.collection("users").findOne({ userId });
    const victim = await db.collection("users").findOne({ userId: targetId });

    if (!robber || !victim) {
      await ctx.reply("❌ Both participants must have registered accounts in the bot.");
      return;
    }

    const lastRob = robber.lastRob ? new Date(robber.lastRob).getTime() : 0;
    const diff = now - lastRob;
    if (diff < cooldownPeriod) {
      const left = cooldownPeriod - diff;
      await ctx.reply(`🚨 The police are searching for you! Lay low and try again in *${formatDuration(left)}*.`, { parse_mode: "Markdown" });
      return;
    }

    const victimBalance = victim.balance || 0;
    const robberBalance = robber.balance || 0;

    if (victimBalance < 50) {
      await ctx.reply(`❌ That user is too broke to rob! They only have ${victimBalance.toLocaleString()} coins.`);
      return;
    }

    if (robberBalance < 30) {
      await ctx.reply(`❌ You need at least 30 coins to pay the potential police fine if you get caught.`);
      return;
    }

    const success = Math.random() < 0.35;

    if (success) {
      const maxSteal = Math.max(10, Math.floor(victimBalance * 0.3));
      const stolen = Math.floor(Math.random() * maxSteal) + 1;

      await db.collection("users").updateOne(
        { userId },
        {
          $inc: { balance: stolen },
          $set: { lastRob: new Date(now), username }
        }
      );

      await db.collection("users").updateOne(
        { userId: targetId },
        { $inc: { balance: -stolen } }
      );

      const msg = `🥷 *Heist Successful!* 🥷\n\n` +
        `👤 *Robber:* ${username}\n` +
        `🎯 *Victim:* ${targetUsername || "Target"}\n` +
        `💰 *Stolen:* \`+${stolen.toLocaleString()}\` coins\n` +
        `💵 *Your Balance:* \`${(robberBalance + stolen).toLocaleString()}\` coins`;

      await ctx.reply(msg, { parse_mode: "Markdown" });
    } else {
      const fine = Math.max(20, Math.floor(robberBalance * 0.15));

      await db.collection("users").updateOne(
        { userId },
        {
          $inc: { balance: -fine },
          $set: { lastRob: new Date(now), username }
        }
      );

      const msg = `🚨 *BUSTED BY THE POLICE!* 🚨\n\n` +
        `You were caught attempting to rob ${targetUsername || "the user"}!\n` +
        `🚓 *Fine Paid:* \`-${fine.toLocaleString()}\` coins\n` +
        `💰 *Your Balance:* \`${Math.max(0, robberBalance - fine).toLocaleString()}\` coins`;

      await ctx.reply(msg, { parse_mode: "Markdown" });
    }
  } catch {
    await ctx.reply("⚠️ An unexpected error occurred during the robbery attempt.");
  }
}

export default {
  config: config_data,
  onStart
};
