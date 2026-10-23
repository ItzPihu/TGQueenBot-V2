import { Bot, Context, InputFile } from "grammy";
import axios from "axios";
import config from "../config.js";

export const name = "goodbye";

export async function execute(
  bot: Bot<Context>,
  ctx: Context,
  groupName?: string,
  memberCount?: number
): Promise<void> {
  const leftMember = ctx.message?.left_chat_member;
  if (!leftMember) return;

  const username = leftMember.username || leftMember.first_name || "Member";
  const userId = leftMember.id;
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

  const caption = `Goodbye, <a href="tg://user?id=${userId}">${username}</a>! 👋\n` +
    `We're sad to see you leave ${title}. You were member #${count + 1}.\n\n` +
    `Wishing you the very best ahead!`;

  try {
    const { WelcomeLeave } = await import("canvafy");
    const buffer = await new WelcomeLeave()
      .setAvatar(profilePhotoUrl)
      .setBackground("color", "#181a20")
      .setTitle("Goodbye!")
      .setDescription(`Left ${title} • Member #${count + 1}`)
      .setBorder("#f43f5e")
      .setAvatarBorder("#ffffff")
      .setOverlayOpacity(0.5)
      .build();

    await ctx.replyWithPhoto(new InputFile(buffer, "goodbye.png"), {
      caption,
      parse_mode: "HTML"
    });
    return;
  } catch {}

  try {
    const popcatUrl = `https://api.popcat.xyz/welcomecard?background=https%3A%2F%2Fi.imgur.com%2F4M34hi2.png&text1=Goodbye&text2=${encodeURIComponent(username)}&text3=${encodeURIComponent(`Member #${count + 1}`)}&avatar=${encodeURIComponent(profilePhotoUrl)}`;
    const res = await axios.get(popcatUrl, { responseType: "arraybuffer", timeout: 8000 });
    const buffer = Buffer.from(res.data);
    await ctx.replyWithPhoto(new InputFile(buffer, "goodbye.png"), {
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
