import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import config from "./config.js";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalVersion() {
  const versionFilePath = path.join(__dirname, "version.txt");
  if (fs.existsSync(versionFilePath)) {
    const raw = fs.readFileSync(versionFilePath, "utf8").trim();
    if (raw) return raw;
  }
  return config.bot?.version || "2.0.0";
}

function parseSemver(v) {
  const parts = String(v).replace(/^v/, "").split(".").map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function isNewerVersion(remote, local) {
  const r = parseSemver(remote);
  const l = parseSemver(local);
  if (r.major > l.major) return true;
  if (r.major < l.major) return false;
  if (r.minor > l.minor) return true;
  if (r.minor < l.minor) return false;
  return r.patch > l.patch;
}

async function fetchRemoteUpdate() {
  const url = config.updater?.updateJsonUrl;
  if (!url) return null;
  const response = await axios.get(url, { timeout: 8000 });
  return response.data;
}

async function checkForUpdates() {
  try {
    const currentVersion = getLocalVersion();
    const remoteData = await fetchRemoteUpdate();
    if (!remoteData || !remoteData.version) {
      return { hasUpdate: false, currentVersion };
    }

    const hasUpdate = isNewerVersion(remoteData.version, currentVersion);
    return {
      hasUpdate,
      currentVersion,
      latestVersion: remoteData.version,
      releaseDate: remoteData.releaseDate || "Unknown",
      whatsNew: Array.isArray(remoteData.whatsNew) ? remoteData.whatsNew : [String(remoteData.whatsNew || "General improvements")],
      critical: Boolean(remoteData.critical)
    };
  } catch (error) {
    return { hasUpdate: false, error: error.message };
  }
}

async function notifyOwnersOfUpdate(bot) {
  if (!config.updater?.notifyOwnersOnUpdate) return;
  const updateStatus = await checkForUpdates();
  if (!updateStatus.hasUpdate) return;

  const changelog = updateStatus.whatsNew.map(item => `• ${item}`).join("\n");
  const message = `🔔 *New Update Available for ${config.bot.name}!*\n\n` +
    `📦 *Current Version:* \`${updateStatus.currentVersion}\`\n` +
    `🚀 *Latest Version:* \`${updateStatus.latestVersion}\`\n` +
    `📅 *Release Date:* \`${updateStatus.releaseDate}\`\n\n` +
    `✨ *What's New:*\n${changelog}\n\n` +
    `👉 Use the \`/update\` command to apply changes automatically!`;

  for (const ownerId of config.owners) {
    try {
      await bot.api.sendMessage(ownerId, message, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(`Failed to notify owner ${ownerId}:`, err.message);
    }
  }
}

async function executeSelfUpdate() {
  const results = [];
  try {
    const gitPull = await execAsync("git pull origin main || git pull");
    results.push(gitPull.stdout || gitPull.stderr);

    const isBun = typeof process.versions.bun !== "undefined";
    const installCmd = isBun ? "bun install" : "npm install";
    const install = await execAsync(installCmd);
    results.push(install.stdout || install.stderr);

    const updateCheck = await checkForUpdates();
    if (updateCheck.latestVersion) {
      const versionFilePath = path.join(__dirname, "version.txt");
      fs.writeFileSync(versionFilePath, updateCheck.latestVersion, "utf8");
    }

    return {
      success: true,
      log: results.join("\n").trim()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      log: results.join("\n").trim()
    };
  }
}

export {
  getLocalVersion,
  isNewerVersion,
  checkForUpdates,
  notifyOwnersOfUpdate,
  executeSelfUpdate
};
export default {
  getLocalVersion,
  isNewerVersion,
  checkForUpdates,
  notifyOwnersOfUpdate,
  executeSelfUpdate
};
