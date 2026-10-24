import axios from "axios";
import yts from "yt-search";
import { InputFile } from "grammy";

export const config_data = {
  name: "play",
  aliases: ["sing", "music", "yt", "song"],
  version: "2.2.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 0,
  shortDescription: {
    en: "Search and play YouTube audio or video inline"
  },
  longDescription: {
    en: "Search and listen any music from YouTube & Youtube Music"
  },
  category: "Media",
  guide: {
    en: "/play <song name or URL> [audio|video] [quality]\nExamples:\n• /play let me love you\n• /play let me love you video 720p"
  }
};

const YOUTUBE_API = {
  BASE_URL: "https://meow-dl.onrender.com",
  ENDPOINT: "/yt"
};

function isValidVideoID(value: string): boolean {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{11}$/.test(value);
}

function extractYouTubeID(value: string): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const parsed = new URL(input);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      const videoID = parsed.pathname.split("/").filter(Boolean)[0];
      return isValidVideoID(videoID) ? videoID : null;
    }

    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostname)) {
      const queryID = parsed.searchParams.get("v");
      if (queryID && isValidVideoID(queryID)) return queryID;

      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0]) && isValidVideoID(parts[1])) {
        return parts[1];
      }
    }
  } catch {}
  return null;
}

function isYouTubeURL(value: string): boolean {
  return Boolean(extractYouTubeID(value));
}

function sanitizeFileName(value: string): string {
  const fileName = String(value || "youtube_media")
    .replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return fileName || "youtube_media";
}

function formatError(error: any): string {
  const errorMessage = error?.message || String(error) || "Unknown error";
  if (/timeout|timed out|econnaborted/i.test(errorMessage)) return "Request timed out. Please try again.";
  if (/403|forbidden|access denied/i.test(errorMessage)) return "Media URL expired or access denied.";
  if (/404|not found/i.test(errorMessage)) return "Video or media file not found.";
  if (/429|rate.?limit|too many requests/i.test(errorMessage)) return "API is rate-limited. Try again later.";
  if (/500|502|503|504|unavailable/i.test(errorMessage)) return "Service is temporarily unavailable.";
  return errorMessage.slice(0, 400);
}

async function resolveVideo(query: string): Promise<any> {
  const directVideoID = extractYouTubeID(query);

  if (directVideoID) {
    return {
      videoID: directVideoID,
      url: `https://www.youtube.com/watch?v=${directVideoID}`,
      shortUrl: `https://youtu.be/${directVideoID}`,
      title: "YouTube Media",
      author: "YouTube",
      duration: undefined
    };
  }

  if (/^https?:\/\//i.test(query)) {
    throw new Error("Only valid YouTube URLs are supported.");
  }

  const searchResult = await (yts as any)(query);
  const video = searchResult?.videos?.[0];

  if (!video) {
    throw new Error(`No videos found for "${query}".`);
  }

  return {
    videoID: video.videoId,
    url: video.url,
    shortUrl: `https://youtu.be/${video.videoId}`,
    title: video.title || "YouTube Media",
    author: video.author?.name || "YouTube",
    duration: typeof video.seconds === "number" && video.seconds > 0 ? video.seconds : undefined
  };
}

async function fetchYouTubeMedia(videoUrl: string, mediaType: string, requestedQuality: string | null): Promise<any> {
  const format = mediaType === "audio" ? "m4a" : "mp4";
  const requestUrl = `${YOUTUBE_API.BASE_URL}${YOUTUBE_API.ENDPOINT}?url=${encodeURIComponent(videoUrl)}&format=${format}`;

  try {
    const { data } = await axios.get(requestUrl, { timeout: 30000 });

    if (!data || (data.status !== "ok" && !data.success)) {
      throw new Error(data?.message || "API could not process this video.");
    }

    if (mediaType === "audio") {
      const link = data.downloadLink || data.url || data.link;
      if (!link) throw new Error("No audio download link found.");
      return {
        title: data.title || "YouTube Audio",
        author: data.channel || "Unknown Channel",
        mediaURL: link,
        extension: "mp3",
        quality: "Audio",
        size: data.size || "Standard"
      };
    }

    const mediaList = data.media;
    if (!mediaList || !Array.isArray(mediaList) || mediaList.length === 0) {
      const direct = data.downloadLink || data.url || data.link;
      if (direct) {
        return {
          title: data.title || "YouTube Video",
          author: data.channel || "Unknown Channel",
          mediaURL: direct,
          extension: "mp4",
          quality: requestedQuality || "720p",
          size: data.size || "Standard"
        };
      }
      throw new Error("No video streams found.");
    }

    let selectedMedia = requestedQuality
      ? mediaList.find((m: any) => m.quality === requestedQuality)
      : mediaList.find((m: any) => m.quality === "720p");

    if (!selectedMedia) selectedMedia = mediaList[0];

    return {
      title: data.title || "YouTube Video",
      author: data.channel || "Unknown Channel",
      mediaURL: selectedMedia.url,
      extension: "mp4",
      quality: selectedMedia.quality,
      size: selectedMedia.size || "Standard"
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || "Failed to fetch media links.");
  }
}

async function downloadMediaBuffer(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 90000,
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength: 50 * 1024 * 1024,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }
  });
  return Buffer.from(response.data);
}

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  let mediaType = "audio";
  let selectedQuality: string | null = null;
  const queryArgs: string[] = [];

  for (const arg of args) {
    const lower = arg.toLowerCase();
    if (["audio", "mp3", "m4a", "-a"].includes(lower)) {
      mediaType = "audio";
    } else if (["video", "mp4", "-v"].includes(lower)) {
      mediaType = "video";
    } else if (/^(1080p|720p|480p|360p|240p|144p)$/.test(lower)) {
      selectedQuality = lower;
      mediaType = "video";
    } else {
      queryArgs.push(arg);
    }
  }

  const query = queryArgs.join(" ").trim();

  if (!query) {
    await ctx.reply("❌ Please enter a song title or YouTube link.\n\nExamples:\n• `/play let me love you`\n• `/play let me love you video 720p`", { parse_mode: "Markdown" });
    return;
  }

  const initialText = isYouTubeURL(query) ? `⏳ Processing ${mediaType}...` : `🔎 Searching for "${query}"...`;
  const processingMsg = await ctx.reply(initialText);

  try {
    const video = await resolveVideo(query);

    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      `⬇️ Extracting ${mediaType}...\n📀 *${video.title}*\n🔗 [Open on YouTube](${video.shortUrl})`,
      { parse_mode: "Markdown" }
    );

    const mediaInfo = await fetchYouTubeMedia(video.url, mediaType, selectedQuality);
    const finalTitle = mediaInfo.title !== "YouTube Audio" && mediaInfo.title !== "YouTube Video" ? mediaInfo.title : video.title;
    const finalAuthor = mediaInfo.author !== "Unknown Channel" ? mediaInfo.author : video.author;
    const fileName = `${sanitizeFileName(finalTitle)}.${mediaInfo.extension}`;
    const caption = `${mediaType === "audio" ? "🎶" : "🎬"} *${finalTitle}*\n📺 *Channel:* ${finalAuthor}\n📦 *Quality:* \`${mediaInfo.quality}\` | Size: \`${mediaInfo.size}\`\n🔗 [YouTube Link](${video.shortUrl})`;

    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      `📥 Downloading ${mediaType}...\n📀 *${finalTitle}*\n📦 Quality: \`${mediaInfo.quality}\` | Size: \`${mediaInfo.size}\``,
      { parse_mode: "Markdown" }
    );

    const mediaBuffer = await downloadMediaBuffer(mediaInfo.mediaURL);

    if (mediaType === "audio") {
      await ctx.replyWithAudio(new InputFile(mediaBuffer, fileName), {
        caption,
        title: finalTitle,
        performer: finalAuthor,
        duration: video.duration,
        parse_mode: "Markdown"
      });
    } else {
      await ctx.replyWithVideo(new InputFile(mediaBuffer, fileName), {
        caption,
        duration: video.duration,
        supports_streaming: true,
        parse_mode: "Markdown"
      });
    }

    await ctx.api.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});
  } catch (error: any) {
    const errorMessage = `❌ ${formatError(error)}`;
    await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, errorMessage);
  }
}

export default {
  config: config_data,
  onStart
};
