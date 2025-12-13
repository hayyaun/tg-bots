import { configDotenv } from "dotenv";
import { Bot, Context, InlineKeyboard, InlineQueryResultBuilder } from "grammy";
import log from "../log";
import { getWithPrefix, setWithPrefix, delWithPrefix } from "../redis";
import redis from "../redis";
import { setupBotErrorHandling, initializeBot } from "../utils/bot";
import { getTodayDateKey, getSecondsUntilMidnightUTC } from "../utils/date";

configDotenv();

const BOT_NAME = "Converslation";
const REDIS_PREFIX = "converslation";
const USER_LANG_TTL = 14 * 24 * 60 * 60; // 2 weeks in seconds
const MAX_DAILY_TRANSLATIONS = 1000;

// Popular languages for quick selection
const POPULAR_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fa", name: "Persian", flag: "🇮🇷" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
];

async function translateWithChatGPT(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const systemPrompt = sourceLang
      ? `You are a translator helping friends communicate. Translate the following text from ${sourceLang} to ${targetLang}. CRITICAL: Preserve the exact meaning - do not add, remove, or change any information. Keep the translation natural and conversational (not overly formal), but accuracy is the top priority. Match the tone and emotion of the original. Only return the translation, nothing else.`
      : `You are a translator helping friends communicate. Translate the following text to ${targetLang}. CRITICAL: Preserve the exact meaning - do not add, remove, or change any information. Keep the translation natural and conversational (not overly formal), but accuracy is the top priority. Match the tone and emotion of the original. Only return the translation, nothing else.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content?.trim();

    if (!translation) {
      throw new Error("No translation received from API");
    }

    return translation;
  } catch (error) {
    log.error(BOT_NAME + " > Translation Error", error);
    throw error;
  }
}

async function getTargetLanguage(userId: number): Promise<string | null> {
  return await getWithPrefix(REDIS_PREFIX, `user:${userId}:lang`);
}

async function setTargetLanguage(userId: number, language: string): Promise<void> {
  await setWithPrefix(REDIS_PREFIX, `user:${userId}:lang`, language, USER_LANG_TTL);
  log.info(BOT_NAME + " > Set Language", { userId, language });
}

async function refreshLanguageTTL(userId: number): Promise<void> {
  const targetLang = await getTargetLanguage(userId);
  if (targetLang) {
    // Refresh TTL by resetting the key
    await setWithPrefix(REDIS_PREFIX, `user:${userId}:lang`, targetLang, USER_LANG_TTL);
  }
}


// Get today's translation count for a user
async function getDailyTranslationCount(userId: number): Promise<number> {
  const dateKey = getTodayDateKey();
  const countKey = `${REDIS_PREFIX}:user:${userId}:translations:${dateKey}`;
  const count = await redis.get(countKey);
  return count ? parseInt(count, 10) : 0;
}

// Increment today's translation count for a user
async function incrementDailyTranslationCount(userId: number): Promise<number> {
  const dateKey = getTodayDateKey();
  const countKey = `${REDIS_PREFIX}:user:${userId}:translations:${dateKey}`;
  const ttl = getSecondsUntilMidnightUTC();
  
  // Use INCR to atomically increment, and set TTL if key is new
  const count = await redis.incr(countKey);
  if (count === 1) {
    // First increment, set TTL
    await redis.expire(countKey, ttl);
  }
  
  return count;
}

const startBot = async (botKey: string, agent: unknown) => {
  const bot = new Bot(botKey, {
    client: { baseFetchConfig: { agent } },
  });

  // Register bot commands
  const commands = [
    { command: "start", description: "Start the bot and see welcome message" },
    { command: "help", description: "Show help and usage instructions" },
    { command: "setlang", description: "Set target translation language" },
    { command: "mylang", description: "Show current language setting" },
    { command: "clearlang", description: "Clear language setting for this chat" },
    { command: "usage", description: "Check your daily translation usage" },
  ];

  await bot.api.setMyCommands(commands);

  // Command: /start
  bot.command("start", async (ctx) => {
    ctx.react("🎉");
    const welcomeText = [
      "👋 Welcome to Converslation Bot!",
      "",
      "🌐 I help you communicate in any language with your friends!",
      "",
      "📱 How to use:",
      "1. Set your friend's language using /setlang",
      "2. In any chat, type @" +
        (bot.botInfo?.username || "converslation_bot") +
        " followed by your message",
      "3. End with . ! or ? to translate",
      "4. Tap the result to send!",
      "",
      "💡 Use /help for more information",
    ].join("\n");

    await ctx.reply(welcomeText);
  });

  // Command: /help
  bot.command("help", async (ctx) => {
    const helpText = [
      "📖 Converslation Bot Help",
      "",
      "Commands:",
      "/start - Start the bot",
      "/setlang - Set target language",
      "/mylang - Show current language setting",
      "/clearlang - Clear language setting",
      "/help - Show this help message",
      "",
      "Inline Usage:",
      "In any chat, type:",
      "@" +
        (bot.botInfo?.username || "converslation_bot") +
        " your message here",
      "",
      "⚡ Important: End with . ! or ? to trigger translation!",
      "",
      "Examples:",
      "@" +
        (bot.botInfo?.username || "converslation_bot") +
        " Hello!",
      "@" +
        (bot.botInfo?.username || "converslation_bot") +
        " How are you?",
      "@" +
        (bot.botInfo?.username || "converslation_bot") +
        " Good morning.",
      "",
      "💡 Natural sentence endings trigger translation!",
    ].join("\n");

    await ctx.reply(helpText);
  });

  // Command: /setlang
  bot.command("setlang", async (ctx) => {
    const keyboard = new InlineKeyboard();

    // Add popular languages
    POPULAR_LANGUAGES.forEach((lang, index) => {
      keyboard.text(`${lang.flag} ${lang.name}`, `lang:${lang.code}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });

    await ctx.reply(
      "🌐 Select the language you want to translate to:",
      { reply_markup: keyboard }
    );
  });

  // Command: /mylang
  bot.command("mylang", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const targetLang = await getTargetLanguage(userId);
    if (!targetLang) {
      await ctx.reply("❌ No language set. Use /setlang to set one.");
      return;
    }

    const langInfo = POPULAR_LANGUAGES.find((l) => l.code === targetLang);
    const langName = langInfo
      ? `${langInfo.flag} ${langInfo.name}`
      : targetLang;

    await ctx.reply(`🌐 Your translation language: ${langName}`);
  });

  // Command: /clearlang
  bot.command("clearlang", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await delWithPrefix(REDIS_PREFIX, `user:${userId}:lang`);

    await ctx.reply("✅ Language setting cleared.");
  });

  // Command: /usage
  bot.command("usage", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const count = await getDailyTranslationCount(userId);
    const remaining = MAX_DAILY_TRANSLATIONS - count;
    const percentage = Math.round((count / MAX_DAILY_TRANSLATIONS) * 100);

    const usageText = [
      "📊 Daily Translation Usage",
      "",
      `Used: ${count}/${MAX_DAILY_TRANSLATIONS} (${percentage}%)`,
      `Remaining: ${remaining}`,
      "",
      "The limit resets at midnight UTC.",
    ].join("\n");

    await ctx.reply(usageText);
  });

  // Callback query handler for language selection
  bot.callbackQuery(/lang:(.+)/, async (ctx) => {
    try {
      const langCode = ctx.match[1];
      const userId = ctx.from?.id;

      if (!userId) {
        await ctx.answerCallbackQuery("Error: User ID not found");
        return;
      }

      await setTargetLanguage(userId, langCode);

      const langInfo = POPULAR_LANGUAGES.find((l) => l.code === langCode);
      const langName = langInfo
        ? `${langInfo.flag} ${langInfo.name}`
        : langCode;

      await ctx.answerCallbackQuery(`✅ Language set to ${langName}`);
      await ctx.editMessageText(
        `✅ Translation language set to ${langName}!\n\n` +
          `Now you can use me inline in any chat:\n` +
          `@${bot.botInfo?.username || "converslation_bot"} your message here`,
        { reply_markup: undefined }
      );
    } catch (error) {
      log.error(BOT_NAME + " > Language Selection", error);
      await ctx.answerCallbackQuery("❌ Error setting language");
    }
  });

  // Inline query handler - simple and direct
  bot.on("inline_query", async (ctx) => {
    try {
      const query = ctx.inlineQuery.query;
      const userId = ctx.from.id;

      // Get user's target language
      const targetLang = await getTargetLanguage(userId);

      // Refresh TTL on each use
      if (targetLang) {
        refreshLanguageTTL(userId).catch((err) =>
          log.error(BOT_NAME + " > TTL Refresh Error", err)
        );
      }

      if (!targetLang) {
        // Show a message to set language
        const result = InlineQueryResultBuilder.article(
          "no-lang",
          "❌ Language Not Set",
          {
            description: "Please set your target language first",
          }
        ).text(
          "Please set your target language using /setlang command in a private chat with the bot."
        );

        await ctx.answerInlineQuery([result], { cache_time: 0 });
        return;
      }

      if (!query || query.trim().length === 0) {
        // Show usage instructions
        const langInfo = POPULAR_LANGUAGES.find((l) => l.code === targetLang);
        const result = InlineQueryResultBuilder.article(
          "usage",
          `💬 Type your message and end with . ! or ?`,
          {
            description: `Will translate to ${langInfo?.name || targetLang}`,
          }
        ).text(
          `Type your message after @${bot.botInfo?.username || "bot"}\n\nEnd with . ! or ? to translate.`
        );

        await ctx.answerInlineQuery([result], { cache_time: 0 });
        return;
      }

      // Check if query ends with punctuation - only then translate
      const endsWithPunctuation = /[.!?]$/.test(query);
      
      if (!endsWithPunctuation) {
        const langInfo = POPULAR_LANGUAGES.find((l) => l.code === targetLang);
        const result = InlineQueryResultBuilder.article(
          "waiting",
          "⌨️ Keep typing...",
          {
            description: `End with . ! or ? when ready to translate`,
          }
        ).text(query);

        await ctx.answerInlineQuery([result], { cache_time: 0 });
        return;
      }

      // Remove the trailing punctuation before translation
      const textToTranslate = query.slice(0, -1).trim();

      // Check daily translation limit
      const currentCount = await getDailyTranslationCount(userId);
      if (currentCount >= MAX_DAILY_TRANSLATIONS) {
        const remaining = MAX_DAILY_TRANSLATIONS - currentCount;
        const errorResult = InlineQueryResultBuilder.article(
          "limit-reached",
          "⛔ Daily Limit Reached",
          {
            description: `You've reached the daily limit of ${MAX_DAILY_TRANSLATIONS} translations`,
          }
        ).text(
          `⛔ Daily translation limit reached!\n\n` +
          `You've used ${currentCount}/${MAX_DAILY_TRANSLATIONS} translations today.\n\n` +
          `The limit will reset at midnight UTC.`
        );

        await ctx.answerInlineQuery([errorResult], { cache_time: 0 });
        log.info(BOT_NAME + " > Translation Limit Reached", {
          userId,
          count: currentCount,
          limit: MAX_DAILY_TRANSLATIONS,
        });
        return;
      }

      // Translate the message directly
      try {
        const translation = await translateWithChatGPT(
          textToTranslate,
          targetLang
        );

        // Increment translation count after successful translation
        const newCount = await incrementDailyTranslationCount(userId);

        const langInfo = POPULAR_LANGUAGES.find((l) => l.code === targetLang);
        const langName = langInfo ? langInfo.name : targetLang;

        // Create inline result with translation
        const result = InlineQueryResultBuilder.article(
          "translation-" + Date.now(),
          `${langInfo?.flag || "🌐"} ${langName}`,
          {
            description: translation.substring(0, 100),
          }
        ).text(translation);

        await ctx.answerInlineQuery([result], { cache_time: 0 });
        
        log.info(BOT_NAME + " > Translation", {
          userId,
          originalLength: query.length,
          translationLength: translation.length,
          dailyCount: newCount,
          limit: MAX_DAILY_TRANSLATIONS,
        });
      } catch (error) {
        // Show error result
        const errorResult = InlineQueryResultBuilder.article(
          "error",
          "❌ Translation Failed",
          {
            description: "Could not translate message",
          }
        ).text(
          "❌ Translation failed. Please try again later or check your API configuration."
        );

        await ctx.answerInlineQuery([errorResult], { cache_time: 0 });
      }
    } catch (error) {
      log.error(BOT_NAME + " > Inline Query", error);
    }
  });

  setupBotErrorHandling(bot, BOT_NAME);

  await initializeBot(bot);
  return bot;
};

export default { startBot };

