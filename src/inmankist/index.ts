import { configDotenv } from "dotenv";
import { Bot, Context, InlineKeyboard } from "grammy";
import { BotCommand } from "grammy/types";
import log from "../log";
import {
  getQuizModeName,
  getQuizTypeName,
  quizModes,
  quizTypes,
} from "./config";
import {
  getStringsForUser,
  getUserLanguage,
  setUserLanguage,
  userLanguages,
} from "./i18n";
import {
  replyAbout,
  replyDetial,
  replyResult,
  selectOrder,
  selectQuizQuestion,
  setCustomCommands,
} from "./reducer";
import {
  Gender,
  IUserData,
  Language,
  QuizMode,
  QuizType,
  Value,
} from "./types";

configDotenv();

const BOT_NAME = "Inmankist";
const PERIODIC_CLEAN = process.env.DEV ? 5_000 : 5 * 60_000; // 5m
const USER_MAX_AGE = (process.env.DEV ? 5 : 24 * 60) * 60_000; // 24h

const startBot = async (botKey: string, agent: unknown) => {
  // Storage
  const userData = new Map<number, IUserData>();

  setInterval(() => {
    const now = Date.now();
    userData.forEach((ud, key) => {
      if (now - ud.date < USER_MAX_AGE) return;
      userData.delete(key);
      log.info(BOT_NAME + " > Delete", { user: key, remaining: userData.size });
    });
  }, PERIODIC_CLEAN);

  async function getUser(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) throw new Error("UserId Inavalid!");
    const user = userData.get(userId);
    return user;
  }

  async function setUser(ctx: Context, type: QuizType) {
    const userId = ctx.from?.id;
    if (!userId) throw new Error("UserId Inavalid!");
    const language = getUserLanguage(userId);
    log.info(BOT_NAME + " > Begin", { type, user: ctx.from, language });
    userData.set(userId, {
      welcomeId: ctx.callbackQuery?.message?.message_id,
      date: Date.now(),
      answers: {},
      // zero values - defaults
      quiz: type,
      mode: QuizMode.MD,
      gender: Gender.male,
      order: [],
      language,
    });
  }

  // Bot
  const bot = new Bot(botKey, {
    client: { baseFetchConfig: { agent } },
  });

  // Commands - use default language for commands
  const defaultStrings = getStringsForUser();
  const commands: BotCommand[] = [
    { command: "start", description: defaultStrings.start_btn },
    { command: "help", description: defaultStrings.help_btn },
    { command: "language", description: "🌐 Language / Язык / زبان / اللغة" },
  ];

  for (const key in quizTypes) {
    commands.push({
      command: key,
      description: defaultStrings.show_about(
        getQuizTypeName(key as QuizType, Language.Persian)
      ),
    });
  }

  await bot.api.setMyCommands(commands);

  bot.command("help", (ctx) => {
    ctx.react("🤔");
    const strings = getStringsForUser(ctx.from?.id);
    ctx.reply(strings.help);
  });

  bot.command("language", (ctx) => {
    ctx.react("⚡");
    const strings = getStringsForUser(ctx.from?.id);
    const keyboard = new InlineKeyboard()
      .text("🇮🇷 فارسی", `lang:${Language.Persian}`)
      .text("🇬🇧 English", `lang:${Language.English}`)
      .row()
      .text("🇷🇺 Русский", `lang:${Language.Russian}`)
      .text("🇸🇦 العربية (Archetype only)", `lang:${Language.Arabic}`);
    ctx.reply(strings.select_language, { reply_markup: keyboard });
  });

  bot.command("start", (ctx) => {
    ctx.react("❤‍🔥");
    if (typeof ctx.from !== "object") return;
    log.info(BOT_NAME + " > Start", { ...ctx.from });
    const userId = ctx.from.id;
    const language = getUserLanguage(userId);
    const strings = getStringsForUser(userId);

    // Check if user has selected language before (first time users)
    if (!userLanguages.has(userId)) {
      const langKeyboard = new InlineKeyboard()
        .text("🇮🇷 فارسی", `lang:${Language.Persian}`)
        .text("🇬🇧 English", `lang:${Language.English}`)
        .row()
        .text("🇷🇺 Русский", `lang:${Language.Russian}`)
        .text("🇸🇦 العربية", `lang:${Language.Arabic}`);
      ctx.reply(
        "🌐 Please select your language / Пожалуйста, выберите язык / لطفا زبان خود را انتخاب کنید / الرجاء اختيار لغتك:",
        {
          reply_markup: langKeyboard,
        }
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    Object.keys(quizTypes).forEach((k) =>
      keyboard.text(getQuizTypeName(k as QuizType, language), `quiz:${k}`).row()
    );
    ctx.reply(strings.welcome, {
      reply_markup: keyboard,
    });
  });

  for (const key in quizTypes) {
    bot.command(key, (ctx) => replyAbout(ctx, key as QuizType));
  }

  await setCustomCommands(bot);

  // Callbacks

  // Quiz
  async function sendQuestionOrResult(ctx: Context, current: number) {
    const userId = ctx.from?.id;
    if (!userId) throw new Error("UserId Inavalid!");
    const user = userData.get(userId);
    if (!user) throw new Error("404 User Not Found!");
    const strings = getStringsForUser(userId);

    const lenght = user.order.length;

    if (current >= lenght) {
      // Quiz finished
      const result = await replyResult(ctx, user);
      log.info(BOT_NAME + " > Complete", { userId, type: user.quiz, result });
      userData.delete(userId);
      return; // end
    }

    const keyboard = new InlineKeyboard();
    strings.values.forEach((v, i: Value) =>
      keyboard.text(v, `answer:${current}-${i}`)
    );

    const question = selectQuizQuestion(user, current);
    if (!question) throw new Error("Cannot find next question");
    const message = `${current + 1}/${lenght} \n\n${question.text}`;
    await ctx.reply(message, { reply_markup: keyboard });
  }

  // Language Selection
  bot.callbackQuery(/lang:(.+)/, async (ctx) => {
    try {
      const language = ctx.match[1] as Language;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      setUserLanguage(userId, language);
      ctx.answerCallbackQuery();
      const strings = getStringsForUser(userId);
      const langName =
        language === Language.Persian
          ? "فارسی"
          : language === Language.English
            ? "English"
            : language === Language.Russian
              ? "Русский"
              : "العربية";
      ctx.editMessageText(
        `✅ ${strings.language}: ${langName}\n\n${strings.welcome}`,
        {
          reply_markup: undefined,
        }
      );
      const keyboard = new InlineKeyboard();
      Object.keys(quizTypes).forEach((k) =>
        keyboard
          .text(getQuizTypeName(k as QuizType, language), `quiz:${k}`)
          .row()
      );
      ctx.reply(strings.welcome, {
        reply_markup: keyboard,
      });
    } catch (err) {
      log.error(BOT_NAME + " > Language", err);
    }
  });

  // Quiz Type
  bot.callbackQuery(/quiz:(.+)/, async (ctx) => {
    try {
      const type = ctx.match[1] as QuizType;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const language = getUserLanguage(userId);
      const strings = getStringsForUser(userId);
      ctx.answerCallbackQuery();
      ctx.editMessageText(
        `${strings.welcome} \n\n✅  ${getQuizTypeName(type, language)}`,
        {
          reply_markup: undefined,
        }
      );
      await setUser(ctx, type);
      const keyboard = new InlineKeyboard();
      Object.keys(quizModes).forEach((k) =>
        keyboard.text(
          getQuizModeName(parseInt(k) as QuizMode, language),
          `mode:${k}`
        )
      );
      ctx.reply(strings.mode, {
        reply_markup: keyboard,
      });
    } catch (err) {
      log.error(BOT_NAME + " > Quiz Type", err);
    }
  });

  // Quiz Mode
  bot.callbackQuery(/mode:(\d+)/, async (ctx) => {
    try {
      const mode = parseInt(ctx.match[1]) as QuizMode;
      const user = await getUser(ctx);
      if (!user) throw new Error("404 User Not Found!");
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const language = getUserLanguage(userId);
      const strings = getStringsForUser(userId);
      ctx.answerCallbackQuery();
      ctx.deleteMessage();
      ctx.api.editMessageText(
        ctx.chat!.id!,
        user.welcomeId!,
        `${strings.welcome} \n\n✅  ${getQuizTypeName(user.quiz, language)} - ${getQuizModeName(mode, language)}`,
        { reply_markup: undefined }
      );
      user.mode = mode;
      ctx.reply(strings.gender, {
        reply_markup: new InlineKeyboard()
          .text(strings.male, `gender:${Gender.male}`)
          .text(strings.female, `gender:${Gender.female}`),
      });
    } catch (err) {
      log.error(BOT_NAME + " > Quiz Mode", err);
    }
  });

  // Gender
  bot.callbackQuery(/gender:(.+)/, async (ctx) => {
    try {
      const gender = ctx.match[1] as Gender;
      const user = await getUser(ctx);
      if (!user) throw new Error("404 User Not Found!");
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const language = getUserLanguage(userId);
      const strings = getStringsForUser(userId);
      ctx.answerCallbackQuery();
      await ctx.deleteMessage();
      ctx.api.editMessageText(
        ctx.chat!.id!,
        user.welcomeId!,
        `${strings.welcome} \n\n✅  ${getQuizTypeName(user.quiz, language)} - ${getQuizModeName(user.mode, language)} - ${gender === Gender.male ? strings.male : strings.female}`,
        { reply_markup: undefined }
      );
      user.gender = gender;
      user.order = selectOrder(user);
      sendQuestionOrResult(ctx, 0);
    } catch (err) {
      log.error(BOT_NAME + " > Gender", err);
    }
  });

  bot.callbackQuery(/answer:(\d+)-(\d+)/, (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = userData.get(userId);
      if (!user) throw new Error("404 User Not Found!");
      const strings = getStringsForUser(userId);
      ctx.answerCallbackQuery();

      // Save/Update Answer
      const current = parseInt(ctx.match[1]);
      const selectedAnswer = parseInt(ctx.match[2]);
      if (selectedAnswer < 0) throw new Error("Not Valid Answer!");
      const isRevision = typeof user.answers[current] === "number";
      if (isRevision && user.answers[current] === selectedAnswer) return; // no change
      user.answers[current] = selectedAnswer;

      // Update keyboard
      const keyboard = new InlineKeyboard();
      strings.values.forEach((v, i: Value) =>
        keyboard.text(i === selectedAnswer ? "✅" : v, `answer:${current}-${i}`)
      );

      // Edit the message with the new keyboard
      ctx.editMessageReplyMarkup({ reply_markup: keyboard });
      // Go next question
      if (!isRevision) sendQuestionOrResult(ctx, current + 1);
    } catch (err) {
      log.error(BOT_NAME + " > Answer", err);
    }
  });

  // Details
  bot.callbackQuery(/detail:(.+):(.+)/, (ctx) => {
    try {
      const type = ctx.match[1] as QuizType;
      const item = ctx.match[2];
      ctx.answerCallbackQuery();
      replyDetial(ctx, type, item);
    } catch (err) {
      log.error(BOT_NAME + " > Detail", err);
    }
  });

  bot.catch = (err) => {
    log.error(BOT_NAME + " > BOT", err);
  };

  bot.start();

  await bot.init();
  return bot;
};

export default { startBot };
