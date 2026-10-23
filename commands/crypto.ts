import axios from "axios";

export const config_data = {
  name: "crypto",
  aliases: [],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Track live cryptocurrency prices and trends"
  },
  longDescription: {
    en: "Fetches live price, 24-hour price change percentage, and market valuation from CoinGecko"
  },
  category: "Finance",
  guide: {
    en: "/crypto <coin or ticker>\nExamples: /crypto btc, /crypto sol, /crypto doge"
  }
};

const tickerMap: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  doge: "dogecoin",
  xrp: "ripple",
  ada: "cardano",
  bnb: "binancecoin",
  trx: "tron",
  avax: "avalanche-2",
  dot: "polkadot",
  link: "chainlink",
  shib: "shiba-inu",
  ton: "the-open-network",
  matic: "matic-network",
  near: "near"
};

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const rawInput = (args[0] || "").toLowerCase().trim();
  if (!rawInput) {
    await ctx.reply("📈 Please provide a cryptocurrency name or symbol.\nExample: `/crypto btc` or `/crypto solana`", { parse_mode: "Markdown" });
    return;
  }

  const coinId = tickerMap[rawInput] || rawInput;
  const statusMsg = await ctx.reply(`🔍 Fetching market valuation for *${coinId.toUpperCase()}*...`, { parse_mode: "Markdown" });

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd,inr&include_24hr_change=true&include_24hr_vol=true`;
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data[coinId];

    if (!data) {
      await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `❌ Cryptocurrency \`${rawInput}\` was not found. Try searching by full name (e.g. \`bitcoin\`, \`solana\`).`);
      return;
    }

    const priceUsd = data.usd?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 }) || "0.00";
    const priceInr = data.inr?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) || "0.00";
    const change24h = data.usd_24h_change ?? 0;
    const isPositive = change24h >= 0;
    const trendIcon = isPositive ? "🟢 ↗️" : "🔴 ↘️";
    const changeFormatted = `${isPositive ? "+" : ""}${change24h.toFixed(2)}%`;
    const volUsd = data.usd_24h_vol ? `$${Math.round(data.usd_24h_vol).toLocaleString()}` : "N/A";

    const message = `🪙 *${coinId.toUpperCase()} Market Overview* 🪙\n\n` +
      `💵 *Price (USD):* \`$${priceUsd}\`\n` +
      `₹ *Price (INR):* \`₹${priceInr}\`\n` +
      `${trendIcon} *24h Fluctuation:* \`${changeFormatted}\`\n` +
      `📊 *24h Volume:* \`${volUsd}\`\n\n` +
      `🌐 *Data Source:* CoinGecko Global Index`;

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, message, {
      parse_mode: "Markdown"
    });
  } catch (err: any) {
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, "⚠️ Failed to fetch crypto pricing from CoinGecko API. Rate limit may have been reached.");
  }
}

export default {
  config: config_data,
  onStart
};
