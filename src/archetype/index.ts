import { configDotenv } from "dotenv";
import fs from "fs";
import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import _ from "lodash";
import path from "path";
import { SocksProxyAgent } from "socks-proxy-agent";
import { intToEmoji } from "../utils/emoji";
import { getQuizItem, getSample } from "./questions";
import strings, { deities } from "./strings";
import { Deity, Gender, IUserData, Value } from "./types";

configDotenv();

const PERIODIC_CLEAN = 60_000; // 1m
const USER_MAX_AGE = 3_600_000; // 1h
const SAMPLE_SIZE = process.env.DEV ? 1 : 5;
const SAMPLE_SIZE_BIG = 15;

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

  const setUser = async (ctx: Context, gender: Gender, mode: number) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    // TODO log new users
    const sampleSize = mode === 1 ? SAMPLE_SIZE_BIG : SAMPLE_SIZE;
    userData.set(userId, {
      date: Date.now(),
      gender,
      answers: {},
      order: getSample(gender, sampleSize),
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
        .text(strings.man0, `gender:${Gender.male}:0`)
        .text(strings.female0, `gender:${Gender.female}:0`)
        .row()
        .text(strings.man1, `gender:${Gender.male}:1`)
        .text(strings.female1, `gender:${Gender.female}:1`),
    })
  );

  // Gender
  bot.callbackQuery(/gender:(.+):(\d+)/, async (ctx) => {
    try {
      const gender = ctx.match[1] as Gender;
      const mode = parseInt(ctx.match[2]);
      await setUser(ctx, gender, mode);
      await ctx.answerCallbackQuery();
      await sendQuestion(ctx, 0);
    } catch (err) {
      console.log(err);
    }
  });

  // Quiz

  async function sendQuestion(ctx: Context, current: number) {
    const userId = ctx.from?.id;
    if (!userId) return;
    const user = userData.get(userId);
    if (!user) return;

    const question = getQuizItem(user.order, current, user.gender);
    const lenght = user.order.length;

    if (current >= lenght) {
      // Quiz finished
      await sendResult(ctx);
      userData.delete(userId);
      return;
    }

    const keyboard = new InlineKeyboard();
    strings.values.forEach((v, i: Value) =>
      keyboard.text(v, `answer:${current}-${i}`)
    );

    const message = `${current + 1}/${lenght} \n${question.text}`;
    await ctx.reply(message, { reply_markup: keyboard });
  }

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

  async function sendResult(ctx: Context) {
    await ctx.reply(strings.done);
    const userId = ctx.from?.id;
    if (!userId) return;
    const user = userData.get(userId);
    if (!user) return;
    const result = new Map<Deity, number>();
    Object.entries(user.answers).forEach((answer) => {
      const index = parseInt(answer[0]);
      const question = getQuizItem(user.order, index, user.gender);
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
