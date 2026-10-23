import config from "../config.js";

export const config_data = {
  name: "warn",
  aliases: ["warning"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 1,
  shortDescription: {
    en: "Issue a moderation warning to a group member"
  },
  longDescription: {
    en: "Tracks member warning strikes in the database and automatically kicks members exceeding 3 warnings"
  },
  category: "Moderation",
  guide: {
    en: "Reply to user: /warn [reason]\nOr: /warn <user_id> [reason]\nReset: /warn reset <user_id>"
  }
};

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  if (ctx.chat?.type === "private") {
    await ctx.reply("🚫 This command can only be used in groups.");
    return;
  }

  const sub = (args[0] || "").toLowerCase();

  if (sub === "reset") {
    let targetId: number | null = null;
    if (ctx.message?.reply_to_message?.from) {
      targetId = ctx.message.reply_to_message.from.id;
    } else if (args[1] && !isNaN(Number(args[1]))) {
      targetId = Number(args[1]);
    }

    if (!targetId) {
      await ctx.reply("⚠️ Specify the user to reset: `/warn reset <user_id>` or reply to their message with `/warn reset`", { parse_mode: "Markdown" });
      return;
    }

    await db.collection("warnings").deleteMany({ userId: targetId, chatId: ctx.chat.id });
    await ctx.reply(`✅ Warnings cleared for user \`${targetId}\` in this group.`, { parse_mode: "Markdown" });
    return;
  }

  let targetId: number | null = null;
  let targetName: string = "";
  let reason = "No reason provided";

  if (ctx.message?.reply_to_message?.from) {
    const from = ctx.message.reply_to_message.from;
    targetId = from.id;
    targetName = from.username ? `@${from.username}` : from.first_name || "User";
    reason = args.join(" ") || reason;
  } else if (args[0]) {
    const clean = args[0].replace("@", "");
    if (!isNaN(Number(clean))) {
      targetId = Number(clean);
      targetName = `User \`${targetId}\``;
      reason = args.slice(1).join(" ") || reason;
    } else {
      await ctx.reply("💡 Please reply to the user's message or provide their numeric Telegram User ID to warn them.");
      return;
    }
  }

  if (!targetId) {
    await ctx.reply("⚠️ Usage: Reply to a user with `/warn [reason]` or `/warn <user_id> [reason]`", { parse_mode: "Markdown" });
    return;
  }

  if (targetId === ctx.from?.id) {
    await ctx.reply("🚫 You cannot warn yourself.");
    return;
  }

  if (config.roles.owners.includes(targetId) || config.roles.admins.includes(targetId)) {
    await ctx.reply("🚫 Cannot warn a bot owner or administrator.");
    return;
  }

  try {
    const targetMember = await ctx.api.getChatMember(ctx.chat.id, targetId);
    if (["creator", "administrator"].includes(targetMember.status)) {
      await ctx.reply("🚫 Group administrators cannot be warned.");
      return;
    }

    await db.collection("warnings").insertOne({
      userId: targetId,
      username: targetName,
      chatId: ctx.chat.id,
      reason,
      warnedBy: ctx.from?.id,
      timestamp: new Date()
    });

    const warningCount = await db.collection("warnings").countDocuments({
      userId: targetId,
      chatId: ctx.chat.id
    });

    let message = `⚠️ *Warning Issued* ⚠️\n\n` +
      `👤 *Member:* ${targetName}\n` +
      `🛡️ *Moderator:* ${ctx.from?.first_name || "Admin"}\n` +
      `📝 *Reason:* ${reason}\n` +
      `📊 *Total Warnings:* ${warningCount} / 3`;

    if (warningCount >= 3) {
      try {
        await ctx.banChatMember(targetId);
        await ctx.unbanChatMember(targetId);
        await db.collection("warnings").deleteMany({ userId: targetId, chatId: ctx.chat.id });
        message += `\n\n🚫 *Member kicked from the group for exceeding 3 warnings.*`;
      } catch {
        message += `\n\n⚠️ Failed to kick member automatically. Check bot administration permissions.`;
      }
    }

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An unexpected error occurred while processing the warning.");
  }
}

export default {
  config: config_data,
  onStart
};
