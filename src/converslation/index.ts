import { configDotenv } from "dotenv";
import { Bot, Context, InlineKeyboard, InlineQueryResultBuilder } from "grammy";
import log from "../log";

configDotenv();

const BOT_NAME = "Converslation";

// Store user language preferences (in production, use a database)
const userLanguages = new Map<string, string>(); // chatId:userId -> language

// Cache translations to save API calls
const translationCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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
  // Check cache first
  const cacheKey = `${sourceLang || "auto"}:${targetLang}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const systemPrompt = sourceLang
      ? `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}. Only return the translation, nothing else.`
      : `You are a professional translator. Translate the following text to ${targetLang}. Only return the translation, nothing else.`;

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

    // Cache the translation
    translationCache.set(cacheKey, {
      text: translation,
      timestamp: Date.now(),
    });

    return translation;
  } catch (error) {
    log.error(BOT_NAME + " > Translation Error", error);
    throw error;
  }
}

function getUserLanguageKey(userId: number, chatId?: number): string {
  return chatId ? `${chatId}:${userId}` : `${userId}`;
}

function getTargetLanguage(userId: number, chatId?: number): string | null {
  const key = getUserLanguageKey(userId, chatId);
  return userLanguages.get(key) || null;
}

function setTargetLanguage(
  userId: number,
  language: string,
  chatId?: number
): void {
  const key = getUserLanguageKey(userId, chatId);
  userLanguages.set(key, language);
  log.info(BOT_NAME + " > Set Language", { userId, chatId, language });
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
      "3. I'll translate it for you!",
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
      "/setlang - Set target language for this chat",
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
      "The bot will translate your message to the language you set for this chat.",
      "",
      "💡 Tip: Set different languages for different chats!",
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
      "🌐 Select the language you want to translate to in this chat:",
      { reply_markup: keyboard }
    );
  });

  // Command: /mylang
  bot.command("mylang", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return;

    const targetLang = getTargetLanguage(userId, chatId);
    if (!targetLang) {
      await ctx.reply(
        "❌ No language set for this chat. Use /setlang to set one."
      );
      return;
    }

    const langInfo = POPULAR_LANGUAGES.find((l) => l.code === targetLang);
    const langName = langInfo
      ? `${langInfo.flag} ${langInfo.name}`
      : targetLang;

    await ctx.reply(
      `🌐 Current translation language for this chat: ${langName}`
    );
  });

  // Command: /clearlang
  bot.command("clearlang", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    if (!userId) return;

    const key = getUserLanguageKey(userId, chatId);
    userLanguages.delete(key);

    await ctx.reply("✅ Language setting cleared for this chat.");
  });

  // Callback query handler for language selection
  bot.callbackQuery(/lang:(.+)/, async (ctx) => {
    try {
      const langCode = ctx.match[1];
      const userId = ctx.from?.id;
      const chatId = ctx.chat?.id;

      if (!userId) {
        await ctx.answerCallbackQuery("Error: User ID not found");
        return;
      }

      setTargetLanguage(userId, langCode, chatId);

      const langInfo = POPULAR_LANGUAGES.find((l) => l.code === langCode);
      const langName = langInfo
        ? `${langInfo.flag} ${langInfo.name}`
        : langCode;

      await ctx.answerCallbackQuery(`✅ Language set to ${langName}`);
      await ctx.editMessageText(
        `✅ Translation language set to ${langName} for this chat!\n\n` +
          `Now you can use me inline:\n` +
          `@${bot.botInfo?.username || "converslation_bot"} your message here`,
        { reply_markup: undefined }
      );
    } catch (error) {
      log.error(BOT_NAME + " > Language Selection", error);
      await ctx.answerCallbackQuery("❌ Error setting language");
    }
  });

  // Inline query handler
  bot.on("inline_query", async (ctx) => {
    try {
      const query = ctx.inlineQuery.query;
      const userId = ctx.from.id;

      // Get user's target language
      // Note: In inline queries, we don't have chatId, so we use a default setting
      const targetLang = getTargetLanguage(userId);

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
        const result = InlineQueryResultBuilder.article(
          "usage",
          "💬 Type your message to translate",
          {
            description: `Will translate to ${targetLang}`,
          }
        ).text(
          `Type your message after @${bot.botInfo?.username || "bot"} to translate it.`
        );

        await ctx.answerInlineQuery([result], { cache_time: 0 });
        return;
      }

      // Translate the message
      try {
        const translation = await translateWithChatGPT(query, targetLang);

        const langInfo = POPULAR_LANGUAGES.find((l) => l.code === targetLang);
        const langName = langInfo ? langInfo.name : targetLang;

        // Create inline result with translation
        const result = InlineQueryResultBuilder.article(
          "translation-" + Date.now(),
          `${langInfo?.flag || "🌐"} Translation to ${langName}`,
          {
            description: translation.substring(0, 100),
          }
        ).text(translation);

        await ctx.answerInlineQuery([result], { cache_time: 30 });
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

  bot.catch = (err) => {
    log.error(BOT_NAME + " > BOT", err);
  };

  bot.start();

  await bot.init();
  return bot;
};

export default { startBot };

