import axios from "axios";

export const config_data = {
  name: "duck",
  aliases: ["ddg"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Search the web with DuckDuckGo"
  },
  longDescription: {
    en: "Retrieves organic search results and links using DuckDuckGo HTML endpoint without an API key"
  },
  category: "Search",
  guide: {
    en: "/duck <search query>"
  }
};

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseDdgHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const titleRegex = /<h2[^>]*class="result__title"[\s\S]*?<a[^>]*class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  const titles: { url: string; title: string }[] = [];
  let tMatch;
  while ((tMatch = titleRegex.exec(html)) !== null && titles.length < 5) {
    let rawUrl = tMatch[1];
    if (rawUrl.includes("uddg=")) {
      const match = rawUrl.match(/uddg=([^&]+)/);
      if (match) rawUrl = decodeURIComponent(match[1]);
    }
    titles.push({
      url: rawUrl,
      title: cleanHtml(tMatch[2])
    });
  }

  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippets: string[] = [];
  let sMatch;
  while ((sMatch = snippetRegex.exec(html)) !== null && snippets.length < 5) {
    snippets.push(cleanHtml(sMatch[1]));
  }

  for (let i = 0; i < titles.length; i++) {
    results.push({
      title: titles[i].title,
      url: titles[i].url,
      snippet: snippets[i] || "No description preview available."
    });
  }

  return results;
}

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    await ctx.reply("🦆 Please provide a query to search.\nExample: `/duck best programming languages 2026`", { parse_mode: "Markdown" });
    return;
  }

  const statusMsg = await ctx.reply("🔍 Searching the web via DuckDuckGo...");

  try {
    const res = await axios.post(
      "https://html.duckduckgo.com/html/",
      `q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 10000
      }
    );

    const parsedResults = parseDdgHtml(res.data);

    if (parsedResults.length > 0) {
      let message = `🦆 *DuckDuckGo Search Results: "${query}"*\n\n`;
      parsedResults.slice(0, 3).forEach((item, idx) => {
        message += `${idx + 1}. *[${item.title}](${item.url})*\n${item.snippet}\n\n`;
      });
      message += `🔗 [More Results on DuckDuckGo](https://duckduckgo.com/?q=${encodeURIComponent(query)})`;

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true
      });
      return;
    }

    const instantApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const instantRes = await axios.get(instantApiUrl, { timeout: 8000 });
    const data = instantRes.data;

    if (data.AbstractText) {
      const message = `🦆 *DuckDuckGo Instant Answer: ${data.Heading || query}*\n\n` +
        `${data.AbstractText}\n\n` +
        (data.AbstractURL ? `🔗 *Source:* [${data.AbstractURL}](${data.AbstractURL})` : "");

      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: false
      });
      return;
    }

    const fallbackUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `🦆 *Search: ${query}*\n\nNo instant answer preview found.\n\n🔗 [Open Web Results on DuckDuckGo](${fallbackUrl})`,
      { parse_mode: "Markdown", disable_web_page_preview: false }
    );
  } catch (err: any) {
    const fallbackUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `🦆 *Search Query:* \`${query}\`\n\nDirect scraping encountered network rate limiting.\n\n🔗 [Open Results Directly on DuckDuckGo](${fallbackUrl})`,
      { parse_mode: "Markdown" }
    );
  }
}

export default {
  config: config_data,
  onStart
};
