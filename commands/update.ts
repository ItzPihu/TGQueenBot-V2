import { checkRemoteUpdate, executeAutoUpdate, getLocalVersionData } from "../updater.js";
import config from "../config.js";

export const config_data = {
  name: "update",
  aliases: ["checkupdate", "upgrade"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 2,
  shortDescription: {
    en: "Check and apply bot updates"
  },
  longDescription: {
    en: "Checks update.json from the repository and automatically updates the bot"
  },
  category: "System",
  guide: {
    en: "/update [check|apply]"
  }
};

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const sub = (args[0] || "check").toLowerCase();

  if (sub === "apply") {
    const statusMsg = await ctx.reply("🔄 Fetching updates and pulling changes from repository...");
    const result = await executeAutoUpdate();
    if (result.success) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `✅ *Update Applied Successfully!*\n\n\`\`\`\n${result.message}\n\`\`\`\nRestarting bot to load new modules...`,
        { parse_mode: "Markdown" }
      );
      setTimeout(() => process.exit(0), 1500);
    } else {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        `❌ *Update Failed*\n\nError details: ${result.message}`
      );
    }
    return;
  }

  const statusMsg = await ctx.reply("🔍 Checking remote repository for updates...");
  const updateInfo = await checkRemoteUpdate();

  if (updateInfo.hasUpdate) {
    const changelog = updateInfo.whatsNew.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
    const msg = `🚨 *New Update Available for ${config.bot.name}!*\n\n` +
      `📦 *Current Version:* \`${updateInfo.localVersion}\`\n` +
      `✨ *Latest Version:* \`${updateInfo.remoteVersion}\`\n` +
      (updateInfo.releaseDate ? `📅 *Release Date:* ${updateInfo.releaseDate}\n\n` : "\n") +
      `📝 *What's New:*\n${changelog || "Bug fixes and improvements"}\n\n` +
      `👉 Send \`/update apply\` to pull changes and update automatically.`;
    
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, { parse_mode: "Markdown" });
  } else {
    const local = getLocalVersionData();
    const changelog = local.whatsNew.map((item, idx) => `• ${item}`).join("\n");
    const msg = `🎉 *${config.bot.name} is Up to Date!*\n\n` +
      `📦 *Current Version:* \`${local.version}\`\n` +
      `👑 *Author:* ${config.bot.author}\n\n` +
      (changelog ? `✨ *Current Features:*\n${changelog}` : "");
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, msg, { parse_mode: "Markdown" });
  }
}

export default {
  config: config_data,
  onStart
};
