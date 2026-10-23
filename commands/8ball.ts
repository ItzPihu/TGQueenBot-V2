export const config_data = {
  name: "8ball",
  aliases: ["magic8"],
  version: "2.0.0",
  author: "Priyanshi Kaur",
  countDown: 3,
  role: 0,
  shortDescription: {
    en: "Ask the Magic 8-Ball a question"
  },
  longDescription: {
    en: "Provides randomized fortune answers and predictions from the mystical Magic 8-Ball"
  },
  category: "Fun",
  guide: {
    en: "/8ball <your question>"
  }
};

const responses = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful."
];

export async function onStart({ ctx, args }: { ctx: any; args: string[] }): Promise<void> {
  const question = args.join(" ").trim();
  if (!question) {
    await ctx.reply("🎱 Please ask a question after the command.\nExample: `/8ball Will today be a great day?`", { parse_mode: "Markdown" });
    return;
  }

  const answer = responses[Math.floor(Math.random() * responses.length)];
  const username = ctx.from?.username ? `@${ctx.from.username}` : ctx.from?.first_name || "User";

  const message = `🎱 *The Magic 8-Ball Speaks* 🎱\n\n` +
    `👤 *Questioner:* ${username}\n` +
    `❓ *Question:* ${question}\n\n` +
    `🔮 *Oracle:* *${answer}*`;

  await ctx.reply(message, { parse_mode: "Markdown" });
}

export default {
  config: config_data,
  onStart
};
