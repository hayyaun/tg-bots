import { configDotenv } from "dotenv";
import { Bot, Context, InlineKeyboard } from "grammy";
import { BotCommand } from "grammy/types";
import { SocksProxyAgent } from "socks-proxy-agent";
import { quizModes, quizTypes } from "./config";
import {
  replyAbout,
  replyDetials,
  replyResult,
  selectOrder,
  selectQuizQuestion,
} from "./reducer";
import strings from "./strings";
import { Gender, IUserData, QuizMode, QuizType, Value } from "./types";

configDotenv();

const PERIODIC_CLEAN = 60_000; // 1m
const USER_MAX_AGE = 2 * 3_600_000; // 2h

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

  async function getUser(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return;
    const user = userData.get(userId);
    return user;
  }

  async function setUser(ctx: Context, type: QuizType) {
    const userId = ctx.from?.id;
    if (!userId) return;
    userData.set(userId, {
      welcomeId: ctx.callbackQuery?.message?.message_id,
      date: Date.now(),
      answers: {},
      // zero values - defaults
      quiz: type,
      mode: QuizMode.MD,
      gender: Gender.male,
      order: [],
    });
  }

  const bot = new Bot(process.env.ARCHETYPE_BOT_KEY!, {
    client: { baseFetchConfig: { agent: socksAgent } },
  });

  // Commands
  const commands: BotCommand[] = [
    { command: "start", description: strings.start_btn },
    { command: "help", description: strings.help_btn },
  ];

  for (const key in quizTypes) {
    commands.push({
      command: `about:${key}`,
      description: `درباره ${quizTypes[key]}`,
    });
  }

  await bot.api.setMyCommands(commands);

  bot.command("help", (ctx) => ctx.reply(strings.help));
  bot.command("start", (ctx) => {
    const keyboard = new InlineKeyboard();
    Object.keys(quizTypes).forEach((k) =>
      keyboard.text(quizTypes[k], `quiz:${k}`).row()
    );
    ctx.reply(strings.welcome, {
      reply_markup: keyboard,
    });
  });

  for (const key in quizTypes) {
    bot.command(`about:${key}`, (ctx) => replyAbout(ctx, key as QuizType));
  }

  // Quiz Type
  bot.callbackQuery(/quiz:(.+)/, async (ctx) => {
    try {
      const type = ctx.match[1] as QuizType;
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(
        `${strings.welcome} \n\n✅  ${quizTypes[type]}`,
        { reply_markup: undefined }
      );
      await setUser(ctx, type);
      const keyboard = new InlineKeyboard();
      Object.keys(quizModes).forEach((k) =>
        keyboard.text(quizModes[parseInt(k)].name, `mode:${k}`)
      );
      ctx.reply(strings.mode, {
        reply_markup: keyboard,
      });
    } catch (err) {
      console.error(err);
    }
  });

  // Quiz Mode
  bot.callbackQuery(/mode:(\d+)/, async (ctx) => {
    try {
      const mode = parseInt(ctx.match[1]) as QuizMode;
      const user = await getUser(ctx);
      if (!user) return;
      await ctx.answerCallbackQuery();
      await ctx.deleteMessage();
      await ctx.api.editMessageText(
        ctx.chat!.id!,
        user.welcomeId!,
        `${strings.welcome} \n\n✅  ${quizTypes[user.quiz]} - ${quizModes[mode].name}`,
        { reply_markup: undefined }
      );
      user.mode = mode;
      ctx.reply(strings.gender, {
        reply_markup: new InlineKeyboard()
          .text(strings.male, `gender:${Gender.male}`)
          .text(strings.female, `gender:${Gender.female}`),
      });
    } catch (err) {
      console.error(err);
    }
  });

  // Gender
  bot.callbackQuery(/gender:(.+)/, async (ctx) => {
    try {
      const gender = ctx.match[1] as Gender;
      const user = await getUser(ctx);
      if (!user) return;
      await ctx.answerCallbackQuery();
      await ctx.deleteMessage();
      await ctx.api.editMessageText(
        ctx.chat!.id!,
        user.welcomeId!,
        `${strings.welcome} \n\n✅  ${quizTypes[user.quiz]} - ${quizModes[user.mode].name} - ${gender === Gender.male ? strings.male : strings.female}`,
        { reply_markup: undefined }
      );
      user.gender = gender;
      user.order = await selectOrder(user);
      await sendQuestion(ctx, 0);
    } catch (err) {
      console.error(err);
    }
  });

  // Quiz
  async function sendQuestion(ctx: Context, current: number) {
    const userId = ctx.from?.id;
    if (!userId) return;
    const user = userData.get(userId);
    if (!user) return;

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

    const question = selectQuizQuestion(user, current);
    if (!question) return;
    const message = `${current + 1}/${lenght} \n\n${question.text}`;
    await ctx.reply(message, { reply_markup: keyboard });
  }

  bot.callbackQuery(/answer:(\d+)-(\d+)/, async (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = userData.get(userId);
      if (!user) return;

      // Save/Update Answer
      const current = parseInt(ctx.match[1]);
      const selectedAnswer = parseInt(ctx.match[2]);
      const isRevision = typeof user.answers[current] === "number";
      user.answers[current] = selectedAnswer;

      if (selectedAnswer < 0) return;

      // Update keyboard
      const keyboard = new InlineKeyboard();
      strings.values.forEach((v, i: Value) =>
        keyboard.text(i === selectedAnswer ? "✅" : v, `answer:${current}-${i}`)
      );

      // Edit the message with the new keyboard
      await ctx.answerCallbackQuery();
      await ctx.editMessageReplyMarkup({ reply_markup: keyboard });

      if (!isRevision) {
        // Go next question
        await sendQuestion(ctx, current + 1);
      }
    } catch (err) {
      console.error(err);
    }
  });

  async function sendResult(ctx: Context) {
    await ctx.reply(strings.done);
    const user = await getUser(ctx);
    if (!user) return;
    await replyResult(ctx, user);
  }

  // Details
  bot.callbackQuery(/detail:(.+):(.+)/, async (ctx) => {
    try {
      const type = ctx.match[1] as QuizType;
      const item = ctx.match[2];
      await ctx.answerCallbackQuery();
      await replyDetials(ctx, type, item);
    } catch (err) {
      console.error(err);
    }
  });

  bot.catch = (err) => {
    console.error(err);
  };

  bot.start();
};

export default startBot;
