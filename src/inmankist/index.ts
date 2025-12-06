import { configDotenv } from "dotenv";
import { Bot, Context, InlineKeyboard } from "grammy";
import { BotCommand } from "grammy/types";
import log from "../log";
import { prisma } from "../db";
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
import { MATCHFOUND_BOT_USERNAME } from "./config";
import {
  replyAbout,
  replyDetial,
  replyResult,
  selectOrder,
  selectQuizQuestion,
  setCustomCommands,
} from "./reducer";
import { Gender, IUserData, Language, QuizMode, QuizType, Value } from "./types";
import {
  getUserData,
  setUserData,
  updateUserData,
  updateUserDataCache,
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

  // Helper function to handle expired/missing user data
  async function handleExpiredSession(ctx: Context): Promise<void> {
    await ctx.answerCallbackQuery("❌ جلسه منقضی شده است").catch(() => {});
    await ctx.reply("❌ جلسه شما منقضی شده است. لطفا دوباره با دستور /start شروع کنید.").catch(() => {});
  }

  // Helper function to get display name from Telegram user
  function getDisplayName(from: { first_name?: string; last_name?: string } | undefined): string | null {
    if (!from) return null;
    const name = `${from.first_name || ""} ${from.last_name || ""}`.trim();
    return name || null;
  }

  // Save quiz result to PostgreSQL
  async function saveQuizResultToDB(
    userId: number,
    quizType: QuizType,
    result: unknown,
    from?: { first_name?: string; last_name?: string }
  ): Promise<void> {
    try {
      const displayName = getDisplayName(from);
      
      // Get existing user to check if display_name already exists
      const existing = await prisma.user.findUnique({
        where: { telegram_id: BigInt(userId) },
        select: { display_name: true },
      });
      
      // Only set display_name if user doesn't already have one (don't overwrite manual changes)
      const shouldSetDisplayName = !existing || !existing.display_name;
      const finalDisplayName = shouldSetDisplayName ? displayName : undefined;
      
      if (quizType === QuizType.Archetype && Array.isArray(result) && result.length > 0) {
        // result is array of [Deity, number] tuples, get primary archetype
        const primaryArchetype = result[0][0];
        await prisma.user.upsert({
          where: { telegram_id: BigInt(userId) },
          create: {
            telegram_id: BigInt(userId),
            display_name: displayName,
            archetype_result: primaryArchetype,
          },
          update: {
            archetype_result: primaryArchetype,
            // Only update display_name if it doesn't exist
            ...(finalDisplayName !== undefined && { display_name: finalDisplayName }),
          },
        });
        log.info(BOT_NAME + " > Saved archetype result", { userId, archetype: primaryArchetype });
      } else if (quizType === QuizType.MBTI && typeof result === "string") {
        // result is MBTI type string
        await prisma.user.upsert({
          where: { telegram_id: BigInt(userId) },
          create: {
            telegram_id: BigInt(userId),
            display_name: displayName,
            mbti_result: result.toUpperCase(),
          },
          update: {
            mbti_result: result.toUpperCase(),
            // Only update display_name if it doesn't exist
            ...(finalDisplayName !== undefined && { display_name: finalDisplayName }),
          },
        });
        log.info(BOT_NAME + " > Saved MBTI result", { userId, mbti: result });
      }
    } catch (err) {
      log.error(BOT_NAME + " > Failed to save quiz result to PostgreSQL", err);
      // Don't fail the quiz completion if DB save fails
    }
  }

  function createLanguageKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text("🇮🇷 فارسی", `lang:${Language.Persian}`)
      .text("🇬🇧 English", `lang:${Language.English}`)
      .row()
      .text("🇷🇺 Русский", `lang:${Language.Russian}`)
      .text("🇸🇦 العربية", `lang:${Language.Arabic}`);
  }

  function createQuizTypesKeyboard(language: Language): InlineKeyboard {
    const keyboard = new InlineKeyboard();
    Object.keys(quizTypes).forEach((k) =>
      keyboard.text(getQuizTypeName(k as QuizType, language), `quiz:${k}`).row()
    );
    return keyboard;
  }

  function getUserName(ctx: Context): string {
    const from = ctx.from;
    if (!from) return "Unknown";
    return from.username
      ? `@${from.username}`
      : `${from.first_name || ""} ${from.last_name || ""}`.trim() || "Unknown";
  }

  function getLanguageName(language: Language): string {
    const names: { [key in Language]: string } = {
      [Language.Persian]: "فارسی",
      [Language.English]: "English",
      [Language.Russian]: "Русский",
      [Language.Arabic]: "العربية",
    };
    return names[language];
  }

  async function setUser(ctx: Context, type: QuizType) {
    const userId = ctx.from?.id;
    if (!userId) throw new Error("UserId Invalid!");
    const language = await getUserLanguage(userId);
    log.info(BOT_NAME + " > Begin", { type, user: ctx.from, language });

    // Notify admin about quiz start
    notifyAdmin(
      `🎯 <b>Quiz Started</b>\nUser: ${getUserName(ctx)}\nID: <code>${userId}</code>\nType: ${type}\nLanguage: ${language}`
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
    ctx.reply(strings.select_language, { reply_markup: createLanguageKeyboard() });
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
    notifyAdmin(
      `👤 <b>New Start</b>\nUser: ${getUserName(ctx)}\nID: <code>${userId}</code>\nLanguage: ${language}`
    );

    // Check if user has selected language before (first time users)
    const userHasLanguage = await hasUserLanguage(userId);
    if (!userHasLanguage) {
      ctx.reply(
        "🌐 Please select your language / Пожалуйста, выберите язык / لطفا زبان خود را انتخاب کنید / الرجاء اختيار لغتك:",
        { reply_markup: createLanguageKeyboard() }
      );
      return;
    }

    ctx.reply(strings.welcome, {
      reply_markup: createQuizTypesKeyboard(language),
    });
  });

  for (const key in quizTypes) {
    bot.command(key, (ctx) => replyAbout(ctx, key as QuizType));
  }

  await setCustomCommands(bot);

  // Callbacks

  // Quiz
  async function sendQuestionOrResult(ctx: Context, current: number, userData?: IUserData) {
    const userId = ctx.from?.id;
    if (!userId) throw new Error("UserId Invalid!");
    const user = userData || await getUserData(userId);
    if (!user) {
      // User data expired or not found - show helpful message
      await handleExpiredSession(ctx);
      return;
    }
    const strings = getStrings(user.language || DEFAULT_LANGUAGE);

    const length = user.order.length;

    if (current >= length) {
      // Quiz finished
      const result = await replyResult(ctx, user);
      log.info(BOT_NAME + " > Complete", { userId, type: user.quiz, result });

      // Save quiz result to PostgreSQL (with user profile info)
      await saveQuizResultToDB(userId, user.quiz, result, ctx.from);

      // Notify admin about quiz completion
      notifyAdmin(
        `✅ <b>Quiz Completed</b>\nUser: ${getUserName(ctx)}\nID: <code>${userId}</code>\nType: ${user.quiz}\nResult: ${result}`
      );

      // Ask user if they want to connect with people of their type
      const strings = getStrings(user.language || DEFAULT_LANGUAGE);
      const matchKeyboard = new InlineKeyboard()
        .url(strings.matchfound_button, `https://t.me/${MATCHFOUND_BOT_USERNAME}?start=quiz_complete`);

      await ctx.reply(strings.matchfound_message, { reply_markup: matchKeyboard });

      await deleteUserData(userId);
      return; // end
    }

    const keyboard = new InlineKeyboard();
    strings.values.forEach((v, i: Value) =>
      keyboard.text(v, `answer:${current}-${i}`)
    );

    const question = selectQuizQuestion(user, current);
    if (!question) throw new Error("Cannot find next question");
    const message = `${current + 1}/${length} \n\n${question.text}`;
    await ctx.reply(message, { reply_markup: keyboard });
  }

  // Language Selection
  bot.callbackQuery(/lang:(.+)/, async (ctx) => {
    try {
      const language = ctx.match[1] as Language;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      await setUserLanguage(userId, language);
      ctx.answerCallbackQuery().catch(() => {});
      const strings = await getStringsForUser(userId);
      ctx.editMessageText(
        `✅ ${strings.language}: ${getLanguageName(language)}\n\n${strings.welcome}`,
        {
          reply_markup: undefined,
        }
      ).catch(() => {});
      ctx.reply(strings.welcome, {
        reply_markup: createQuizTypesKeyboard(language),
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
      ctx.answerCallbackQuery().catch(() => {});
      ctx.editMessageText(
        `${strings.welcome} \n\n✅  ${getQuizTypeName(type, language)}`,
        { reply_markup: undefined }
      ).catch(() => {});
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
      if (!user) {
        await handleExpiredSession(ctx);
        return;
      }
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
      const updatedUser = await updateUserData(userId, { mode }, user);
      updateUserDataCache(userId, updatedUser);
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
      if (!user) {
        await handleExpiredSession(ctx);
        return;
      }
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
      const updatedUser = await updateUserData(userId, { gender, order: user.order }, user);
      updateUserDataCache(userId, updatedUser);
      await sendQuestionOrResult(ctx, 0, updatedUser);
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
      let user = await getUserData(userId);
      if (!user) {
        await handleExpiredSession(ctx);
        return;
      }
      const strings = getStrings(user.language || DEFAULT_LANGUAGE);
      ctx.answerCallbackQuery().catch(() => {});

      // Save/Update Answer
      const current = parseInt(ctx.match[1]);
      const selectedAnswer = parseInt(ctx.match[2]);
      if (selectedAnswer < 0) throw new Error("Not Valid Answer!");
      const isRevision = typeof user.answers[current] === "number";
      const noChange = user.answers[current] === selectedAnswer;
      const isLastQuestion = current + 1 >= user.order.length;

      // Save answer first if it changed (needed before quiz completion)
      if (!noChange) {
        user.answers[current] = selectedAnswer;
        // Pass existing user data to avoid redundant Redis read
        user = await updateUserData(userId, { answers: user.answers }, user);
        // Update cache immediately
        updateUserDataCache(userId, user);
      }

      // Go next question (or complete quiz if last question)
      if (!isRevision || noChange) {
        // Pass user data to avoid redundant Redis read
        await sendQuestionOrResult(ctx, current + 1, user);
        // If quiz completed, user data is deleted - return early
        if (isLastQuestion) return;
      }
      if (noChange) return;

      // Update keyboard
      const keyboard = new InlineKeyboard();
      strings.values.forEach((v, i: Value) =>
        keyboard.text(i === selectedAnswer ? "✅" : v, `answer:${current}-${i}`)
      );

      // Edit the message with the new keyboard
      ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
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
      ctx.answerCallbackQuery().catch(() => {});
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
