import axios from "axios";

export const config_data = {
  name: "translate",
  aliases: ["tr", "trans"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Translate text to any language"
  },
  longDescription: {
    en: "Translates text or replied messages to any language using language codes like en, es, hi, ta, bn"
  },
  category: "Utility",
  guide: {
    en: "/translate <lang_code> <text>\nReply to a message with: /translate <lang_code>"
  }
};

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  let targetLang = "en";
  let textToTranslate = "";

  if (ctx.message?.reply_to_message?.text) {
    targetLang = args[0] ? args[0].toLowerCase() : "en";
    textToTranslate = ctx.message.reply_to_message.text;
  } else if (args.length >= 2) {
    targetLang = args[0].toLowerCase();
    textToTranslate = args.slice(1).join(" ");
  } else if (args.length === 1 && !ctx.message?.reply_to_message) {
    await ctx.reply("⚠️ Please provide the text to translate, or reply to a message.\nUsage: `/translate en Bonjour le monde`", { parse_mode: "Markdown" });
    return;
  } else {
    await ctx.reply("⚠️ Usage: `/translate <lang_code> <text>` or reply to a message with `/translate <lang_code>`", { parse_mode: "Markdown" });
    return;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;

    if (!data || !Array.isArray(data[0])) {
      await ctx.reply("❌ Unable to translate the provided text.");
      return;
    }

    const translatedText = data[0].map((item: any) => item[0]).join("");
    const detectedLang = data[2] || "auto";

    const message = `🌐 *Language Translation* 🌐\n\n` +
      `🔤 *Source Language:* \`${detectedLang.toUpperCase()}\`\n` +
      `🎯 *Target Language:* \`${targetLang.toUpperCase()}\`\n\n` +
      `📝 *Original:*\n${textToTranslate}\n\n` +
      `✨ *Translation:*\n${translatedText}`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch (err: any) {
    await ctx.reply("⚠️ An error occurred during translation. Ensure you provided a valid 2-letter language code (e.g. `en`, `es`, `hi`, `ta`, `fr`).");
  }
}

export default {
  config: config_data,
  onStart
};
