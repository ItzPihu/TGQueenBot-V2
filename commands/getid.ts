export const config_data = {
  name: "getid",
  aliases: ["id", "uid", "myid", "chatid"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 2,
  role: 0,
  shortDescription: {
    en: "Get Telegram user and chat identifiers"
  },
  longDescription: {
    en: "Retrieves sender user ID, current chat ID, and replied member metadata"
  },
  category: "Utility",
  guide: {
    en: "/getid\nReply to any message with /getid"
  }
};

export async function onStart({ ctx }: { ctx: any }): Promise<void> {
  const currentChatId = ctx.chat?.id;
  const currentChatTitle = ctx.chat?.title || ctx.chat?.type;
  const senderId = ctx.from?.id;
  const senderUser = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "User";

  if (ctx.message?.reply_to_message?.from) {
    const repliedUser = ctx.message.reply_to_message.from;
    const repliedUsername = repliedUser.username ? `@${repliedUser.username}` : repliedUser.first_name || "User";
    const repliedMsgId = ctx.message.reply_to_message.message_id;

    const message = `🆔 *Telegram Identifiers (Target Reply)* 🆔\n\n` +
      `👤 *Target User:* ${repliedUsername}\n` +
      `🔢 *Target User ID:* \`${repliedUser.id}\`\n` +
      `💬 *Chat Title:* ${currentChatTitle}\n` +
      `🏷️ *Chat ID:* \`${currentChatId}\`\n` +
      `📩 *Message ID:* \`${repliedMsgId}\`\n\n` +
      `🔍 *Requested by:* ${senderUser} (\`${senderId}\`)`;

    await ctx.reply(message, { parse_mode: "Markdown" });
    return;
  }

  const message = `🆔 *Telegram Identifiers* 🆔\n\n` +
    `👤 *Your Username:* ${senderUser}\n` +
    `🔢 *Your User ID:* \`${senderId}\`\n` +
    `💬 *Chat Title:* ${currentChatTitle}\n` +
    `🏷️ *Chat ID:* \`${currentChatId}\`\n` +
    `🌐 *Chat Type:* \`${ctx.chat?.type}\``;

  await ctx.reply(message, { parse_mode: "Markdown" });
}

export default {
  config: config_data,
  onStart
};
