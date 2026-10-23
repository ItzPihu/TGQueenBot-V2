import axios from "axios";
import yts from "yt-search";

export const config_data = {
  name: "sing",
  aliases: ["song", "music", "play"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 0,
  shortDescription: {
    en: "Search and play songs from YouTube"
  },
  longDescription: {
    en: "Finds music tracks via YouTube search or link and returns audio tracks"
  },
  category: "Media",
  guide: {
    en: "/sing <song name or YouTube URL>"
  }
};

function extractYouTubeID(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      const q = parsed.searchParams.get("v");
      if (q) return q;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0]) && parts[1]) {
        return parts[1];
      }
    }
  } catch {}
  return null;
}

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const query = args.join(" ").trim();
  if (!query) {
    await ctx.reply("🎵 Please provide a song title or YouTube link.\nExample: `/sing Starboy The Weeknd`", { parse_mode: "Markdown" });
    return;
  }

  const statusMsg = await ctx.reply("🔍 Searching YouTube for track...");

  try {
    let videoUrl = "";
    let videoTitle = "";
    let videoAuthor = "";
    let duration = "";

    const directId = extractYouTubeID(query);
    if (directId) {
      videoUrl = `https://www.youtube.com/watch?v=${directId}`;
      videoTitle = "YouTube Audio";
    } else {
      const searchResult = await (yts as any)(query);
      const first = searchResult?.videos?.[0];
      if (!first) {
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `❌ No music results found for "${query}".`);
        return;
      }
      videoUrl = first.url;
      videoTitle = first.title;
      videoAuthor = first.author?.name || "Unknown Artist";
      duration = first.timestamp || "";
    }

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `⏳ Found *${videoTitle}*\nFetching audio stream...`, { parse_mode: "Markdown" });

    const apiUrl = `https://meow-dl.onrender.com/yt?url=${encodeURIComponent(videoUrl)}&format=m4a`;
    const res = await axios.get(apiUrl, { timeout: 30000 });
    const data = res.data;

    const downloadLink = data?.downloadLink || data?.url || data?.link;
    if (!downloadLink) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `🎶 *Track Found:* [${videoTitle}](${videoUrl})\n\n⚠️ Direct audio streaming link is currently unavailable for this track.`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await ctx.replyWithAudio(downloadLink, {
      title: videoTitle,
      performer: videoAuthor || "YouTube",
      caption: `🎧 *${videoTitle}*\n👤 *Artist:* ${videoAuthor}\n⏱️ *Duration:* ${duration}\n🔗 [YouTube Link](${videoUrl})`,
      parse_mode: "Markdown"
    });

    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
  } catch (err: any) {
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, "⚠️ Failed to fetch or process audio for this song.");
  }
}

export default {
  config: config_data,
  onStart
};
