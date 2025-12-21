import { Bot, Context, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import log from "../log";
import {
  DEFAULT_LANGUAGE,
  getUserLanguage,
  hasUserLanguage,
  setUserLanguage,
} from "../shared/i18n";
import { setupProfileCallbacks } from "../shared/profileCallbacks";
import { Language, QuizType } from "../shared/types";
import { getDisplayNameFromUser } from "../utils/string";
import {
  getQuizModeName,
  getQuizTypeName,
  MATCHFOUND_BOT_USERNAME,
  quizNeedsGender,
} from "./config";
import { ANSWER_VALUES, getStrings, getStringsForUser } from "./i18n";
import {
  displaySavedResult,
  replyDetial,
  replyResult,
  selectOrder,
  selectQuizQuestion,
} from "./reducer";
import {
  showLanguageSelection,
  showQuizModeSelection,
  showQuizTypeSelection,
} from "./selectionHelpers";
import { getSession } from "./session";
import { Gender, IUserData, QuizMode, Value } from "./types";
import {
  deleteUserData,
  getUserData,
  setUserData,
  updateUserData,
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
      if (typeof result === "object" && result !== null && "type" in result) {
        // result is object with type and distribution - store just type
        return (result as { type: string }).type.toUpperCase();
      }
      // Fallback for old format (string)
      if (typeof result === "string") {
        return result.toUpperCase();
      }
      return null;

    case QuizType.LeftRight:
      if (
        typeof result === "object" &&
        result !== null &&
        "resultType" in result
      ) {
        // result is object with resultType, leftPercentage, rightPercentage - store just resultType
        return (result as { resultType: string }).resultType;
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

function getLanguageName(language: Language): string {
  const names: { [key in Language]: string } = {
    [Language.Persian]: "فارسی",
    [Language.English]: "English",
    [Language.Russian]: "Русский",
    [Language.Arabic]: "العربية",
  };
  return names[language];
}

async function updateWelcomeMessage(
  ctx: Context,
  welcomeId: number,
  quiz: QuizType,
  language: Language,
  mode?: QuizMode,
  gender?: Gender
): Promise<void> {
  const strings = getStrings(language);
  const parts: string[] = [getQuizTypeName(quiz, language)];

  if (mode !== undefined) {
    parts.push(getQuizModeName(mode, language));
  }

  if (gender !== undefined) {
    parts.push(gender === Gender.male ? strings.male : strings.female);
  }

  await ctx.api
    .editMessageText(
      ctx.chat!.id!,
      welcomeId,
      `${strings.welcome} \n\n✅  ${parts.join(" - ")}`,
      { reply_markup: undefined }
    )
    .catch(() => {});
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
    `🎯 <b>Quiz Started</b>\nUser ID: <code>${userId}</code>\nType: ${type}\nLanguage: ${language}`
  );

  await setUserData(userId, {
    welcomeId: ctx.callbackQuery?.message?.message_id,
    date: Date.now(),
    answers: {},
    // zero values - defaults
    quiz: type,
    mode: QuizMode.MD,
    order: [],
    language,
  });
}

// Find the next unanswered question position in order array
function findNextUnansweredQuestionPosition(user: IUserData): number | null {
  // Check if all questions are answered
  const allAnswered = user.order.every(
    (questionIndex) => typeof user.answers[questionIndex] === "number"
  );

  if (allAnswered) return null; // All questions answered

  // Find first unanswered question (return position in order array, not question index)
  for (let position = 0; position < user.order.length; position++) {
    const questionIndex = user.order[position];
    if (typeof user.answers[questionIndex] !== "number") {
      return position; // Return position in order array, not question index
    }
  }

  return null;
}

// Quiz
async function sendQuestionOrResult(
  ctx: Context,
  user: IUserData,
  notifyAdmin?: (message: string) => Promise<void>
) {
  const userId = ctx.from?.id;
  if (!userId) throw new Error("UserId Invalid!");
  if (!user) {
    // User data expired or not found - show helpful message
    await handleExpiredSession(ctx);
    return;
  }

  // Find next unanswered question (returns position in order array)
  const nextPosition = findNextUnansweredQuestionPosition(user);
  console.timeLog("DEBUG:ANSWER", "findNextUnansweredQuestionPosition");

  if (nextPosition === null) {
    // Quiz finished - all questions answered
    const result = await replyResult(ctx, user);
    log.info(BOT_NAME + " > Complete", { userId, type: user.quiz, result });

    // Save quiz result to PostgreSQL (with user profile info)
    await saveQuizResultToDB(userId, user.quiz, result, ctx.from);

    // Notify admin about quiz completion
    if (notifyAdmin) {
      notifyAdmin(
        `✅ <b>Quiz Completed</b>\nUser ID: <code>${userId}</code>\nType: ${user.quiz}`
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

  // nextPosition is the position in order array (0-indexed)
  const positionInOrder = nextPosition + 1; // 1-indexed for display
  const questionIndex = user.order[nextPosition]; // Actual question index from order array

  const keyboard = new InlineKeyboard();
  // Pre-select current answer if exists (for revisions)
  const currentAnswer = user.answers[questionIndex];
  ANSWER_VALUES.forEach((v, i: Value) =>
    keyboard.text(
      typeof currentAnswer === "number" && i === currentAnswer ? "✅" : v,
      `answer:${questionIndex}-${i}`
    )
  );

  const question = selectQuizQuestion(user, questionIndex);
  console.timeLog("DEBUG:ANSWER", "selectQuizQuestion");
  if (!question) throw new Error("Cannot find next question");
  const message = `${positionInOrder}/${user.order.length} \n\n${question.text}`;
  await ctx.reply(message, { reply_markup: keyboard });
}

export function setupCallbacks(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
) {
  // Language Selection
  bot.callbackQuery(/lang:(.+)/, async (ctx) => {
    // Answer callback query immediately to stop loading animation
    ctx.answerCallbackQuery().catch(() => {});

    try {
      const language = ctx.match[1] as Language;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      await setUserLanguage(userId, language);
      const strings = await getStringsForUser(userId);
      ctx
        .editMessageText(
          `✅ ${strings.language}: ${getLanguageName(language)}\n\n${strings.welcome}`,
          { reply_markup: undefined }
        )
        .catch(() => {});
      await showQuizTypeSelection(ctx, language);
    } catch (err) {
      log.error(BOT_NAME + " > Language", err);
      notifyAdmin(
        `❌ <b>Error in Language</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Quiz Type
  bot.callbackQuery(/quiz:(.+)/, async (ctx) => {
    // Answer callback query immediately to stop loading animation
    ctx.answerCallbackQuery().catch(() => {});

    try {
      const type = ctx.match[1] as QuizType;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      // Validate: If language is not set, show language selection
      const userHasLanguage = await hasUserLanguage(userId);
      if (!userHasLanguage) {
        await showLanguageSelection(ctx);
        return;
      }

      const language = await getUserLanguage(userId);
      const welcomeId = ctx.callbackQuery?.message?.message_id;
      if (welcomeId) {
        await updateWelcomeMessage(ctx, welcomeId, type, language);
      }

      // Display saved result if available
      await displaySavedResult(ctx, userId, type, language);

      await setUser(ctx, type, notifyAdmin);
      await showQuizModeSelection(ctx, language);
    } catch (err) {
      log.error(BOT_NAME + " > Quiz Type", err);
      notifyAdmin(
        `❌ <b>Error in Quiz Type</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Quiz Mode
  bot.callbackQuery(/mode:(\d+)/, async (ctx) => {
    // Answer callback query immediately to stop loading animation
    ctx.answerCallbackQuery().catch(() => {});

    try {
      const mode = parseInt(ctx.match[1]) as QuizMode;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const user = await getUserData(userId);
      if (!user) {
        await handleExpiredSession(ctx);
        return;
      }

      // Validate: If quiz type was not set, show quiz type selection
      if (!user.quiz) {
        const language =
          user.language || (await getUserLanguage(userId)) || DEFAULT_LANGUAGE;
        await showQuizTypeSelection(ctx, language);
        return;
      }

      const language = user.language || DEFAULT_LANGUAGE;
      const strings = getStrings(language);
      ctx.deleteMessage().catch(() => {});
      await updateWelcomeMessage(
        ctx,
        user.welcomeId!,
        user.quiz,
        language,
        mode
      );
      const updatedUser = await updateUserData(userId, { mode }, user);

      // Only ask for gender if the quiz type needs it
      if (quizNeedsGender(updatedUser.quiz)) {
        // Check if user has gender in database
        const dbUser = await prisma.user.findUnique({
          where: { telegram_id: BigInt(userId) },
          select: { gender: true },
        });

        if (
          dbUser?.gender &&
          (dbUser.gender === Gender.male || dbUser.gender === Gender.female)
        ) {
          // User has gender in database, use it and proceed
          const gender = dbUser.gender as Gender;
          updatedUser.gender = gender;
          updatedUser.order = selectOrder(updatedUser);
          const finalUser = await updateUserData(
            userId,
            { gender, order: updatedUser.order },
            updatedUser
          );
          await updateWelcomeMessage(
            ctx,
            updatedUser.welcomeId!,
            updatedUser.quiz,
            language,
            mode,
            gender
          );
          await sendQuestionOrResult(ctx, finalUser, notifyAdmin);
          return;
        }
        // No gender in database, ask for it
        ctx.reply(strings.gender, {
          reply_markup: new InlineKeyboard()
            .text(strings.male, `gender:${Gender.male}`)
            .text(strings.female, `gender:${Gender.female}`),
        });
      } else {
        // Quiz doesn't need gender, proceed directly
        updatedUser.order = selectOrder(updatedUser);
        const finalUser = await updateUserData(
          userId,
          { order: updatedUser.order },
          updatedUser
        );
        await sendQuestionOrResult(ctx, finalUser, notifyAdmin);
      }
    } catch (err) {
      log.error(BOT_NAME + " > Quiz Mode", err);
      notifyAdmin(
        `❌ <b>Error in Quiz Mode</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Gender
  bot.callbackQuery(/gender:(.+)/, async (ctx) => {
    // Answer callback query immediately to stop loading animation
    ctx.answerCallbackQuery().catch(() => {});

    try {
      const gender = ctx.match[1] as Gender;
      const userId = ctx.from?.id;
      if (!userId) throw new Error("UserId Invalid!");
      const user = await getUserData(userId);
      if (!user) {
        await handleExpiredSession(ctx);
        return;
      }

      // Validate: If quiz mode was not set, show quiz mode selection
      if (user.mode === undefined || user.mode === null) {
        const language = user.language || DEFAULT_LANGUAGE;
        await showQuizModeSelection(ctx, language);
        return;
      }

      // Defensive check: only process gender selection if quiz needs it
      if (!quizNeedsGender(user.quiz)) {
        await ctx
          .answerCallbackQuery("❌ This quiz doesn't require gender selection")
          .catch(() => {});
        return;
      }
      const language = user.language || DEFAULT_LANGUAGE;
      ctx.deleteMessage().catch(() => {});
      await updateWelcomeMessage(
        ctx,
        user.welcomeId!,
        user.quiz,
        language,
        user.mode,
        gender
      );
      user.gender = gender;
      user.order = selectOrder(user);
      const updatedUser = await updateUserData(
        userId,
        { gender, order: user.order },
        user
      );

      // Save gender to database
      await prisma.user.upsert({
        where: { telegram_id: BigInt(userId) },
        create: {
          telegram_id: BigInt(userId),
          gender: gender,
        },
        update: {
          gender: gender,
        },
      });

      await sendQuestionOrResult(ctx, updatedUser, notifyAdmin);
    } catch (err) {
      log.error(BOT_NAME + " > Gender", err);
      notifyAdmin(
        `❌ <b>Error in Gender</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Answer
  bot.callbackQuery(/answer:(\d+)-(\d+)/, async (ctx) => {
    // Answer callback query immediately to stop loading animation
    ctx.answerCallbackQuery().catch(() => {});
    console.time("DEBUG:ANSWER");

    const userId = ctx.from?.id;
    try {
      if (!userId) {
        throw new Error("UserId Invalid!");
      }

      let user = await getUserData(userId);
      if (!user) {
        await handleExpiredSession(ctx);
        return;
      }
      console.timeLog("DEBUG:ANSWER", "userData");

      // Save/Update Answer
      const questionIndex = parseInt(ctx.match[1]);
      const selectedAnswer = parseInt(ctx.match[2]);

      if (isNaN(questionIndex) || isNaN(selectedAnswer)) {
        throw new Error(
          `Invalid answer parameters: questionIndex=${ctx.match[1]}, selectedAnswer=${ctx.match[2]}`
        );
      }

      if (selectedAnswer < 0) {
        throw new Error(`Not Valid Answer! selectedAnswer=${selectedAnswer}`);
      }

      // Check if this question was previously answered
      const wasPreviouslyAnswered =
        typeof user.answers[questionIndex] === "number";

      // Save answer first (always save - needed for quiz completion check)
      user.answers[questionIndex] = selectedAnswer;
      // Pass existing user data to avoid redundant Redis read
      user = await updateUserData(userId, { answers: user.answers }, user);
      console.timeLog("DEBUG:ANSWER", "updateUserData");

      // Update keyboard
      const keyboard = new InlineKeyboard();
      ANSWER_VALUES.forEach((v, i: Value) =>
        keyboard.text(
          i === selectedAnswer ? "✅" : v,
          `answer:${questionIndex}-${i}`
        )
      );
      // Edit the message with the new keyboard
      ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
      console.timeLog("DEBUG:ANSWER", "editMessage");

      // Only send next question if this was a NEW answer (first time answering)
      // If user is updating an existing answer, don't send next question (it's already been sent)
      if (!wasPreviouslyAnswered) {
        // Answer is new (first time answering) - send next unanswered question
        await sendQuestionOrResult(ctx, user, notifyAdmin);
        console.timeLog("DEBUG:ANSWER", "sendQuestionOrResult");
      }

      console.timeEnd("DEBUG:ANSWER");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      log.error(BOT_NAME + " > Answer", {
        error: errorMessage,
        stack: errorStack,
        userId,
        match: ctx.match,
      });
      notifyAdmin(
        `❌ <b>Error in Answer</b>\nUser ID: <code>${userId || "unknown"}</code>\nError: ${errorMessage}`
      ).catch(() => {});
    }
  });

  // Details
  bot.callbackQuery(/detail:(.+):(.+)/, (ctx) => {
    // Answer callback query immediately to stop loading animation
    ctx.answerCallbackQuery().catch(() => {});

    try {
      const type = ctx.match[1] as QuizType;
      const item = ctx.match[2];
      replyDetial(ctx, type, item);
    } catch (err) {
      log.error(BOT_NAME + " > Detail", err);
      notifyAdmin(
        `❌ <b>Error in Detail</b>\nUser: <code>${ctx.from?.id}</code>\nError: ${err}`
      );
    }
  });

  // Setup shared profile callbacks (all profile editing)
  setupProfileCallbacks(bot, {
    botName: BOT_NAME,
    getSession,
    notifyAdmin,
  });
}
