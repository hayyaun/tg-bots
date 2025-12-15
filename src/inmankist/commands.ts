import { Bot, InlineKeyboard } from "grammy";
import log from "../log";
import { getUserName } from "../utils/string";
import { getQuizTypeName, quizTypes } from "./config";
import {
  getStringsForUser,
} from "./i18n";
import {
  getUserLanguage,
  hasUserLanguage,
  refreshUserLanguageTTL,
} from "../shared/i18n";
import { replyAbout } from "./reducer";
import { Language } from "../shared/types";
import { QuizType } from "../shared/types";
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

