import axios from "axios";

export const config_data = {
  name: "couple",
  aliases: ["match", "lovematch", "couples"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 0,
  shortDescription: {
    en: "Find today's lucky couple or fetch couple GIF"
  },
  longDescription: {
    en: "Picks two members from the group as the couple of the day, or fetches anime couple media"
  },
  category: "Fun",
  guide: {
    en: "/couple"
  }
};

export async function onStart({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";

  if (isGroup) {
    try {
      const users = await db.collection("users")
        .find({ groupId: ctx.chat.id })
        .limit(50)
        .toArray();

      if (users.length >= 2) {
        const shuffled = [...users].sort(() => 0.5 - Math.random());
        const first = shuffled[0];
        const second = shuffled[1];

        const firstName = first.username ? `@${first.username}` : (first.firstName || `User \`${first.userId}\``);
        const secondName = second.username ? `@${second.username}` : (second.firstName || `User \`${second.userId}\``);
        const loveScore = Math.floor(Math.random() * 41) + 60;

        let gifUrl = "";
        try {
          const res = await axios.get("https://api.waifu.pics/sfw/hug", { timeout: 6000 });
          gifUrl = res.data?.url || "";
        } catch {}

        const caption = `💍 *Couple of the Day in ${ctx.chat.title}* 💍\n\n` +
          `❤️ *Partner 1:* ${firstName}\n` +
          `💙 *Partner 2:* ${secondName}\n` +
          `✨ *Compatibility:* \`${loveScore}%\`\n\n` +
          `May this union bring warmth, laughter, and endless good vibes to the chat! 🎉`;

        if (gifUrl) {
          await ctx.replyWithAnimation(gifUrl, {
            caption,
            parse_mode: "Markdown"
          });
          return;
        }

        await ctx.reply(caption, { parse_mode: "Markdown" });
        return;
      }
    } catch {}
  }

  try {
    const res = await axios.get("https://nekos.best/api/v2/hug", { timeout: 6000 });
    const result = res.data?.results?.[0];

    if (result?.url) {
      await ctx.replyWithAnimation(result.url, {
        caption: `💑 *Cute Couple Hug Moments* 💕\nSource: [${result.anime_name || "Anime"}]`,
        parse_mode: "Markdown"
      });
      return;
    }
  } catch {}

  try {
    const res = await axios.get("https://api.waifu.pics/sfw/hug", { timeout: 6000 });
    if (res.data?.url) {
      await ctx.replyWithAnimation(res.data.url, {
        caption: "💑 *Here is a sweet couple moment for you!* 💕"
      });
      return;
    }
  } catch {}

  await ctx.reply("💑 Wishing all the lovely couples in our community endless happiness and joy! 💕");
}

export default {
  config: config_data,
  onStart
};
