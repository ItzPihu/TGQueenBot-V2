import { commands, commandAliases } from "../bot.js";
import config from "../config.js";

export const config_data = {
  name: "help",
  aliases: [],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "View command list or inspect a command"
  },
  longDescription: {
    en: "Displays all available commands categorized aesthetically, or details on a specific command"
  },
  category: "Utility",
  guide: {
    en: "/help [command name]"
  }
};

function formatCommandList(): string {
  const categories: Record<string, string[]> = {};

  for (const [name, cmd] of commands.entries()) {
    const cat = cmd.config?.category || (cmd as any).category || "General";
    if (!categories[cat]) categories[cat] = [];
    if (!categories[cat].includes(name)) {
      categories[cat].push(name);
    }
  }

  let text = `👑 *${config.bot.name} Command Directory* 👑\n` +
    `⚡ *Author:* ${config.bot.author}\n` +
    `📦 *Version:* \`${config.bot.version}\`\n` +
    `🔢 *Total Commands:* ${commands.size}\n\n`;

  for (const [category, list] of Object.entries(categories)) {
    text += `╭───✿ *${category}*\n`;
    for (let i = 0; i < list.length; i += 2) {
      const first = `♡ \`${list[i]}\``;
      const second = list[i + 1] ? `  ♡ \`${list[i + 1]}\`` : "";
      text += `│ ${first}${second}\n`;
    }
    text += `╰───────────✿\n\n`;
  }

  text += `💡 *Tip:* Type \`/help <command>\` for detailed information on any command.`;
  return text;
}

function formatCommandDetail(name: string): string | null {
  const resolved = commandAliases.get(name.toLowerCase()) || name.toLowerCase();
  const cmd = commands.get(resolved);
  if (!cmd) return null;

  const conf = cmd.config || (cmd as any);
  const aliases = conf.aliases?.length ? conf.aliases.map((a: string) => `\`${a}\``).join(", ") : "None";
  const roleName = conf.role === 2 ? "Bot Owner" : conf.role === 1 ? "Group Admin" : "All Members";
  const desc = typeof conf.shortDescription === "object" ? conf.shortDescription.en : (conf.shortDescription || conf.description || "No description provided.");
  const guide = typeof conf.guide === "object" ? conf.guide.en : (conf.guide || `/${conf.name}`);

  return `📖 *Command Details: ${conf.name}*\n\n` +
    `📝 *Description:* ${desc}\n` +
    `🏷️ *Category:* ${conf.category || "General"}\n` +
    `🛡️ *Role Required:* ${roleName}\n` +
    `⏱️ *Cooldown:* ${conf.countDown || 0}s\n` +
    `🔀 *Aliases:* ${aliases}\n` +
    `👑 *Author:* ${conf.author || config.bot.author}\n\n` +
    `💡 *Usage:*\n\`\`\`\n${guide}\n\`\`\``;
}

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const query = args[0]?.toLowerCase();
  if (query) {
    const detail = formatCommandDetail(query);
    if (!detail) {
      await ctx.reply(`❌ Command \`${query}\` not found. Type \`/help\` to view all commands.`, { parse_mode: "Markdown" });
      return;
    }
    await ctx.reply(detail, { parse_mode: "Markdown" });
    return;
  }

  const list = formatCommandList();
  await ctx.reply(list, { parse_mode: "Markdown" });
}

export async function handleCallback(bot: any, ctx: any, args: string[]): Promise<void> {
  await ctx.answerCallbackQuery();
  const list = formatCommandList();
  await ctx.reply(list, { parse_mode: "Markdown" });
}

export default {
  config: config_data,
  onStart,
  handleCallback
};
