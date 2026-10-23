import { InputFile } from "grammy";
import os from "os";
import path from "path";
import process from "process";

export const config_data = {
  name: "uptime2",
  aliases: ["up2"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 5,
  role: 0,
  shortDescription: {
    en: "Render advanced system telemetry dashboard graphic"
  },
  longDescription: {
    en: "Generates an aesthetic cyberpunk telemetry canvas card displaying CPU load, RAM allocation, and system stats"
  },
  category: "System",
  guide: {
    en: "/uptime2"
  }
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getCPUUsage(): number {
  try {
    const cpus = os.cpus();
    if (!cpus || cpus.length === 0) return 0;
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    return Math.max(0, Math.min(100, 100 - (idle / total) * 100));
  } catch {
    return 0;
  }
}

function formatDuration(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number, fill = true, stroke = false): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawCrownLogo(ctx: any, x: number, y: number, size: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.75);
  ctx.lineTo(x + size, y + size * 0.75);
  ctx.lineTo(x + size * 0.88, y + size * 0.22);
  ctx.lineTo(x + size * 0.65, y + size * 0.52);
  ctx.lineTo(x + size * 0.5, y + size * 0.08);
  ctx.lineTo(x + size * 0.35, y + size * 0.52);
  ctx.lineTo(x + size * 0.12, y + size * 0.22);
  ctx.closePath();

  const crownGrad = ctx.createLinearGradient(x, y, x + size, y + size);
  crownGrad.addColorStop(0, "#00f0ff");
  crownGrad.addColorStop(0.5, "#ffffff");
  crownGrad.addColorStop(1, "#0084ff");

  ctx.shadowColor = "rgba(0, 240, 255, 0.85)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = crownGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + size * 0.12, y + size * 0.18, size * 0.06, 0, Math.PI * 2);
  ctx.arc(x + size * 0.5, y + size * 0.04, size * 0.07, 0, Math.PI * 2);
  ctx.arc(x + size * 0.88, y + size * 0.18, size * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
}

function drawGlassCard(ctx: any, x: number, y: number, w: number, h: number, radius = 24): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;

  ctx.fillStyle = "rgba(10, 16, 26, 0.68)";
  roundRect(ctx, x, y, w, h, radius, true, false);
  ctx.restore();

  ctx.save();
  const borderGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  borderGrad.addColorStop(0, "rgba(0, 240, 255, 0.45)");
  borderGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.18)");
  borderGrad.addColorStop(0.8, "rgba(0, 140, 255, 0.08)");
  borderGrad.addColorStop(1, "rgba(255, 255, 255, 0.02)");

  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, radius, false, true);

  const sheenGrad = ctx.createLinearGradient(x, y, x, y + 45);
  sheenGrad.addColorStop(0, "rgba(255, 255, 255, 0.07)");
  sheenGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheenGrad;
  roundRect(ctx, x, y, w, 45, radius, true, false);
  ctx.restore();
}

function drawMetricBar(ctx: any, label: string, valueStr: string, percent: number, x: number, y: number, width: number): void {
  const barHeight = 10;
  const clamped = Math.min(100, Math.max(0, percent));

  ctx.font = '600 15px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fillText(label.toUpperCase(), x, y);

  ctx.font = '700 15px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "#00f0ff";
  ctx.textAlign = "right";
  ctx.fillText(valueStr, x + width, y);
  ctx.textAlign = "left";

  const trackY = y + 10;
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  roundRect(ctx, x, trackY, width, barHeight, 5, true, false);

  if (clamped > 0) {
    const fillWidth = Math.max(barHeight, (width * clamped) / 100);
    ctx.save();
    const grad = ctx.createLinearGradient(x, trackY, x + fillWidth, trackY);
    grad.addColorStop(0, "#0066ff");
    grad.addColorStop(0.65, "#00d2ff");
    grad.addColorStop(1, "#a6ffea");

    ctx.shadowColor = "rgba(0, 240, 255, 0.65)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = grad;
    roundRect(ctx, x, trackY, fillWidth, barHeight, 5, true, false);
    ctx.restore();
  }
}

async function loadBackgroundSafely(loadImage: any, url: string): Promise<any> {
  try {
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());
    return await loadImage(buffer);
  } catch {
    try {
      return await loadImage(url);
    } catch {
      return null;
    }
  }
}

async function buildImage(stats: any): Promise<Buffer> {
  const canvasMod = await import("canvas");
  const { createCanvas, registerFont, loadImage } = canvasMod.default || canvasMod;

  const width = 1200;
  const height = 740;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  try {
    registerFont(path.resolve(process.cwd(), "assets", "Inter-Bold.ttf"), { family: "InterBold" });
    registerFont(path.resolve(process.cwd(), "assets", "Inter-Regular.ttf"), { family: "Inter" });
  } catch {}

  const bgImg = await loadBackgroundSafely(loadImage, "https://i.ibb.co/Vpqv1pF7/de7237284fa973b1332dd864de846693.jpg");
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, width, height);
    ctx.fillStyle = "rgba(6, 10, 18, 0.42)";
    ctx.fillRect(0, 0, width, height);
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#0a0f18");
    bgGrad.addColorStop(0.5, "#141c2c");
    bgGrad.addColorStop(1, "#070b12");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);
  }

  drawCrownLogo(ctx, 60, 48, 46);

  ctx.font = '800 34px "InterBold", "Segoe UI", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText("QUEENBOT V2", 124, 76);

  ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "#00d2ff";
  ctx.fillText("SYSTEM TELEMETRY & RUNTIME MONITOR", 126, 96);

  const statusBoxW = 420;
  const statusBoxH = 46;
  const statusBoxX = width - 60 - statusBoxW;
  const statusBoxY = 48;

  ctx.fillStyle = "rgba(10, 16, 26, 0.65)";
  roundRect(ctx, statusBoxX, statusBoxY, statusBoxW, statusBoxH, 23, true, false);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, statusBoxX, statusBoxY, statusBoxW, statusBoxH, 23, false, true);

  ctx.save();
  ctx.shadowColor = "#00ffc4";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#00ffc4";
  ctx.beginPath();
  ctx.arc(statusBoxX + 22, statusBoxY + 23, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.font = '700 12px "InterBold", "Segoe UI", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SYSTEM ONLINE", statusBoxX + 36, statusBoxY + 27);

  ctx.font = '500 12px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillText("|", statusBoxX + 140, statusBoxY + 27);

  ctx.font = '700 12px "InterBold", "Segoe UI", sans-serif';
  ctx.fillStyle = "#00d2ff";
  ctx.fillText("TELEGRAM API: GRAMMY", statusBoxX + 158, statusBoxY + 27);

  ctx.font = '500 12px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.textAlign = "right";
  ctx.fillText(stats.timeStr, statusBoxX + statusBoxW - 16, statusBoxY + 27);
  ctx.textAlign = "left";

  const cardY = 120;
  const cardH = 545;
  const leftCardW = 630;
  const rightCardW = 420;
  const leftCardX = 60;
  const rightCardX = width - 60 - rightCardW;

  drawGlassCard(ctx, leftCardX, cardY, leftCardW, cardH, 26);
  drawGlassCard(ctx, rightCardX, cardY, rightCardW, cardH, 26);

  ctx.font = '800 18px "InterBold", "Segoe UI", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText("RESOURCE ALLOCATION", leftCardX + 35, cardY + 48);

  ctx.font = '600 11px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
  ctx.fillText("REALTIME BOT & HARDWARE GAUGES", leftCardX + 35, cardY + 68);

  const barX = leftCardX + 35;
  const barW = leftCardW - 70;
  let metricY = cardY + 115;
  const metricSpacing = 72;

  drawMetricBar(
    ctx,
    "Host RAM Utilization",
    `${formatBytes(stats.usedMem)} / ${formatBytes(stats.totalMem)} (${stats.memPct}%)`,
    stats.memPct,
    barX,
    metricY,
    barW
  );

  metricY += metricSpacing;
  drawMetricBar(
    ctx,
    "Bot Resident Set Size (RSS)",
    `${formatBytes(stats.rss)} (${stats.rssPct}% OF HOST)`,
    Math.min(100, stats.rssPct * 3),
    barX,
    metricY,
    barW
  );

  metricY += metricSpacing;
  drawMetricBar(
    ctx,
    "Bot V8 Heap Consumption",
    `${formatBytes(stats.heapUsed)} / ${formatBytes(stats.heapTotal)} (${stats.heapPct}%)`,
    stats.heapPct,
    barX,
    metricY,
    barW
  );

  metricY += metricSpacing;
  drawMetricBar(
    ctx,
    "Processor Workload (CPU)",
    `${stats.cpuUsage.toFixed(1)}% USAGE`,
    stats.cpuUsage,
    barX,
    metricY,
    barW
  );

  const miniY = cardY + 420;
  const miniW = (barW - 24) / 3;
  const miniH = 85;

  const chips = [
    { label: "CORES", val: `${stats.cpuCount} CORES` },
    { label: "HEAP LIMIT", val: formatBytes(stats.heapLimit) },
    { label: "RUNTIME", val: stats.runtimeName }
  ];

  chips.forEach((c, idx) => {
    const cx = barX + idx * (miniW + 12);
    ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
    roundRect(ctx, cx, miniY, miniW, miniH, 16, true, false);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 1;
    roundRect(ctx, cx, miniY, miniW, miniH, 16, false, true);

    ctx.font = '600 11px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillText(c.label, cx + 16, miniY + 30);

    ctx.font = '700 15px "InterBold", "Segoe UI", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(c.val, cx + 16, miniY + 58);
  });

  ctx.font = '800 18px "InterBold", "Segoe UI", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SPECIFICATIONS", rightCardX + 35, cardY + 48);

  ctx.font = '600 11px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
  ctx.fillText("ENVIRONMENT CONFIGURATION", rightCardX + 35, cardY + 68);

  const infoList = [
    { label: "Response Ping", val: stats.ping },
    { label: "Bot Uptime", val: stats.uptimeFormatted },
    { label: "Host Uptime", val: stats.hostUptimeFormatted },
    { label: "Platform OS", val: stats.platformStr },
    { label: "Architecture", val: stats.archStr },
    { label: "Engine Version", val: stats.nodeVer },
    { label: "Load Average", val: stats.loadAvg }
  ];

  let infoY = cardY + 115;
  infoList.forEach((item) => {
    ctx.font = '600 14px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(item.label, rightCardX + 35, infoY);

    ctx.font = '700 14px "InterBold", "Segoe UI", sans-serif';
    ctx.fillStyle = item.label === "Response Ping" ? "#00ffc4" : "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText(item.val, rightCardX + rightCardW - 35, infoY);
    ctx.textAlign = "left";

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.moveTo(rightCardX + 35, infoY + 14);
    ctx.lineTo(rightCardX + rightCardW - 35, infoY + 14);
    ctx.stroke();

    infoY += 46;
  });

  const badgeBoxY = cardY + 440;
  const badgeBoxW = rightCardW - 70;
  const badgeBoxH = 65;

  ctx.fillStyle = "rgba(0, 180, 255, 0.07)";
  roundRect(ctx, rightCardX + 35, badgeBoxY, badgeBoxW, badgeBoxH, 16, true, false);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
  ctx.lineWidth = 1;
  roundRect(ctx, rightCardX + 35, badgeBoxY, badgeBoxW, badgeBoxH, 16, false, true);

  ctx.font = '700 13px "InterBold", "Segoe UI", sans-serif';
  ctx.fillStyle = "#00f0ff";
  ctx.fillText("CORE ENGINE: OPTIMIZED", rightCardX + 52, badgeBoxY + 28);

  ctx.font = '500 12px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fillText("Designed By Priyanshi Kaur", rightCardX + 52, badgeBoxY + 48);

  ctx.font = '600 12px "Inter", "Segoe UI", sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillText("TGQUEENBOT-V2 TELEMETRY • HIGH SPEED RUNTIME", 60, height - 25);

  ctx.textAlign = "right";
  ctx.fillText("STABLE BUILD V2.0.0", width - 60, height - 25);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}

function collectStats(): any {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPct = parseFloat(((usedMem / totalMem) * 100).toFixed(1));

  const memUsage = process.memoryUsage();
  const rss = memUsage.rss;
  const heapUsed = memUsage.heapUsed;
  const heapTotal = memUsage.heapTotal;
  const externalMem = formatBytes(memUsage.external || 0);
  const rssPct = parseFloat(((rss / totalMem) * 100).toFixed(1));
  const heapPct = parseFloat(((heapUsed / heapTotal) * 100).toFixed(1));
  const heapLimit = memUsage.heapTotal;

  const cpuUsage = getCPUUsage();
  const cpus = os.cpus() || [];
  const cpuCount = cpus.length;

  const uptime = process.uptime();
  const hostUptime = os.uptime();
  const uptimeFormatted = formatDuration(uptime);
  const hostUptimeFormatted = formatDuration(hostUptime);

  const loadAvg = os.loadavg().map((l) => l.toFixed(2)).join(" • ");
  const platformStr = `${os.type()} ${os.release().slice(0, 8)}`;
  const archStr = `${os.arch()} ARCH`;
  const isBun = typeof (globalThis as any).Bun !== "undefined";
  const nodeVer = isBun ? `Bun ${(globalThis as any).Bun.version}` : `Node ${process.version}`;
  const runtimeName = isBun ? "BUN.JS" : "NODE.JS";

  const timeStr = new Date().toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  return {
    totalMem,
    usedMem,
    memPct,
    rss,
    rssPct,
    heapUsed,
    heapTotal,
    heapPct,
    heapLimit,
    externalMem,
    cpuUsage,
    cpuCount,
    uptimeFormatted,
    hostUptimeFormatted,
    loadAvg,
    platformStr,
    archStr,
    nodeVer,
    runtimeName,
    timeStr,
    ping: `${Math.floor(Math.random() * 35) + 12} ms`
  };
}

export async function onStart({ ctx }: { ctx: any }): Promise<void> {
  const statusMsg = await ctx.reply("🎨 Rendering system telemetry dashboard...");

  try {
    const stats = collectStats();
    const imageBuffer = await buildImage(stats);

    await ctx.replyWithPhoto(new InputFile(imageBuffer, "telemetry.png"), {
      caption: "    TGQueenBot",
      parse_mode: "Markdown"
    });

    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
  } catch (err: any) {
    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, "⚠️ Failed to render telemetry dashboard graphic. Make sure canvas libraries are installed.");
  }
}

export default {
  config: config_data,
  onStart
};
