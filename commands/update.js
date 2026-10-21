import updater from "../updater.js";
import config from "../config.js";

export default {
  name: "update",
  aliases: ["checkupdate", "upgrade"],
  description: "Check for updates and automatically update TGQueenBot-V2",
  ownerOnly: true,
  adminOnly: false,

  async execute(ctx, args) {
    const subCommand = (args[0] || "").toLowerCase();

    if (subCommand === "now" || subCommand === "apply") {
      await ctx.reply("🔄 Starting automated update process...\nPulling latest changes and updating dependencies.");

      const result = await updater.executeSelfUpdate();
      if (result.success) {
        await ctx.reply(
          `✅ *Update Applied Successfully!*\n\n` +
          `\`\`\`\n${result.log.slice(0, 3000)}\n\`\`\`\n` +
          `♻️ Please restart the bot to load the newest features.`,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply(
          `❌ *Update Failed:*\n${result.error}\n\n` +
          `\`\`\`\n${result.log.slice(0, 3000)}\n\`\`\``,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }

    const check = await updater.checkForUpdates();
    if (check.error) {
      return ctx.reply(`⚠️ Could not reach update server: ${check.error}`);
    }

    if (!check.hasUpdate) {
      return ctx.reply(
        `✨ *${config.bot.name} is fully up to date!*\n\n` +
        `📦 *Current Version:* \`${check.currentVersion}\`\n` +
        `👤 *Author:* ${config.bot.author}`,
        { parse_mode: "Markdown" }
      );
    }

    const changelog = check.whatsNew.map(item => `• ${item}`).join("\n");
    const text =
      `🚀 *New Version Available!*\n\n` +
      `📦 *Installed:* \`${check.currentVersion}\`\n` +
      `🌟 *Latest:* \`${check.latestVersion}\`\n` +
      `📅 *Date:* \`${check.releaseDate}\`\n\n` +
      `📝 *What's New:*\n${changelog}\n\n` +
      `👉 Send \`/update now\` to apply the update automatically.`;

    await ctx.reply(text, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⚡ Update Now", callback_data: "update:now" }
          ]
        ]
      }
    });
  },

  async handleCallback(ctx, args) {
    const action = args[0];
    if (action === "now") {
      const userId = String(ctx.from.id);
      if (!config.owners.map(String).includes(userId)) {
        return ctx.answerCallbackQuery({ text: "Owner only action.", show_alert: true });
      }

      await ctx.answerCallbackQuery({ text: "Executing update..." });
      await ctx.reply("🔄 Running automated self-update...");

      const result = await updater.executeSelfUpdate();
      if (result.success) {
        await ctx.reply(
          `✅ *Update Completed!*\n\n` +
          `\`\`\`\n${result.log.slice(0, 3000)}\n\`\`\`\n` +
          `♻️ Restarting bot service is recommended.`,
          { parse_mode: "Markdown" }
        );
      } else {
        await ctx.reply(`❌ *Update Failed:* ${result.error}`, { parse_mode: "Markdown" });
      }
    }
  }
};
