import { configDotenv } from "dotenv";
import fs from "fs";
import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import _ from "lodash";
import path from "path";
import { SocksProxyAgent } from "socks-proxy-agent";
import { intToEmoji } from "../utils/emoji";
import { female, male } from "./questions";
import strings, { deities } from "./strings";
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
    // TODO log new users
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
    { command: "start", description: strings.start_btn },
    { command: "help", description: strings.help_btn },
  ]);

  bot.command("help", (ctx) => ctx.reply(strings.help));
  bot.command("start", (ctx) =>
    ctx.reply(strings.welcome, {
      reply_markup: new InlineKeyboard()
        .text(strings.man, "gender:" + Gender.male)
        .text(strings.female, "gender:" + Gender.female),
    })
  );

  // Gender
  bot.callbackQuery(/gender:(.+)/, async (ctx) => {
    try {
      const gender = ctx.match[1] as Gender;
      setUser(ctx, gender);
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

    const message = `${current + 1}/${quiz.length} \n${q.text}`;
    await ctx.reply(message, { reply_markup: keyboard });
  }

  async function sendResult(ctx: Context) {
    await ctx.reply(strings.done);
    const userId = ctx.from?.id;
    if (!userId) return;
    const user = userData.get(userId);
    if (!user) return;
    const result = new Map<Deity, number>();
    const quiz = user.gender === Gender.male ? male : female;
    Object.entries(user.answers).forEach((answer) => {
      const index = parseInt(answer[0]);
      const question = quiz[index];
      const value = answer[1];
      const previous = result.get(question.deity);
      result.set(question.deity, (previous ?? 0) + value);
    });
    const sortedResults = _.reverse(
      _.sortBy([...result], ([, value]) => value)
    );
    const message = sortedResults
      .map(
        ([deity, value], i) =>
          `${i + 1}. ${deities[deity]} \n${intToEmoji(value)}`
      )
      .join("\n");
    const mainDeity = sortedResults[0][0];
    const filename = `${mainDeity}.webp`;
    const imageBuffer = fs.readFileSync(
      path.join(process.cwd(), `assets/${filename}`)
    );
    await ctx.replyWithPhoto(new InputFile(imageBuffer, filename), {
      caption: message,
    });
  }

  bot.catch = (err) => {
    console.log(err);
  };

  bot.start();
};

export default startBot;
