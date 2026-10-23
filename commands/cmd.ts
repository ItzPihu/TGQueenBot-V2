import axios from "axios";
import fs from "fs";
import path from "path";
import { commands, commandAliases, CommandModule, isOwner } from "../bot.js";
import config from "../config.js";

export const config_data = {
  name: "cmd",
  aliases: [],
  version: "2.1.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 2,
  shortDescription: {
    en: "Manage, reload, and install command modules dynamically"
  },
  longDescription: {
    en: "Dynamically load, reload, unload, and install command scripts from URLs or raw code with overwrite confirmation"
  },
  category: "Owner",
  guide: {
    en: "/cmd load <file_name>\n/cmd loadall\n/cmd unload <command_name>\n/cmd install <url> <file_name.ts>\n/cmd install <file_name.ts> <code>"
  }
};

const pendingInstalls = new Map<number | string, { fileName: string; codeContent: string; authorId: number }>();

function resolveFilePath(name: string): string | null {
  const dir = path.resolve(process.cwd(), "commands");
  const candidates = [
    path.join(dir, name),
    path.join(dir, `${name}.ts`),
    path.join(dir, `${name}.js`)
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function loadSingleCommand(filePath: string): Promise<{ success: boolean; name: string; error?: string }> {
  try {
    const fileUrl = `file://${filePath}?t=${Date.now()}`;
    const mod = await import(fileUrl);
    const cmd: CommandModule = mod.default || mod;

    const cmdName = cmd?.config?.name?.toLowerCase() || (cmd as any)?.name?.toLowerCase();
    if (!cmdName) {
      return { success: false, name: path.basename(filePath), error: "Missing config.name in command module" };
    }

    commands.set(cmdName, cmd);

    if (Array.isArray(cmd.config?.aliases)) {
      for (const alias of cmd.config.aliases) {
        commandAliases.set(alias.toLowerCase(), cmdName);
      }
    }

    return { success: true, name: cmdName };
  } catch (err: any) {
    return { success: false, name: path.basename(filePath), error: err.message };
  }
}

function unloadSingleCommand(cmdName: string): boolean {
  const target = cmdName.toLowerCase();
  const cmd = commands.get(target);
  if (!cmd) return false;

  if (Array.isArray(cmd.config?.aliases)) {
    for (const alias of cmd.config.aliases) {
      commandAliases.delete(alias.toLowerCase());
    }
  }

  for (const [alias, real] of commandAliases.entries()) {
    if (real === target) {
      commandAliases.delete(alias);
    }
  }

  commands.delete(target);
  return true;
}

function getRawUrl(url: string): string {
  if (url.includes("pastebin.com/") && !url.includes("/raw/")) {
    return url.replace("pastebin.com/", "pastebin.com/raw/");
  }
  if (url.includes("github.com/") && url.includes("/blob/")) {
    return url.replace("github.com/", "raw.githubusercontent.com/").replace("/blob/", "/");
  }
  return url;
}

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const userId = ctx.from?.id;
  if (!isOwner(userId)) {
    await ctx.reply(`🚫 Only bot owners are authorized to manage command scripts.\nYour ID: \`${userId}\``, { parse_mode: "Markdown" });
    return;
  }

  const action = (args[0] || "").toLowerCase();

  if (action === "load") {
    const targetFile = args[1];
    if (!targetFile) {
      await ctx.reply("⚠️ Please specify the command file to load: `/cmd load <filename>`", { parse_mode: "Markdown" });
      return;
    }

    const filePath = resolveFilePath(targetFile);
    if (!filePath) {
      await ctx.reply(`❌ File \`${targetFile}\` was not found in the commands directory.`, { parse_mode: "Markdown" });
      return;
    }

    const res = await loadSingleCommand(filePath);
    if (res.success) {
      await ctx.reply(`✅ Command \`${res.name}\` successfully loaded into active memory!`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`❌ Failed to load \`${res.name}\`:\n\`\`\`\n${res.error}\n\`\`\``, { parse_mode: "Markdown" });
    }
    return;
  }

  if (action === "loadall") {
    const dir = path.resolve(process.cwd(), "commands");
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));

    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const file of files) {
      const p = path.join(dir, file);
      const res = await loadSingleCommand(p);
      if (res.success) {
        succeeded.push(res.name);
      } else {
        failed.push(`${file} (${res.error})`);
      }
    }

    let report = `📦 *Command Reload Complete*\n\n` +
      `✅ *Loaded (${succeeded.length}):* ${succeeded.map(s => `\`${s}\``).join(", ")}`;

    if (failed.length > 0) {
      report += `\n\n❌ *Failed (${failed.length}):*\n` + failed.map(f => `• ${f}`).join("\n");
    }

    await ctx.reply(report, { parse_mode: "Markdown" });
    return;
  }

  if (action === "unload") {
    const target = args[1];
    if (!target) {
      await ctx.reply("⚠️ Specify the command to unload: `/cmd unload <command_name>`", { parse_mode: "Markdown" });
      return;
    }

    const resolved = commandAliases.get(target.toLowerCase()) || target.toLowerCase();
    const removed = unloadSingleCommand(resolved);

    if (removed) {
      await ctx.reply(`✅ Command \`${resolved}\` successfully unloaded from memory.`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`❌ Command \`${target}\` is not currently loaded in memory.`, { parse_mode: "Markdown" });
    }
    return;
  }

  if (action === "install") {
    if (args.length < 3) {
      await ctx.reply("⚠️ Usage:\n`/cmd install <url> <filename.ts>`\n`/cmd install <filename.ts> <code>`", { parse_mode: "Markdown" });
      return;
    }

    let urlOrCode = "";
    let fileName = "";
    let forceOverwrite = false;

    for (let i = 1; i < args.length; i++) {
      if (args[i].toLowerCase() === "force" || args[i].toLowerCase() === "-f") {
        forceOverwrite = true;
      } else if (!fileName && (args[i].endsWith(".ts") || args[i].endsWith(".js"))) {
        fileName = args[i];
      } else if (!urlOrCode && /^https?:\/\//i.test(args[i])) {
        urlOrCode = args[i];
      }
    }

    if (!fileName) {
      if (args[1].endsWith(".ts") || args[1].endsWith(".js")) fileName = args[1];
      else if (args[2].endsWith(".ts") || args[2].endsWith(".js")) fileName = args[2];
      else fileName = `${args[1]}.ts`;
    }

    if (!urlOrCode) {
      if (/^https?:\/\//i.test(args[1])) urlOrCode = args[1];
      else if (/^https?:\/\//i.test(args[2])) urlOrCode = args[2];
      else {
        const fullText = ctx.message?.text || "";
        const idx = fullText.indexOf(fileName);
        urlOrCode = idx !== -1 ? fullText.slice(idx + fileName.length).trim() : args.slice(2).join(" ");
      }
    }

    if (!fileName.endsWith(".ts") && !fileName.endsWith(".js")) {
      fileName = `${fileName}.ts`;
    }

    let codeContent = "";

    if (/^https?:\/\//i.test(urlOrCode)) {
      const statusMsg = await ctx.reply("📥 Fetching script code from source URL...");
      try {
        const rawUrl = getRawUrl(urlOrCode);
        const res = await axios.get(rawUrl, { timeout: 15000 });
        codeContent = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
      } catch (err: any) {
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, `❌ Failed to fetch code from URL: ${err.message}`);
        return;
      }
    } else {
      codeContent = urlOrCode.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    if (!codeContent) {
      await ctx.reply("❌ Unable to extract valid code content.");
      return;
    }

    const savePath = path.resolve(process.cwd(), "commands", fileName);
    const fileExists = fs.existsSync(savePath);

    if (fileExists && !forceOverwrite) {
      const confirmMsg = await ctx.reply(
        `⚠️ *Command file \`${fileName}\` already exists!*\n\n` +
        `Are you sure you want to overwrite it?\n` +
        `👉 *React with 👍 to this message to confirm overwriting*, or append \`force\` to overwrite directly.`,
        { parse_mode: "Markdown" }
      );

      pendingInstalls.set(confirmMsg.message_id, {
        fileName,
        codeContent,
        authorId: userId
      });
      return;
    }

    fs.writeFileSync(savePath, codeContent, "utf8");
    const loadRes = await loadSingleCommand(savePath);

    if (loadRes.success) {
      await ctx.reply(`✅ Command script \`${fileName}\` installed and loaded successfully as \`${loadRes.name}\`!`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`⚠️ File saved as \`${fileName}\`, but loading encountered an error:\n\`\`\`\n${loadRes.error}\n\`\`\``, { parse_mode: "Markdown" });
    }
    return;
  }

  await ctx.reply("⚠️ Unknown command manager action.\nUsage: `/cmd [load|loadall|unload|install]`", { parse_mode: "Markdown" });
}

export async function onReaction({ ctx }: { ctx: any }): Promise<void> {
  const reactionUpdate = ctx.messageReaction;
  if (!reactionUpdate) return;

  const msgId = reactionUpdate.message_id;
  const pending = pendingInstalls.get(msgId);
  if (!pending) return;

  const reactorId = reactionUpdate.user?.id;
  if (reactorId !== pending.authorId && !isOwner(reactorId)) return;

  const newReactions = reactionUpdate.new_reaction || [];
  const hasThumb = newReactions.some((r: any) => r.type === "emoji" && typeof r.emoji === "string" && r.emoji.startsWith("👍"));
  if (!hasThumb) return;

  pendingInstalls.delete(msgId);

  const savePath = path.resolve(process.cwd(), "commands", pending.fileName);
  fs.writeFileSync(savePath, pending.codeContent, "utf8");

  const loadRes = await loadSingleCommand(savePath);
  const chatId = reactionUpdate.chat.id;

  if (loadRes.success) {
    await ctx.api.sendMessage(chatId, `✅ Overwrite confirmed! Script \`${pending.fileName}\` installed and loaded successfully as \`${loadRes.name}\`!`, { parse_mode: "Markdown" });
  } else {
    await ctx.api.sendMessage(chatId, `⚠️ Overwrite saved as \`${pending.fileName}\`, but loading error occurred:\n\`\`\`\n${loadRes.error}\n\`\`\``, { parse_mode: "Markdown" });
  }
}

export default {
  config: config_data,
  onStart,
  onReaction
};