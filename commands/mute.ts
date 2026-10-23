import config from "../config.js";

export const config_data = {
  name: "mute",
  aliases: ["silence", "shutup"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 1,
  shortDescription: {
    en: "Mute a member in the group"
  },
  longDescription: {
    en: "Restricts messaging permissions for a member for a specified duration like 30m, 2h, or 1d"
  },
  category: "Moderation",
  guide: {
    en: "Reply to message: /mute [duration] [reason]\nOr: /mute <user_id> [duration] [reason]"
  }
};

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([mhd])$/i);
  if (!match) return 3600;
  const val = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "m": return val * 60;
    case "h": return val * 3600;
    case "d": return val * 86400;
    default: return 3600;
  }
}

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  if (ctx.chat?.type === "private") {
    await ctx.reply("🚫 This command can only be used in groups.");
    return;
  }

  let targetId: number | null = null;
  let targetName: string = "";
  let durationStr = "1h";
  let reason = "No reason provided";

  if (ctx.message?.reply_to_message?.from) {
    const from = ctx.message.reply_to_message.from;
    targetId = from.id;
    targetName = from.username ? `@${from.username}` : from.first_name || "User";
    if (args[0] && /^(\d+)([mhd])$/i.test(args[0])) {
      durationStr = args[0];
      reason = args.slice(1).join(" ") || reason;
    } else if (args.length > 0) {
      reason = args.join(" ");
    }
  } else if (args[0]) {
    const clean = args[0].replace("@", "");
    if (!isNaN(Number(clean))) {
      targetId = Number(clean);
      targetName = `User \`${targetId}\``;
      if (args[1] && /^(\d+)([mhd])$/i.test(args[1])) {
        durationStr = args[1];
        reason = args.slice(2).join(" ") || reason;
      } else {
        reason = args.slice(1).join(" ") || reason;
      }
    } else {
      await ctx.reply("💡 Please reply to the user's message or provide their numeric Telegram User ID to mute them.");
      return;
    }
  }

  if (!targetId) {
    await ctx.reply("⚠️ Usage: Reply to a user with `/mute [duration] [reason]`\nDurations: `30m`, `1h`, `1d`", { parse_mode: "Markdown" });
    return;
  }

  if (targetId === ctx.from?.id) {
    await ctx.reply("🚫 You cannot mute yourself.");
    return;
  }

  if (config.roles.owners.includes(targetId) || config.roles.admins.includes(targetId)) {
    await ctx.reply("🚫 Cannot mute a bot owner or administrator.");
    return;
  }

  try {
    const targetMember = await ctx.api.getChatMember(ctx.chat.id, targetId);
    if (["creator", "administrator"].includes(targetMember.status)) {
      await ctx.reply("🚫 You cannot mute a group administrator.");
      return;
    }

    const durationSec = parseDuration(durationStr);
    const untilDate = Math.floor(Date.now() / 1000) + durationSec;

    await ctx.api.restrictChatMember(
      ctx.chat.id,
      targetId,
      { can_send_messages: false },
      { until_date: untilDate }
    );

    const message = `🔇 *User Muted Successfully* 🔇\n\n` +
      `👤 *Member:* ${targetName}\n` +
      `⏱️ *Duration:* ${durationStr}\n` +
      `🛡️ *Moderator:* ${ctx.from?.first_name || "Admin"}\n` +
      `📝 *Reason:* ${reason}`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (err: any) {
    await ctx.reply("❌ Failed to mute user. Ensure the bot is an administrator with restrict members permissions.");
  }
}

export default {
  config: config_data,
  onStart
};
