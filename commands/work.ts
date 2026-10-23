export const config_data = {
  name: "work",
  aliases: ["job", "earn", "shift"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Work a job to earn coins"
  },
  longDescription: {
    en: "Engage in random profession jobs to earn coins with cooldown enforcement"
  },
  category: "Economy",
  guide: {
    en: "/work"
  }
};

const jobs = [
  { title: "Software Engineer", min: 100, max: 200 },
  { title: "Cybersecurity Analyst", min: 120, max: 220 },
  { title: "Graphic Designer", min: 80, max: 150 },
  { title: "Head Chef", min: 70, max: 140 },
  { title: "Financial Trader", min: 90, max: 250 },
  { title: "Freelance Copywriter", min: 60, max: 130 }
];

function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

export async function onStart({ ctx, db }: { ctx: any; db: any }): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || ctx.from?.first_name || "User";
  if (!userId) return;

  const now = Date.now();
  const cooldownPeriod = 30 * 60 * 1000;

  try {
    const user = await db.collection("users").findOne({ userId });
    const lastWork = user?.lastWork ? new Date(user.lastWork).getTime() : 0;
    const diff = now - lastWork;

    if (diff < cooldownPeriod) {
      const left = cooldownPeriod - diff;
      await ctx.reply(`💼 You are fatigued from your last shift. Take a rest and work again in *${formatTime(left)}*.`, { parse_mode: "Markdown" });
      return;
    }

    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const earnings = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

    await db.collection("users").updateOne(
      { userId },
      {
        $inc: { balance: earnings },
        $set: { lastWork: new Date(now), username }
      },
      { upsert: true }
    );

    const newBalance = (user?.balance || 0) + earnings;
    const message = `💼 *Work Shift Completed!* 💼\n\n` +
      `👤 *Worker:* ${username}\n` +
      `🔨 *Profession:* ${job.title}\n` +
      `💵 *Salary Earned:* +${earnings.toLocaleString()} coins\n` +
      `💰 *Updated Balance:* ${newBalance.toLocaleString()} coins\n\n` +
      `You can work your next shift in 30 minutes!`;

    await ctx.reply(message, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply("⚠️ An error occurred while recording your work shift.");
  }
}

export default {
  config: config_data,
  onStart
};
