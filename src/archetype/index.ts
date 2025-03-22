import { configDotenv } from "dotenv";
import { Bot, Context, InlineKeyboard } from "grammy";
import { SocksProxyAgent } from "socks-proxy-agent";
import { female, male } from "./questions";
import strings from "./strings";
import { Deity, Gender, IUserData, Value } from "./types";

configDotenv();

const PERIODIC_CLEAN = 60_000; // 1m
const USER_MAX_AGE = 3_600_000; // 1h

const socksAgent = process.env.PROXY
  ? new SocksProxyAgent(process.env.PROXY)
  : undefined;

const startBot = async () => {
  const userData = new Map<number, IUserData>();

  setInterval(() => {
    const now = Date.now();
    userData.forEach((ud, key) => {
      if (ud.date - now > USER_MAX_AGE) userData.delete(key);
    });
  }, PERIODIC_CLEAN);

  const setUser = (ctx: Context, gender: Gender) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    userData.set(userId, {
      date: Date.now(),
      gender: gender,
      answers: {},
    });
  };

  const bot = new Bot(process.env.ARCHETYPE_BOT_KEY!, {
    client: { baseFetchConfig: { agent: socksAgent } },
  });

  await bot.api.setMyCommands([
    { command: "start", description: "شروع آزمون" },
    { command: "help", description: "راهنما" },
  ]);

  bot.command("help", (ctx) => ctx.reply(strings.help));
  bot.command("start", (ctx) =>
    ctx.reply(strings.welcome, {
      reply_markup: new InlineKeyboard()
        .text("مرد", "gender:male")
        .text("زن", "gender:female"),
    })
  );

  // Gender
  bot.callbackQuery("gender:male", async (ctx) => {
    try {
      setUser(ctx, Gender.male);
      await ctx.answerCallbackQuery();
      await sendQuestion(ctx, 0);
    } catch (err) {
      console.log(err);
    }
  });

  bot.callbackQuery("gender:female", async (ctx) => {
    try {
      setUser(ctx, Gender.female);
      await ctx.answerCallbackQuery();
      await sendQuestion(ctx, 0);
    } catch (err) {
      console.log(err);
    }
  });

  // Quiz
  bot.callbackQuery(/answer:(\d+)-(\d+)/, async (ctx) => {
    const userId = ctx.from.id;
    const user = userData.get(userId);
    if (!user) return;

    const current = parseInt(ctx.match[1]);
    const selectedAnswer = parseInt(ctx.match[2]);
    user.answers[current] = selectedAnswer;

    await ctx.answerCallbackQuery();
    await sendQuestion(ctx, current + 1);
  });

  async function sendQuestion(ctx: Context, current: number) {
    const userId = ctx.from?.id;
    if (!userId) return;
    const user = userData.get(userId);
    if (!user) return;

    const quiz = user.gender === Gender.male ? male : female;
    if (current >= quiz.length) {
      // Quiz finished
      await sendResult(ctx);
      userData.delete(userId);
      return;
    }

    const q = quiz[current];
    const keyboard = new InlineKeyboard();
    strings.values.forEach((v, i: Value) =>
      keyboard.text(v, `answer:${current}-${i}`)
    );

    const message = `${current}/${quiz.length} ${q.text}`;
    await ctx.reply(message, { reply_markup: keyboard });
  }

  async function sendResult(ctx: Context) {
    await ctx.reply(strings.done);
    const userId = ctx.from?.id;
    if (!userId) return;
    const data = userData.get(userId);
    if (!data) return;
    const result = new Map<Deity, number>();
    Object.entries(data.answers).forEach((answer) => {
      const questionId = parseInt(answer[0]);
      const question = male[questionId];
      const value = answer[1];
      const previous = result.get(question.deity);
      result.set(question.deity, (previous ?? 0) + value);
    });
    let message = "";
    result.forEach((value, deity) => {
      message += `${deity}: ${value} \n`;
    });
    await ctx.reply(message);
  }

  bot.start({ timeout: 10 }).catch(console.log);
};

export default startBot;
