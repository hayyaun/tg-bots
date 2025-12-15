import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import log from "../log";
import { escapeMarkdownV2, getUserName } from "../utils/string";
import { getQuizTypeName, quizTypes } from "./config";
import {
  getStringsForUser,
  getUserLanguage,
  hasUserLanguage,
  refreshUserLanguageTTL,
} from "./i18n";
import { replyAbout, replyDetial } from "./reducer";
import { Language } from "../shared/types";
import { QuizType } from "./types";
import { getUserData } from "./userData";
import { setupProfileCommand } from "../shared/profileCommand";

const BOT_NAME = "Inmankist";

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

export function setupCommands(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
) {
  // /language command
  bot.command("language", async (ctx) => {
    ctx.react("⚡").catch(() => {});
    const strings = await getStringsForUser(ctx.from?.id);
    ctx.reply(strings.select_language, {
      reply_markup: createLanguageKeyboard(),
    });
  });

  // /userdata command
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

  // /history command
  bot.command("history", async (ctx) => {
    try {
      ctx.react("🤔").catch(() => {});
      const userId = ctx.from?.id;
      if (!userId) {
        ctx.reply("❌ Unable to get user ID");
        return;
      }

      const strings = await getStringsForUser(userId);
      const language = await getUserLanguage(userId);

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { telegram_id: BigInt(userId) },
        select: {
          archetype_result: true,
          mbti_result: true,
          leftright_result: true,
          politicalcompass_result: true,
          enneagram_result: true,
          bigfive_result: true,
        },
      });

      if (!user) {
        await ctx.reply(strings.history_empty);
        return;
      }

      // Build list of completed quizzes
      const results: Array<{ type: QuizType; result: string; displayName: string }> = [];

      if (user.archetype_result) {
        results.push({
          type: QuizType.Archetype,
          result: user.archetype_result,
          displayName: getQuizTypeName(QuizType.Archetype, language),
        });
      }

      if (user.mbti_result) {
        results.push({
          type: QuizType.MBTI,
          result: user.mbti_result,
          displayName: getQuizTypeName(QuizType.MBTI, language),
        });
      }

      if (user.leftright_result) {
        results.push({
          type: QuizType.LeftRight,
          result: user.leftright_result,
          displayName: getQuizTypeName(QuizType.LeftRight, language),
        });
      }

      if (user.politicalcompass_result) {
        results.push({
          type: QuizType.PoliticalCompass,
          result: user.politicalcompass_result,
          displayName: getQuizTypeName(QuizType.PoliticalCompass, language),
        });
      }

      if (user.enneagram_result) {
        results.push({
          type: QuizType.Enneagram,
          result: user.enneagram_result,
          displayName: getQuizTypeName(QuizType.Enneagram, language),
        });
      }

      if (user.bigfive_result) {
        results.push({
          type: QuizType.BigFive,
          result: user.bigfive_result,
          displayName: getQuizTypeName(QuizType.BigFive, language),
        });
      }

      if (results.length === 0) {
        await ctx.reply(strings.history_empty);
        return;
      }

      // Show summary first
      const messageLines = [strings.history_title, ""];
      results.forEach((item) => {
        // Escape Markdown special characters in result to avoid parsing issues
        const resultText = item.result || strings.history_no_results;
        const escapedResult = escapeMarkdownV2(resultText);
        messageLines.push(`• *${item.displayName}*: ${escapedResult}`);
      });

      await ctx.reply(messageLines.join("\n"), {
        parse_mode: "Markdown",
      });

      // Show each result with proper formatting using replyDetail
      for (const item of results) {
        try {
          await replyDetial(ctx, item.type, item.result);
          // Add small delay between messages to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          log.error(BOT_NAME + " > History Detail Error", {
            type: item.type,
            result: item.result,
            error: err,
          });
        }
      }
    } catch (err) {
      log.error(BOT_NAME + " > History Command", err);
      const strings = await getStringsForUser(ctx.from?.id);
      ctx.reply("❌ Error retrieving quiz history");
    }
  });

  // /start command
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

  // Quiz type commands (archetype, mbti, etc.)
  for (const key in quizTypes) {
    bot.command(key, (ctx) => replyAbout(ctx, key as QuizType));
  }

  // /profile command (using shared module)
  setupProfileCommand(bot, {
    botName: BOT_NAME,
    notifyAdmin,
  });
}

