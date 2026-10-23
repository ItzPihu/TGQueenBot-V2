import { isOwner } from "../bot.js";
import config from "../config.js";

export const config_data = {
  name: "admin",
  aliases: ["ad", "admins"],
  version: "2.1.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 2,
  shortDescription: {
    en: "Manage bot administrators and operators"
  },
  longDescription: {
    en: "Lists bot admins, allows owners to grant or revoke admin permissions"
  },
  category: "Administration",
  guide: {
    en: "/admin - List all administrators\n/admin add <user_id> - Add an administrator\n/admin remove <user_id> - Remove an administrator"
  }
};

function resolveConfig(cfg: any): any {
  if (cfg?.roles) return cfg;
  if (cfg?.config?.roles) return cfg.config;
  if (cfg?.default?.roles) return cfg.default;
  return cfg || {};
}

function getOwnerList(cfg: any): string[] {
  const conf = resolveConfig(cfg);
  const list = [
    ...(Array.isArray(conf.roles?.owners) ? conf.roles.owners : []),
    conf.roles?.ownerId,
    conf.roles?.owner_id,
    conf.bot?.ownerId,
    conf.bot?.owner_id
  ].filter(Boolean);
  return list.map((id: any) => String(id).trim());
}

function getAdminList(cfg: any): string[] {
  const conf = resolveConfig(cfg);
  const list = [
    ...(Array.isArray(conf.roles?.admins) ? conf.roles.admins : []),
    conf.roles?.adminId,
    conf.roles?.admin_id
  ].filter(Boolean);
  return list.map((id: any) => String(id).trim());
}

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const senderIsOwner = isOwner(userId);
  const ownersList = getOwnerList(config);
  const adminsList = getAdminList(config);

  const action = (args[0] || "").toLowerCase();
  const targetIdStr = args[1];

  if (!action || action === "list") {
    const dbAdmins = await db.collection("admins").find({}).toArray();
    let text = `👑 *${config_data.name.toUpperCase()} Directory*\n\n`;
    text += `*Configured Owners:*\n`;
    if (ownersList.length > 0) {
      for (const ownerId of ownersList) {
        text += `• \`${ownerId}\`\n`;
      }
    } else {
      text += `• _None configured_\n`;
    }

    text += `\n*Configured Admins:*\n`;
    if (adminsList.length > 0) {
      for (const adminId of adminsList) {
        if (!ownersList.includes(adminId)) {
          text += `• \`${adminId}\`\n`;
        }
      }
    } else {
      text += `• _None configured_\n`;
    }

    if (dbAdmins.length > 0) {
      text += `\n*Database Granted Admins:*\n`;
      for (const admin of dbAdmins) {
        text += `• ${admin.username ? `@${admin.username}` : "User"} (\`${admin.userId}\`)\n`;
      }
    }

    text += `\n👤 *Your ID:* \`${userId}\` ${senderIsOwner ? "(Owner ✅)" : "(Member ❌)"}`;
    await ctx.reply(text, { parse_mode: "Markdown" });
    return;
  }

  if (action === "add") {
    if (!senderIsOwner) {
      await ctx.reply(`🚫 Only bot owners can add new administrators.\nYour ID: \`${userId}\`\nConfigured Owners: \`${ownersList.join(", ") || "None"}\``, { parse_mode: "Markdown" });
      return;
    }

    if (!targetIdStr || isNaN(Number(targetIdStr))) {
      await ctx.reply("⚠️ Please provide a valid numeric Telegram User ID.\nUsage: `/admin add <user_id>`", { parse_mode: "Markdown" });
      return;
    }

    const targetId = Number(targetIdStr);
    const existing = await db.collection("admins").findOne({ userId: targetId });
    if (existing || adminsList.includes(String(targetId))) {
      await ctx.reply(`ℹ️ User \`${targetId}\` is already an administrator.`, { parse_mode: "Markdown" });
      return;
    }

    let username = "Unknown";
    try {
      const chatMember = await ctx.api.getChatMember(ctx.chat.id, targetId);
      username = chatMember.user.username || chatMember.user.first_name || "Unknown";
    } catch {}

    await db.collection("admins").insertOne({
      userId: targetId,
      username,
      addedBy: userId,
      addedAt: new Date()
    });

    const conf = resolveConfig(config);
    if (conf.roles && Array.isArray(conf.roles.admins)) {
      if (!conf.roles.admins.some((id: any) => String(id).trim() === String(targetId))) {
        conf.roles.admins.push(targetId);
      }
    }

    await ctx.reply(`✅ User \`${targetId}\` (${username}) has been promoted to bot administrator.`, { parse_mode: "Markdown" });
    return;
  }

  if (action === "remove") {
    if (!senderIsOwner) {
      await ctx.reply(`🚫 Only bot owners can remove administrators.\nYour ID: \`${userId}\``, { parse_mode: "Markdown" });
      return;
    }

    if (!targetIdStr || isNaN(Number(targetIdStr))) {
      await ctx.reply("⚠️ Please provide a valid numeric Telegram User ID.\nUsage: `/admin remove <user_id>`", { parse_mode: "Markdown" });
      return;
    }

    const targetId = Number(targetIdStr);
    if (ownersList.includes(String(targetId))) {
      await ctx.reply("🚫 Bot owners cannot be removed.");
      return;
    }

    const res = await db.collection("admins").deleteOne({ userId: targetId });
    const conf = resolveConfig(config);
    if (conf.roles && Array.isArray(conf.roles.admins)) {
      const idx = conf.roles.admins.findIndex((id: any) => String(id).trim() === String(targetId));
      if (idx !== -1) {
        conf.roles.admins.splice(idx, 1);
      }
    }

    if (res.deletedCount > 0) {
      await ctx.reply(`✅ Administrator \`${targetId}\` has been removed.`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`ℹ️ User \`${targetId}\` was not found in the administrator database records.`, { parse_mode: "Markdown" });
    }
    return;
  }

  await ctx.reply("⚠️ Invalid action.\nUsage: `/admin` to list, or `/admin [add|remove] <user_id>`", { parse_mode: "Markdown" });
}

export default {
  config: config_data,
  onStart
};