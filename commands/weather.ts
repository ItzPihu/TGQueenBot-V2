import axios from "axios";

export const config_data = {
  name: "weather",
  aliases: ["forecast", "temp", "climate"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Get live weather report for any city"
  },
  longDescription: {
    en: "Retrieves temperature, conditions, humidity, and wind speed for any location worldwide"
  },
  category: "Utility",
  guide: {
    en: "/weather <city name>"
  }
};

const OPENWEATHER_KEY = "YOUR_OPENWEATHER_KEY";

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const city = args.join(" ").trim();
  if (!city) {
    await ctx.reply("⛅ Please specify a city name.\nExample: `/weather Tokyo` or `/weather London`", { parse_mode: "Markdown" });
    return;
  }

  const statusMsg = await ctx.reply(`🔍 Fetching weather conditions for *${city}*...`, { parse_mode: "Markdown" });

  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_KEY}&units=metric`;
    const res = await axios.get(apiUrl, { timeout: 10000 });
    const data = res.data;

    const cityName = data.name;
    const country = data.sys?.country || "";
    const temp = Math.round(data.main?.temp ?? 0);
    const feelsLike = Math.round(data.main?.feels_like ?? 0);
    const humidity = data.main?.humidity ?? 0;
    const windSpeed = (data.wind?.speed ?? 0).toFixed(1);
    const description = data.weather?.[0]?.description || "Clear sky";
    const condition = data.weather?.[0]?.main || "Clear";

    let icon = "☀️";
    if (/cloud/i.test(condition)) icon = "☁️";
    else if (/rain/i.test(condition)) icon = "🌧️";
    else if (/thunderstorm/i.test(condition)) icon = "⛈️";
    else if (/snow/i.test(condition)) icon = "❄️";
    else if (/mist|fog|haze/i.test(condition)) icon = "🌫️";

    const message = `🌦️ *Weather Forecast: ${cityName}, ${country}* 🌦️\n\n` +
      `${icon} *Condition:* ${description.toUpperCase()}\n` +
      `🌡️ *Temperature:* \`${temp}°C\` (Feels like \`${feelsLike}°C\`)\n` +
      `💧 *Humidity:* \`${humidity}%\`\n` +
      `💨 *Wind Velocity:* \`${windSpeed} m/s\`\n` +
      `🧭 *Pressure:* \`${data.main?.pressure || 1013} hPa\`\n\n` +
      `📍 *Coordinates:* \`${data.coord?.lat}, ${data.coord?.lon}\``;

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, message, {
      parse_mode: "Markdown"
    });
  } catch (err: any) {
    try {
      const wttrUrl = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
      const fallbackRes = await axios.get(wttrUrl, { timeout: 8000 });
      const current = fallbackRes.data?.current_condition?.[0];
      const area = fallbackRes.data?.nearest_area?.[0];

      if (current && area) {
        const areaName = area.areaName?.[0]?.value || city;
        const country = area.country?.[0]?.value || "";
        const temp = current.temp_C;
        const feels = current.FeelsLikeC;
        const desc = current.weatherDesc?.[0]?.value || "Clear";
        const hum = current.humidity;
        const wind = current.windspeedKmph;

        const msg = `🌦️ *Weather Report: ${areaName}, ${country}*\n\n` +
          `🌤️ *Condition:* ${desc}\n` +
          `🌡️ *Temperature:* \`${temp}°C\` (Feels like \`${feels}°C\`)\n` +
          `💧 *Humidity:* \`${hum}%\`\n` +
          `💨 *Wind Speed:* \`${wind} km/h\``;

        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, { parse_mode: "Markdown" });
        return;
      }
    } catch {}

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `❌ Could not find weather details for "${city}". Please check spelling.`);
  }
}

export default {
  config: config_data,
  onStart
};
