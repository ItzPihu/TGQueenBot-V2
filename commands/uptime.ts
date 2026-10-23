import os from "os";
import process from "process";
import config from "../config.js";
import { isLocalDatabase } from "../db.js";
import { commands } from "../bot.js";

export const config_data = {
  name: "uptime",
  aliases: ["up", "status", "botinfo", "ping"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Show bot uptime and server system telemetry"
  },
  longDescription: {
    en: "Displays live server performance, RAM, CPU load, runtime environment, and bot uptime"
  },
  category: "System",
  guide: {
    en: "/uptime"
  }
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 MB";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

export async function onStart({ ctx }: { ctx: any }): Promise<void> {
  const startTime = Date.now();
  const uptimeSec = process.uptime();
  const uptimeFormatted = formatDuration(uptimeSec);

  const memUsage = process.memoryUsage();
  const totalRam = os.totalmem();
  const freeRam = os.freemem();
  const usedRam = totalRam - freeRam;

  const isBun = typeof (globalThis as any).Bun !== "undefined";
  const runtimeVersion = isBun ? `Bun ${(globalThis as any).Bun.version}` : `Node ${process.version}`;

  const cpuCount = os.cpus().length;
  const cpuModel = os.cpus()[0]?.model || "Generic CPU";
  const osType = `${os.type()} ${os.arch()}`;
  const dbStatus = isLocalDatabase() ? "Local JSON DB" : "MongoDB Atlas";

  const ping = Date.now() - startTime;

  const message = `👑 *${config.bot.name} System Telemetry* 👑\n\n` +
    `⚡ *Author:* ${config.bot.author}\n` +
    `📦 *Version:* \`${config.bot.version}\`\n` +
    `🚀 *Runtime:* \`${runtimeVersion}\`\n` +
    `🗄️ *Database:* \`${dbStatus}\`\n` +
    `📡 *Bot Latency:* \`${ping}ms\`\n` +
    `📜 *Commands Loaded:* \`${commands.size}\`\n\n` +
    `⏱️ *Bot Uptime:* \`${uptimeFormatted}\`\n` +
    `💻 *Host OS:* \`${osType}\`\n` +
    `🧠 *RAM (Process):* \`${formatBytes(memUsage.rss)}\`\n` +
    `🖥️ *RAM (System):* \`${formatBytes(usedRam)} / ${formatBytes(totalRam)}\`\n` +
    `⚙️ *CPU:* \`${cpuCount}x ${cpuModel.slice(0, 28)}...\`\n\n` +
    `✨ *Status:* All systems operational and running smoothly.`;

  await ctx.reply(message, { parse_mode: "Markdown" });
}

export default {
  config: config_data,
  onStart
};
