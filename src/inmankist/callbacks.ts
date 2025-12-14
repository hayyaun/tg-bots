import { Bot, Context, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import log from "../log";
import { getDisplayNameFromUser, getUserName } from "../utils/string";
import {
  getQuizModeName,
  getQuizTypeName,
  quizModes,
  quizTypes,
  MATCHFOUND_BOT_USERNAME,
} from "./config";
import {
  getStrings,
  getStringsForUser,
  getUserLanguage,
  setUserLanguage,
  DEFAULT_LANGUAGE,
  ANSWER_VALUES,
} from "./i18n";
import {
  replyResult,
  replyDetial,
  selectOrder,
  selectQuizQuestion,
} from "./reducer";
import {
  Gender,
  IUserData,
  Language,
  QuizMode,
  QuizType,
  Value,
} from "./types";
import {
  getUserData,
  setUserData,
  updateUserData,
  updateUserDataCache,
  deleteUserData,
} from "./userData";

const BOT_NAME = "Inmankist";

// Helper function to handle expired/missing user data
async function handleExpiredSession(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery("❌ جلسه منقضی شده است").catch(() => {});
  await ctx
    .reply("❌ جلسه شما منقضی شده است. لطفا دوباره با دستور /start شروع کنید.")
    .catch(() => {});
}

// Extract and process quiz result based on type
type QuizResultValue = string | null;

function extractQuizResult(
  quizType: QuizType,
  result: unknown
): QuizResultValue {
  switch (quizType) {
    case QuizType.Archetype:
      if (Array.isArray(result) && result.length > 0) {
        // result is array of [Deity, number] tuples, get primary archetype
        return result[0][0] as string;
      }
      return null;

    case QuizType.MBTI:
      if (typeof result === "string") {
        return result.toUpperCase();
      }
      return null;

    case QuizType.LeftRight:
      if (typeof result === "string") {
        return result;
      }
      return null;

    case QuizType.PoliticalCompass:
      if (
        typeof result === "object" &&
        result !== null &&
        "quadrant" in result
      ) {
        // result is object with quadrant, economicScore, socialScore - store just quadrant
        return (result as { quadrant: string }).quadrant;
      }
      return null;

    case QuizType.Enneagram:
      if (Array.isArray(result) && result.length > 0) {
        // result is array of [EnneagramType, number] tuples, get primary type
        return result[0][0] as string;
      }
      return null;

    case QuizType.BigFive:
      if (typeof result === "object" && result !== null) {
        // result is object with traits and aspects - store as JSON string
        return JSON.stringify(result);
      }
      return null;

    default:
      return null;
  }
}

// Map quiz types to database field names
const QUIZ_FIELD_MAP: Record<QuizType, string> = {
  [QuizType.Archetype]: "archetype_result",
  [QuizType.MBTI]: "mbti_result",
  [QuizType.LeftRight]: "leftright_result",
  [QuizType.PoliticalCompass]: "politicalcompass_result",
  [QuizType.Enneagram]: "enneagram_result",
  [QuizType.BigFive]: "bigfive_result",
} as const;

// Save quiz result to PostgreSQL
async function saveQuizResultToDB(
  userId: number,
  quizType: QuizType,
  result: unknown,
  from?: { first_name?: string; last_name?: string; username?: string }
): Promise<void> {
  try {
    const resultValue = extractQuizResult(quizType, result);
    if (resultValue === null) {
      log.warn(BOT_NAME + " > Invalid quiz result format", {
        userId,
        quizType,
        result,
      });
      return;
    }

    const displayName = getDisplayNameFromUser(from);
    const username = from?.username || null;

    // Get existing user to check what fields already exist
    const existing = await prisma.user.findUnique({
      where: { telegram_id: BigInt(userId) },
      select: { display_name: true, username: true },
    });

    // Only update display_name if user doesn't already have one (don't overwrite manual changes)
    const shouldSetDisplayName = !existing || !existing.display_name;
    const finalDisplayName = shouldSetDisplayName ? displayName : undefined;

    // Update username if provided and different (similar to matchfound bot behavior)
    const shouldUpdateUsername = username && existing?.username !== username;

    const fieldName = QUIZ_FIELD_MAP[quizType];
    if (!fieldName) {
      log.error(BOT_NAME + " > Unknown quiz type", { userId, quizType });
      return;
    }

    // Build update data object
    const updateData: Record<string, unknown> = {
      [fieldName]: resultValue,
    };

    if (finalDisplayName != null) {
      updateData.display_name = finalDisplayName;
    }

    if (shouldUpdateUsername) {
      updateData.username = username;
    }

    await prisma.user.upsert({
      where: { telegram_id: BigInt(userId) },
      create: {
        telegram_id: BigInt(userId),
        display_name: displayName,
        username: username,
        [fieldName]: resultValue,
      },
      update: updateData,
    });

    log.info(BOT_NAME + " > Saved quiz result", {
      userId,
      quizType,
      result: resultValue,
      usernameUpdated: shouldUpdateUsername,
    });
  } catch (err) {
    log.error(BOT_NAME + " > Failed to save quiz result to PostgreSQL", err);
    // Don't fail the quiz completion if DB save fails
  }
}

function createQuizTypesKeyboard(language: Language): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  Object.keys(quizTypes).forEach((k) =>
    keyboard.text(getQuizTypeName(k as QuizType, language), `quiz:${k}`).row()
  );
  return keyboard;
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

async function setUser(
  ctx: Context,
  type: QuizType,
  notifyAdmin: (message: string) => Promise<void>
) {
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

// Quiz
async function sendQuestionOrResult(
  ctx: Context,
  current: number,
  userData?: IUserData,
  notifyAdmin?: (message: string) => Promise<void>
) {
  const userId = ctx.from?.id;
  if (!userId) throw new Error("UserId Invalid!");
  const user = userData || (await getUserData(userId));
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
    // Format result for display (stringify objects/arrays)
    let resultDisplay: string;
    if (typeof result === "object" && result !== null) {
      resultDisplay = JSON.stringify(result);
    } else if (Array.isArray(result)) {
      resultDisplay = JSON.stringify(result);
    } else {
      resultDisplay = String(result);
    }

    if (notifyAdmin) {
      notifyAdmin(
        `✅ <b>Quiz Completed</b>\nUser: ${getUserName(ctx)}\nID: <code>${userId}</code>\nType: ${user.quiz}\nResult: ${resultDisplay}`
      );
    }

    // Ask user if they want to connect with people of their type
    const strings = getStrings(user.language || DEFAULT_LANGUAGE);
    const matchKeyboard = new InlineKeyboard().url(
      strings.matchfound_button,
      `https://t.me/${MATCHFOUND_BOT_USERNAME}?start=quiz_complete`
    );

    await ctx.reply(strings.matchfound_message, {
      reply_markup: matchKeyboard,
    });

    await deleteUserData(userId);
    return; // end
  }

  const keyboard = new InlineKeyboard();
  ANSWER_VALUES.forEach((v, i: Value) =>
    keyboard.text(v, `answer:${current}-${i}`)
  );

  const question = selectQuizQuestion(user, current);
  if (!question) throw new Error("Cannot find next question");
  const message = `${current + 1}/${length} \n\n${question.text}`;
  await ctx.reply(message, { reply_markup: keyboard });
}

export function setupCallbacks(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
) {
  // Language Selection
  bot.callbackQuery(/lang:(.+)/, async (ctx) => {
    try {
      const language = ctx.match[1] as Language;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      await setUserLanguage(userId, language);
      ctx.answerCallbackQuery().catch(() => {});
      const strings = await getStringsForUser(userId);
      ctx
        .editMessageText(
          `✅ ${strings.language}: ${getLanguageName(language)}\n\n${strings.welcome}`,
          { reply_markup: undefined }
        )
        .catch(() => {});
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
      ctx
        .editMessageText(
          `${strings.welcome} \n\n✅  ${getQuizTypeName(type, language)}`,
          { reply_markup: undefined }
        )
        .catch(() => {});
      await setUser(ctx, type, notifyAdmin);
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
      const updatedUser = await updateUserData(
        userId,
        { gender, order: user.order },
        user
      );
      updateUserDataCache(userId, updatedUser);
      await sendQuestionOrResult(ctx, 0, updatedUser, notifyAdmin);
    } catch (err) {
      log.error(BOT_NAME + " > Gender", err);
      notifyAdmin(
        `❌ <b>Error in Gender</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Answer
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
        await sendQuestionOrResult(ctx, current + 1, user, notifyAdmin);
        // If quiz completed, user data is deleted - return early
        if (isLastQuestion) return;
      }
      if (noChange) return;

      // Update keyboard
      const keyboard = new InlineKeyboard();
      ANSWER_VALUES.forEach((v, i: Value) =>
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
}
