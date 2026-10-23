import config from "../config.js";

export const config_data = {
  name: "kick",
  aliases: ["boot", "remove"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 1,
  shortDescription: {
    en: "Kick a user from the group"
  },
  longDescription: {
    en: "Removes a user from the group chat while leaving them eligible to rejoin with an invite"
  },
  category: "Moderation",
  guide: {
    en: "Reply to a message with /kick [reason]\nOr: /kick <user_id> [reason]\nOr: /kick @username [reason]"
  }
};

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  if (ctx.chat?.type === "private") {
    await ctx.reply("🚫 This command can only be used in groups.");
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
    const rawTarget = args[0].replace("@", "");
    if (!isNaN(Number(rawTarget))) {
      targetId = Number(rawTarget);
      targetName = `User \`${targetId}\``;
      reason = args.slice(1).join(" ") || reason;
    } else {
      await ctx.reply("💡 Please reply to the user's message or provide their numeric Telegram User ID to kick them.");
      return;
    }
  }

  if (!targetId) {
    await ctx.reply("⚠️ Usage: Reply to a user's message with `/kick [reason]` or provide a user ID: `/kick <user_id> [reason]`", { parse_mode: "Markdown" });
    return;
  }

  if (targetId === ctx.from?.id) {
    await ctx.reply("🚫 You cannot kick yourself.");
    return;
  }

  if (config.roles.owners.includes(targetId) || config.roles.admins.includes(targetId)) {
    await ctx.reply("🚫 Cannot kick a bot owner or administrator.");
    return;
  }

  try {
    const targetMember = await ctx.api.getChatMember(ctx.chat.id, targetId);
    if (["creator", "administrator"].includes(targetMember.status)) {
      await ctx.reply("🚫 You cannot kick a group administrator.");
      return;
    }

    await ctx.banChatMember(targetId);
    await ctx.unbanChatMember(targetId);

    const message = `👢 *User Kicked Successfully* 👢\n\n` +
      `👤 *Member:* ${targetName}\n` +
      `🛡️ *Moderator:* ${ctx.from?.first_name || "Admin"}\n` +
      `📝 *Reason:* ${reason}`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (err: any) {
    await ctx.reply(`❌ Failed to kick user. Ensure the bot has administrator privileges and ban rights.`);
  }
}

export default {
  config: config_data,
  onStart
};
