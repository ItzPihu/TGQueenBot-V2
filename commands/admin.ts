import config from "../config.js";

export const config_data = {
  name: "admin",
  aliases: ["ad", "admins"],
  version: "2.0.0",
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

export async function onStart({ ctx, args, db }: { ctx: any; args: string[]; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const isOwner = config.roles.owners.includes(userId);
  const action = (args[0] || "").toLowerCase();
  const targetIdStr = args[1];

  if (!action) {
    const dbAdmins = await db.collection("admins").find({}).toArray();
    let text = `👑 *${config.bot.name} Administrators*\n\n`;
    text += `*Owners:*\n`;
    for (const ownerId of config.roles.owners) {
      text += `• \`${ownerId}\`\n`;
    }
    text += `\n*Config Admins:*\n`;
    for (const adminId of config.roles.admins) {
      if (!config.roles.owners.includes(adminId)) {
        text += `• \`${adminId}\`\n`;
      }
    }
    if (dbAdmins.length > 0) {
      text += `\n*Database Granted Admins:*\n`;
      for (const admin of dbAdmins) {
        text += `• ${admin.username ? `@${admin.username}` : "User"} (\`${admin.userId}\`)\n`;
      }
    }
    await ctx.reply(text, { parse_mode: "Markdown" });
    return;
  }

  if (action === "add") {
    if (!isOwner) {
      await ctx.reply("🚫 Only bot owners can add new administrators.");
      return;
    }
    if (!targetIdStr || isNaN(Number(targetIdStr))) {
      await ctx.reply("⚠️ Please provide a valid numeric Telegram User ID.\nUsage: `/admin add <user_id>`", { parse_mode: "Markdown" });
      return;
    }

    const targetId = Number(targetIdStr);
    const existing = await db.collection("admins").findOne({ userId: targetId });
    if (existing || config.roles.admins.includes(targetId)) {
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

    if (!config.roles.admins.includes(targetId)) {
      config.roles.admins.push(targetId);
    }

    await ctx.reply(`✅ User \`${targetId}\` (${username}) has been promoted to bot administrator.`, { parse_mode: "Markdown" });
    return;
  }

  if (action === "remove") {
    if (!isOwner) {
      await ctx.reply("🚫 Only bot owners can remove administrators.");
      return;
    }
    if (!targetIdStr || isNaN(Number(targetIdStr))) {
      await ctx.reply("⚠️ Please provide a valid numeric Telegram User ID.\nUsage: `/admin remove <user_id>`", { parse_mode: "Markdown" });
      return;
    }

    const targetId = Number(targetIdStr);
    if (config.roles.owners.includes(targetId)) {
      await ctx.reply("🚫 Bot owners cannot be removed.");
      return;
    }

    const res = await db.collection("admins").deleteOne({ userId: targetId });
    const idx = config.roles.admins.indexOf(targetId);
    if (idx !== -1) {
      config.roles.admins.splice(idx, 1);
    }

    if (res.deletedCount > 0 || idx !== -1) {
      await ctx.reply(`✅ Administrator \`${targetId}\` has been removed.`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`ℹ️ User \`${targetId}\` was not found in the administrator records.`, { parse_mode: "Markdown" });
    }
    return;
  }

  await ctx.reply("⚠️ Invalid action. Usage: `/admin [add|remove] <user_id>`", { parse_mode: "Markdown" });
}

export default {
  config: config_data,
  onStart
};
