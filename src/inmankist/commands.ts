import { Bot } from "grammy";
import log from "../log";
import {
  getUserLanguage,
  hasUserLanguage,
  refreshUserLanguageTTL,
} from "../shared/i18n";
import { replyAbout } from "./reducer";
import { QuizType } from "../shared/types";
import { getUserData } from "./userData";
import { setupProfileCommand } from "../shared/profileCommand";
import {
  showLanguageSelection,
  showQuizTypeSelection,
} from "./selectionHelpers";
import { quizTypes } from "./config";

const BOT_NAME = "Inmankist";

export function setupCommands(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
) {
  // /language command
  bot.command("language", async (ctx) => {
    ctx.react("⚡").catch(() => {});
    await showLanguageSelection(ctx);
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

    // Notify admin about new user
    notifyAdmin(
      `👤 <b>New Start</b>\nUser ID: <code>${userId}</code>\nLanguage: ${language}`
    );

    // Check if user has selected language before (first time users)
    const userHasLanguage = await hasUserLanguage(userId);
    if (!userHasLanguage) {
      await showLanguageSelection(ctx);
      return;
    }

    await showQuizTypeSelection(ctx, language);
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

