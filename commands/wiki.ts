import axios from "axios";

export const config_data = {
  name: "wiki",
  aliases: ["wikipedia"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Search Wikipedia articles"
  },
  longDescription: {
    en: "Fetches official Wikipedia article summaries, page links, and thumbnail images"
  },
  category: "Search",
  guide: {
    en: "/wiki <search topic>"
  }
};

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    await ctx.reply("📚 Please provide a topic to search on Wikipedia.\nExample: `/wiki Alan Turing`", { parse_mode: "Markdown" });
    return;
  }

  const statusMsg = await ctx.reply("🔍 Searching Wikipedia database...");

  try {
    const formattedTopic = query.replace(/\s+/g, "_");
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedTopic)}`;

    const res = await axios.get(summaryUrl, {
      headers: {
        "User-Agent": "TGQueenBot-V2/2.0 (https://github.com/PriyanshiKaur/TGQueenBot-V2)"
      },
      timeout: 10000
    });

    const data = res.data;
    if (data.type === "disambiguation") {
      const pageUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTopic)}`;
      const message = `📚 *Wikipedia Disambiguation: ${data.title}*\n\n` +
        `${data.extract || "This term refers to multiple subjects."}\n\n` +
        `🔗 [Explore Options on Wikipedia](${pageUrl})`;

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, message, {
        parse_mode: "Markdown"
      });
      return;
    }

    const title = data.title || query;
    const extract = data.extract || "No article description found.";
    const pageUrl = data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(formattedTopic)}`;
    const thumbnail = data.thumbnail?.source;

    const caption = `📚 *${title}*\n\n` +
      `${extract}\n\n` +
      `🔗 [Read Full Article on Wikipedia](${pageUrl})`;

    if (thumbnail) {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
      await ctx.replyWithPhoto(thumbnail, {
        caption,
        parse_mode: "Markdown"
      });
      return;
    }

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, caption, {
      parse_mode: "Markdown"
    });
  } catch (err: any) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`;
      const searchRes = await axios.get(searchUrl, { timeout: 8000 });
      const [searchTerm, titles, descriptions, urls] = searchRes.data;

      if (titles && titles.length > 0) {
        const foundTitle = titles[0];
        const desc = descriptions[0] || "Click the link to read more.";
        const url = urls[0];

        const msg = `📚 *${foundTitle}*\n\n${desc}\n\n🔗 [Open on Wikipedia](${url})`;
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, { parse_mode: "Markdown" });
        return;
      }
    } catch {}

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `❌ No Wikipedia articles found matching "${query}".`);
  }
}

export default {
  config: config_data,
  onStart
};
