import { Bot, Context, InputFile } from "grammy";
import axios from "axios";

export const name = "welcome";

export async function execute(
  bot: Bot<Context>,
  ctx: Context,
  groupName?: string,
  memberCount?: number
): Promise<void> {
  const newMember = ctx.message?.new_chat_members?.[0];
  if (!newMember) return;

  const username = newMember.username || newMember.first_name || "New member";
  const userId = newMember.id;
  const title = groupName || ctx.chat?.title || "our group";
  const count = memberCount ?? (await ctx.getChatMemberCount().catch(() => 0));

  const caption = `Welcome to ${title}, <a href="tg://user?id=${userId}">${username}</a>! 🎉\n` +
    `You're our ${count}th member! 🌟\n\n` +
    `We're excited to have you join us. Feel free to introduce yourself and start chatting!`;

  try {
    const apiUrl = `https://api.nexalo.xyz/welcome_v2?api=na_T51VHMGBMZJO7S2B&name=${encodeURIComponent(username)}&text=${encodeURIComponent(`Welcome to ${title}`)}`;
    const res = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 8000 });
    const buffer = Buffer.from(res.data);
    await ctx.replyWithPhoto(new InputFile(buffer, "welcome.jpg"), {
      caption,
      parse_mode: "HTML"
    });
  } catch {
    await ctx.reply(caption, { parse_mode: "HTML" });
  }
}

export default {
  name,
  execute
};
