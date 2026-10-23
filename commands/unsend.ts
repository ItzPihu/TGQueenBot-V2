import config from "../config.js";

export const config_data = {
  name: "unsend",
  aliases: ["del", "delete", "rm"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 2,
  role: 0,
  shortDescription: {
    en: "Delete bot messages via command or emoji reaction"
  },
  longDescription: {
    en: "Deletes bot messages when replied with /unsend, or automatically when sender reacts with thumbs-up 👍"
  },
  category: "Utility",
  guide: {
    en: "Reply to bot message: /unsend\nToggle reaction delete: /unsend react on | off | status"
  }
};

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  const sub = (args[0] || "").toLowerCase();

  if (sub === "react") {
    const toggle = (args[1] || "").toLowerCase();
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    if (toggle === "on" || toggle === "enable") {
      await db.collection("groups").updateOne(
        { groupId: chatId },
        { $set: { reactToDelete: true } },
        { upsert: true }
      );
      await ctx.reply("✅ *Thumbs-up (👍) Reaction Delete is now ENABLED!*\nReacting 👍 to bot messages will delete them.", { parse_mode: "Markdown" });
      return;
    }

    if (toggle === "off" || toggle === "disable") {
      await db.collection("groups").updateOne(
        { groupId: chatId },
        { $set: { reactToDelete: false } },
        { upsert: true }
      );
      await ctx.reply("❌ *Thumbs-up (👍) Reaction Delete is now DISABLED.*", { parse_mode: "Markdown" });
      return;
    }

    const groupDoc = await db.collection("groups").findOne({ groupId: chatId });
    const isEnabled = groupDoc?.reactToDelete !== false;
    await ctx.reply(`ℹ️ *Reaction Delete Status:* ${isEnabled ? "🟢 Enabled" : "🔴 Disabled"}\nTo change, use: \`/unsend react on\` or \`/unsend react off\``, { parse_mode: "Markdown" });
    return;
  }

  const repliedMsg = ctx.message?.reply_to_message;
  if (!repliedMsg) {
    await ctx.reply("⚠️ Please reply to the bot message you wish to delete with `/unsend`.", { parse_mode: "Markdown" });
    return;
  }

  const botInfo = await ctx.api.getMe();
  if (repliedMsg.from?.id !== botInfo.id) {
    await ctx.reply("🚫 I can only delete messages sent by myself.");
    return;
  }

  try {
    await ctx.api.deleteMessage(ctx.chat.id, repliedMsg.message_id);
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id).catch(() => {});
  } catch (err: any) {
    await ctx.reply("⚠️ Could not delete message. It may be older than 48 hours or the bot lacks deletion rights.");
  }
}

export async function onReaction({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const reactionUpdate = ctx.messageReaction;
  if (!reactionUpdate) return;

  const chatId = reactionUpdate.chat?.id;
  const messageId = reactionUpdate.message_id;
  if (!chatId || !messageId) return;

  const groupDoc = await db.collection("groups").findOne({ groupId: chatId });
  const isEnabled = groupDoc ? groupDoc.reactToDelete !== false : (config.features as any)?.reactToDelete !== false;
  if (!isEnabled) return;

  const newReactions = reactionUpdate.new_reaction || [];
  const hasThumb = newReactions.some((r: any) => r.type === "emoji" && typeof r.emoji === "string" && r.emoji.startsWith("👍"));
  if (!hasThumb) return;

  try {
    await ctx.api.deleteMessage(chatId, messageId);
  } catch {}
}

export default {
  config: config_data,
  onStart,
  onReaction
};
