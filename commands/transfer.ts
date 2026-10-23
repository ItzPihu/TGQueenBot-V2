export const config_data = {
  name: "transfer",
  aliases: ["pay", "give", "sendcoins"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Transfer coins to another user"
  },
  longDescription: {
    en: "Transfers currency to a designated user via username, user ID, or reply"
  },
  category: "Economy",
  guide: {
    en: "/transfer @username <amount>\n/transfer <user_id> <amount>\nReply to a user: /transfer <amount>"
  }
};

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  const fromUserId = ctx.from?.id;
  const fromUsername = ctx.from?.username || ctx.from?.first_name || "User";
  if (!fromUserId) return;

  let targetIdentifier = "";
  let amountStr = "";

  if (ctx.message?.reply_to_message?.from) {
    const target = ctx.message.reply_to_message.from;
    targetIdentifier = String(target.id);
    amountStr = args[0];
  } else {
    targetIdentifier = args[0] || "";
    amountStr = args[1] || "";
  }

  const amount = parseInt(amountStr, 10);
  if (!targetIdentifier || isNaN(amount) || amount <= 0) {
    await ctx.reply("⚠️ Invalid usage.\nExample: `/transfer @username 100` or reply to a user with `/transfer 100`", { parse_mode: "Markdown" });
    return;
  }

  try {
    const sender = await db.collection("users").findOne({ userId: fromUserId });
    const senderBalance = sender?.balance || 0;

    if (senderBalance < amount) {
      await ctx.reply(`❌ Insufficient funds. You currently possess *${senderBalance.toLocaleString()}* coins.`, { parse_mode: "Markdown" });
      return;
    }

    let recipient = null;
    const cleanTarget = targetIdentifier.replace("@", "");

    if (!isNaN(Number(cleanTarget))) {
      const numericId = Number(cleanTarget);
      if (numericId === fromUserId) {
        await ctx.reply("🚫 You cannot transfer coins to yourself.");
        return;
      }
      recipient = await db.collection("users").findOne({ userId: numericId });
    } else {
      if (cleanTarget.toLowerCase() === fromUsername.toLowerCase()) {
        await ctx.reply("🚫 You cannot transfer coins to yourself.");
        return;
      }
      recipient = await db.collection("users").findOne({
        username: { $regex: new RegExp(`^${cleanTarget}$`, "i") }
      });
    }

    if (!recipient) {
      await ctx.reply(`❌ Recipient \`${targetIdentifier}\` could not be found in the database.`, { parse_mode: "Markdown" });
      return;
    }

    await db.collection("users").updateOne(
      { userId: fromUserId },
      { $inc: { balance: -amount } }
    );

    await db.collection("users").updateOne(
      { userId: recipient.userId },
      { $inc: { balance: amount } }
    );

    const recipientName = recipient.username ? `@${recipient.username}` : recipient.firstName || `User (${recipient.userId})`;
    const message = `💸 *Transfer Successful!* 💸\n\n` +
      `📤 *Sender:* ${fromUsername}\n` +
      `📥 *Recipient:* ${recipientName}\n` +
      `🪙 *Amount Sent:* ${amount.toLocaleString()} coins\n` +
      `💰 *Remaining Balance:* ${(senderBalance - amount).toLocaleString()} coins`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An unexpected error occurred during the coin transfer.");
  }
}

export default {
  config: config_data,
  onStart
};
