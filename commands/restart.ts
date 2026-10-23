import { spawn } from "child_process";
import process from "process";
import config from "../config.js";

export const config_data = {
  name: "restart",
  aliases: ["reboot", "reload"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 2,
  shortDescription: {
    en: "Restart the bot process"
  },
  longDescription: {
    en: "Restarts the bot instance and reloads all command and event modules"
  },
  category: "System",
  guide: {
    en: "/restart"
  }
};

export async function onStart({ ctx }: { ctx: any }): Promise<void> {
  const isOwner = config.roles.owners.includes(ctx.from?.id);
  if (!isOwner) {
    await ctx.reply("🚫 Only bot owners are permitted to restart the bot.");
    return;
  }

  const statusMsg = await ctx.reply("🔄 *Restart Initiated*\nShutting down bot process and reloading modules...", { parse_mode: "Markdown" });

  setTimeout(async () => {
    try {
      await ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        "💤 Process terminating. Spawning new instance..."
      );

      const isBun = typeof (globalThis as any).Bun !== "undefined";
      const executable = isBun ? "bun" : process.argv[0];
      const args = isBun ? ["run", "bot.ts"] : process.argv.slice(1);

      const child = spawn(executable, args, {
        detached: true,
        stdio: "inherit"
      });
      child.unref();

      process.exit(0);
    } catch {
      process.exit(0);
    }
  }, 1000);
}

export default {
  config: config_data,
  onStart
};
