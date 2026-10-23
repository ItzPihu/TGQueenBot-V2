import { GoogleGenAI } from "@google/genai";
import { onReplyMap } from "../bot.js";
import config from "../config.js";

export const config_data = {
  name: "ai",
  aliases: ["queen", "ask", "gemini"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Conversational AI assistant with memory"
  },
  longDescription: {
    en: "Conversational AI powered by Gemini with multi-turn memory and reply handling"
  },
  category: "AI",
  guide: {
    en: "/ai <query> - Ask AI\n/ai clear - Reset AI chat memory\nReply to any AI message to continue the conversation"
  }
};

const apiKey = "YOUR_GEMINI_API_KEY";
const genAI = new GoogleGenAI({ apiKey });

async function processQuery(ctx: any, query: string, db: any): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  if (!userId) return;

  const cleanQuery = query.trim();
  if (!cleanQuery) return;

  if (cleanQuery.toLowerCase() === "clear") {
    await db.collection("ai_history").deleteOne({ userId });
    await ctx.reply("✨ Your AI chat memory has been cleared! ✨");
    return;
  }

  const thinkingMsg = await ctx.reply("💭 Thinking...");

  try {
    const userDoc = await db.collection("ai_history").findOne({ userId });
    const history = userDoc?.history || [];

    let promptContext = cleanQuery;
    if (history.length > 0) {
      const formattedHistory = history.map((h: any) => `${h.role}: ${h.text}`).join("\n");
      promptContext = `Chat History:\n${formattedHistory}\n\nUser: ${cleanQuery}\nAI:`;
    }

    const interaction = await genAI.interactions.create({
      model: "gemini-3.8-flash",
      input: promptContext
    });

    const outputText = (interaction.output_text || "").replace(/^```[\s\S]*?```$/gm, "").trim() || "I didn't quite catch that. Could you rephrase?";

    history.push({ role: "User", text: cleanQuery });
    history.push({ role: "AI", text: outputText });

    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    await db.collection("ai_history").updateOne(
      { userId },
      { $set: { history, lastUpdated: new Date() } },
      { upsert: true }
    );

    await db.collection("users").updateOne(
      { userId },
      { $set: { username, lastActive: new Date() } },
      { upsert: true }
    );

    const editedMsg = await ctx.api.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      outputText
    );

    if (editedMsg && typeof editedMsg === "object" && "message_id" in editedMsg) {
      onReplyMap.set(editedMsg.message_id, {
        commandName: "ai",
        type: "ai_conversation",
        author: userId
      });
    }
  } catch (err: any) {
    await ctx.api.editMessageText(
      ctx.chat.id,
      thinkingMsg.message_id,
      "⚠️ An error occurred while processing your AI request."
    );
  }
}

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  const query = args.join(" ");
  if (!query) {
    await ctx.reply("💡 Please provide a question or topic. Example: `/ai What is quantum computing?`", { parse_mode: "Markdown" });
    return;
  }
  await processQuery(ctx, query, db);
}

export async function onChat({ ctx, db, message }: { ctx: any; db: any; message: any }): Promise<void> {
  const text = message?.text || "";
  if (!text || text.startsWith("/")) return;

  const match = text.match(/^(queen|ai)\b\s*(.*)/i);
  if (match) {
    const query = match[2]?.trim();
    if (query) {
      await processQuery(ctx, query, db);
    }
  }
}

export async function onReply({ ctx, Reply, db }: { ctx: any; Reply: any; db: any }): Promise<void> {
  const text = ctx.message?.text || "";
  if (!text) return;
  await processQuery(ctx, text, db);
}

export default {
  config: config_data,
  onStart,
  onChat,
  onReply
};
