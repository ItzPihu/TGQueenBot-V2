import { Bot, Context, InputFile } from "grammy";
import axios from "axios";
import config from "../config.js";

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

  let profilePhotoUrl = "https://cdn.popcat.xyz/popcat.png";
  try {
    const photos = await ctx.api.getUserProfilePhotos(userId, { limit: 1 });
    if (photos.total_count > 0 && photos.photos[0]?.[0]) {
      const fileId = photos.photos[0][0].file_id;
      const file = await ctx.api.getFile(fileId);
      if (file.file_path) {
        profilePhotoUrl = `https://api.telegram.org/file/bot${config.bot.token}/${file.file_path}`;
      }
    }
  } catch {}

  const caption = `Welcome to ${title}, <a href="tg://user?id=${userId}">${username}</a>! 🎉\n` +
    `You're our ${count}th member! 🌟\n\n` +
    `Feel free to introduce yourself and start chatting!`;

  try {
    const { WelcomeLeave } = await import("canvafy");
    const buffer = await new WelcomeLeave()
      .setAvatar(profilePhotoUrl)
      .setBackground("color", "#181a20")
      .setTitle("Welcome!")
      .setDescription(`Joined ${title} • Member #${count}`)
      .setBorder("#10b981")
      .setAvatarBorder("#ffffff")
      .setOverlayOpacity(0.5)
      .build();

    await ctx.replyWithPhoto(new InputFile(buffer, "welcome.png"), {
      caption,
      parse_mode: "HTML"
    });
    return;
  } catch {}

  try {
    const popcatUrl = `https://api.popcat.xyz/welcomecard?background=https%3A%2F%2Fi.imgur.com%2F4M34hi2.png&text1=Welcome&text2=${encodeURIComponent(username)}&text3=${encodeURIComponent(`Member #${count}`)}&avatar=${encodeURIComponent(profilePhotoUrl)}`;
    const res = await axios.get(popcatUrl, { responseType: "arraybuffer", timeout: 8000 });
    const buffer = Buffer.from(res.data);
    await ctx.replyWithPhoto(new InputFile(buffer, "welcome.png"), {
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
