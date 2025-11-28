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
  getStrings,
  getStringsForUser,
  getUserLanguage,
  setUserLanguage,
  hasUserLanguage,
  refreshUserLanguageTTL,
  DEFAULT_LANGUAGE,
} from "./i18n";
import {
  replyAbout,
  replyDetial,
  replyResult,
  selectOrder,
  selectQuizQuestion,
  setCustomCommands,
} from "./reducer";
import { Gender, Language, QuizMode, QuizType, Value } from "./types";
import {
  getUserData,
  setUserData,
  updateUserData,
  deleteUserData,
} from "./userData";

configDotenv();

const BOT_NAME = "Inmankist";
const ADMIN_USER_ID = process.env.ADMIN_USER_ID
  ? parseInt(process.env.ADMIN_USER_ID)
  : undefined;

const startBot = async (botKey: string, agent: unknown) => {
  // Bot
  const bot = new Bot(botKey, {
    client: { baseFetchConfig: { agent } },
  });

  // Admin notification helper
  async function notifyAdmin(message: string) {
    if (!ADMIN_USER_ID) return;
    try {
      await bot.api.sendMessage(ADMIN_USER_ID, `🤖 ${BOT_NAME}\n${message}`, {
        parse_mode: "HTML",
      });
    } catch (err) {
      log.error(BOT_NAME + " > Admin notification failed", err);
    }
  }

  // Note: No periodic logging - Redis TTL handles cleanup automatically

  async function setUser(ctx: Context, type: QuizType) {
    const userId = ctx.from?.id;
    if (!userId) throw new Error("UserId Inavalid!");
    const language = await getUserLanguage(userId);
    log.info(BOT_NAME + " > Begin", { type, user: ctx.from, language });

    // Notify admin about quiz start
    const userName = ctx.from?.username
      ? `@${ctx.from.username}`
      : `${ctx.from?.first_name || ""} ${ctx.from?.last_name || ""}`.trim();
    notifyAdmin(
      `🎯 <b>Quiz Started</b>\nUser: ${userName}\nID: <code>${userId}</code>\nType: ${type}\nLanguage: ${language}`
    );

    await setUserData(userId, {
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

  // Commands - use default language for commands
  const defaultStrings = getStrings(DEFAULT_LANGUAGE);
  const commands: BotCommand[] = [
    { command: "start", description: defaultStrings.start_btn },
    { command: "help", description: defaultStrings.help_btn },
    { command: "language", description: "🌐 Language / Язык / زبان / اللغة" },
  ];

  for (const key in quizTypes) {
    commands.push({
      command: key,
      description: defaultStrings.show_about(
        getQuizTypeName(key as QuizType, DEFAULT_LANGUAGE)
      ),
    });
  }

  await bot.api.setMyCommands(commands);

  bot.command("help", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    const strings = await getStringsForUser(ctx.from?.id);
    ctx.reply(strings.help);
  });

  bot.command("language", async (ctx) => {
    ctx.react("⚡").catch(() => {});
    const strings = await getStringsForUser(ctx.from?.id);
    const keyboard = new InlineKeyboard()
      .text("🇮🇷 فارسی", `lang:${Language.Persian}`)
      .text("🇬🇧 English", `lang:${Language.English}`)
      .row()
      .text("🇷🇺 Русский", `lang:${Language.Russian}`)
      .text("🇸🇦 العربية", `lang:${Language.Arabic}`);
    ctx.reply(strings.select_language, { reply_markup: keyboard });
  });

  bot.command("userdata", async (ctx) => {
    try {
      const userId = ctx.from?.id;
      if (!userId) {
        ctx.reply("❌ Unable to get user ID");
        return;
      }

      const userData = await getUserData(userId);
      if (!userData) {
        ctx.reply("ℹ️ No user data found. Start a quiz to create data!");
        return;
      }

      const dataString = JSON.stringify(userData, null, 2);
      // Escape HTML special characters
      const escapedData = dataString
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      await ctx.reply(
        `🗂 <b>Your User Data:</b>\n<pre><code class="language-json">${escapedData}</code></pre>`,
        {
          parse_mode: "HTML",
        }
      );
    } catch (err) {
      log.error(BOT_NAME + " > UserData Command", err);
      ctx.reply("❌ Error retrieving user data");
    }
  });

  bot.command("start", async (ctx) => {
    ctx.react("❤‍🔥").catch(() => {});
    if (typeof ctx.from !== "object") return;
    log.info(BOT_NAME + " > Start", { ...ctx.from });
    const userId = ctx.from.id;

    // Refresh language TTL on interaction
    refreshUserLanguageTTL(userId).catch((err) =>
      log.error(BOT_NAME + " > TTL Refresh Error", err)
    );

    const language = await getUserLanguage(userId);
    const strings = await getStringsForUser(userId);

    // Notify admin about new user
    const userName = ctx.from.username
      ? `@${ctx.from.username}`
      : `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim();
    notifyAdmin(
      `👤 <b>New Start</b>\nUser: ${userName}\nID: <code>${userId}</code>\nLanguage: ${language}`
    );

    // Check if user has selected language before (first time users)
    const userHasLanguage = await hasUserLanguage(userId);
    if (!userHasLanguage) {
      const langKeyboard = new InlineKeyboard()
        .text("🇮🇷 فارسی", `lang:${Language.Persian}`)
        .text("🇬🇧 English", `lang:${Language.English}`)
        .row()
        .text("🇷🇺 Русский", `lang:${Language.Russian}`)
        .text("🇸🇦 العربية", `lang:${Language.Arabic}`);
      ctx.reply(
        "🌐 Please select your language / Пожалуйста, выберите язык / لطفا زبان خود را انتخاب کنید / الرجاء اختيار لغتك:",
        { reply_markup: langKeyboard }
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
    const user = await getUserData(userId);
    if (!user) throw new Error("404 User Not Found!");
    const strings = getStrings(user.language || DEFAULT_LANGUAGE);

    const lenght = user.order.length;

    if (current >= lenght) {
      // Quiz finished
      const result = await replyResult(ctx, user);
      log.info(BOT_NAME + " > Complete", { userId, type: user.quiz, result });

      // Notify admin about quiz completion
      const userName = ctx.from?.username
        ? `@${ctx.from.username}`
        : `${ctx.from?.first_name || ""} ${ctx.from?.last_name || ""}`.trim();
      notifyAdmin(
        `✅ <b>Quiz Completed</b>\nUser: ${userName}\nID: <code>${userId}</code>\nType: ${user.quiz}\nResult: ${result}`
      );

      await deleteUserData(userId);
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
      await setUserLanguage(userId, language);
      ctx.answerCallbackQuery();
      const strings = await getStringsForUser(userId);
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
      notifyAdmin(
        `❌ <b>Error in Language</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Quiz Type
  bot.callbackQuery(/quiz:(.+)/, async (ctx) => {
    try {
      const type = ctx.match[1] as QuizType;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const language = await getUserLanguage(userId);
      const strings = await getStringsForUser(userId);
      ctx.answerCallbackQuery();
      ctx.editMessageText(
        `${strings.welcome} \n\n✅  ${getQuizTypeName(type, language)}`,
        { reply_markup: undefined }
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
      notifyAdmin(
        `❌ <b>Error in Quiz Type</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Quiz Mode
  bot.callbackQuery(/mode:(\d+)/, async (ctx) => {
    try {
      const mode = parseInt(ctx.match[1]) as QuizMode;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const user = await getUserData(userId);
      if (!user) throw new Error("404 User Not Found!");
      const language = user.language || DEFAULT_LANGUAGE;
      const strings = getStrings(language);
      ctx.answerCallbackQuery().catch(() => {});
      ctx.deleteMessage().catch(() => {});
      ctx.api
        .editMessageText(
          ctx.chat!.id!,
          user.welcomeId!,
          `${strings.welcome} \n\n✅  ${getQuizTypeName(user.quiz, language)} - ${getQuizModeName(mode, language)}`,
          { reply_markup: undefined }
        )
        .catch(() => {});
      await updateUserData(userId, { mode });
      ctx.reply(strings.gender, {
        reply_markup: new InlineKeyboard()
          .text(strings.male, `gender:${Gender.male}`)
          .text(strings.female, `gender:${Gender.female}`),
      });
    } catch (err) {
      log.error(BOT_NAME + " > Quiz Mode", err);
      notifyAdmin(
        `❌ <b>Error in Quiz Mode</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Gender
  bot.callbackQuery(/gender:(.+)/, async (ctx) => {
    try {
      const gender = ctx.match[1] as Gender;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const user = await getUserData(userId);
      if (!user) throw new Error("404 User Not Found!");
      const language = user.language || DEFAULT_LANGUAGE;
      const strings = getStrings(language);
      ctx.answerCallbackQuery().catch(() => {});
      ctx.deleteMessage().catch(() => {});
      ctx.api
        .editMessageText(
          ctx.chat!.id!,
          user.welcomeId!,
          `${strings.welcome} \n\n✅  ${getQuizTypeName(user.quiz, language)} - ${getQuizModeName(user.mode, language)} - ${gender === Gender.male ? strings.male : strings.female}`,
          { reply_markup: undefined }
        )
        .catch(() => {});
      user.gender = gender;
      user.order = selectOrder(user);
      await updateUserData(userId, { gender, order: user.order });
      sendQuestionOrResult(ctx, 0);
    } catch (err) {
      log.error(BOT_NAME + " > Gender", err);
      notifyAdmin(
        `❌ <b>Error in Gender</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  bot.callbackQuery(/answer:(\d+)-(\d+)/, async (ctx) => {
    try {
      const userId = ctx.from.id;
      const user = await getUserData(userId);
      if (!user) throw new Error("404 User Not Found!");
      const strings = getStrings(user.language || DEFAULT_LANGUAGE);
      ctx.answerCallbackQuery().catch(() => {});

      // Save/Update Answer
      const current = parseInt(ctx.match[1]);
      const selectedAnswer = parseInt(ctx.match[2]);
      if (selectedAnswer < 0) throw new Error("Not Valid Answer!");
      const isRevision = typeof user.answers[current] === "number";
      const noChange = user.answers[current] === selectedAnswer;

      // Go next question
      if (!isRevision || noChange) sendQuestionOrResult(ctx, current + 1);
      if (noChange) return;

      user.answers[current] = selectedAnswer;
      await updateUserData(userId, { answers: user.answers });

      // Update keyboard
      const keyboard = new InlineKeyboard();
      strings.values.forEach((v, i: Value) =>
        keyboard.text(i === selectedAnswer ? "✅" : v, `answer:${current}-${i}`)
      );

      // Edit the message with the new keyboard
      ctx.editMessageReplyMarkup({ reply_markup: keyboard });
    } catch (err) {
      log.error(BOT_NAME + " > Answer", err);
      notifyAdmin(
        `❌ <b>Error in Answer</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
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
      notifyAdmin(
        `❌ <b>Error in Detail</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  bot.catch = (err) => {
    log.error(BOT_NAME + " > BOT", err);
    notifyAdmin(`❌ <b>Critical Bot Error</b>\nError: ${err}`);
  };

  bot.start();

  await bot.init();

  // Notify admin that bot started successfully
  notifyAdmin(`🚀 <b>Bot Started</b>\nBot is now online and ready!`);

  return bot;
};

export default { startBot };
