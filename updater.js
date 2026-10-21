import axios from "axios";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import config from "./config.js";

const execAsync = promisify(exec);

export interface UpdateInfo {
  hasUpdate: boolean;
  localVersion: string;
  remoteVersion: string;
  whatsNew: string[];
  releaseDate?: string;
}

export function getLocalVersionData(): { version: string; whatsNew: string[] } {
  try {
    const filePath = path.resolve(process.cwd(), "update.json");
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return { version: data.version || config.bot.version, whatsNew: data.whatsNew || [] };
    }
  } catch {}
  return { version: config.bot.version, whatsNew: [] };
}

export async function checkRemoteUpdate(): Promise<UpdateInfo> {
  const local = getLocalVersionData();
  try {
    const res = await axios.get(config.updater.updateUrl, { timeout: 10000 });
    const remote = res.data;
    const hasUpdate = remote.version && remote.version !== local.version;
    return {
      hasUpdate: Boolean(hasUpdate),
      localVersion: local.version,
      remoteVersion: remote.version || local.version,
      whatsNew: Array.isArray(remote.whatsNew) ? remote.whatsNew : [],
      releaseDate: remote.releaseDate
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      localVersion: local.version,
      remoteVersion: local.version,
      whatsNew: []
    };
  }
}

export async function notifyAdmins(bot: any, info: UpdateInfo): Promise<void> {
  if (!info.hasUpdate || !config.updater.autoNotifyAdmins) return;
  const list = info.whatsNew.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
  const text = `🚨 *New Update Available for ${config.bot.name}!*\n\n` +
    `📦 *Current Version:* \`${info.localVersion}\`\n` +
    `✨ *Latest Version:* \`${info.remoteVersion}\`\n\n` +
    `📝 *What's New:*\n${list || "General performance improvements and bug fixes."}\n\n` +
    `💡 Send \`/update apply\` to update automatically.`;

  for (const adminId of config.roles.admins) {
    try {
      await bot.api.sendMessage(adminId, text, { parse_mode: "Markdown" });
    } catch {}
  }
}

export async function executeAutoUpdate(): Promise<{ success: boolean; message: string }> {
  try {
    const isBun = typeof (globalThis as any).Bun !== "undefined";
    const installCmd = isBun ? "bun install" : "npm install";
    const { stdout: pullOut } = await execAsync("git pull origin main || git pull");
    const { stdout: installOut } = await execAsync(installCmd);
    return {
      success: true,
      message: `Update applied successfully.\nGit: ${pullOut.trim()}\nDependencies: ${installOut.trim()}`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to execute auto-update."
    };
  }
}
