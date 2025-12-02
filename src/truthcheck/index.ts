import { configDotenv } from "dotenv";
import { Bot, InlineQueryResultBuilder } from "grammy";
import log from "../log";
import { getWithPrefix, setWithPrefix } from "../redis";
import redis from "../redis";

configDotenv();

const BOT_NAME = "TruthCheck";
const REDIS_PREFIX = "truthcheck";
const MAX_DAILY_FACTCHECKS = 1000;

async function factCheckWithChatGPT(text: string): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const systemPrompt = `You are a fact-checking assistant. Your job is to analyze statements and determine their truthfulness based on reliable sources and established facts from credible institutions, peer-reviewed research, official records, and recognized experts.

When analyzing a statement:
1. Determine if the statement is TRUE, MOSTLY TRUE, PARTIALLY TRUE, MOSTLY FALSE, or FALSE
2. Explain your reasoning clearly with specific evidence
3. Reference reliable sources such as:
   - Peer-reviewed scientific journals
   - Official government records and statistics
   - Established academic institutions
   - Recognized expert consensus
   - Verified historical records
   - Reputable news organizations with fact-checking standards
4. If the statement is false or misleading, explain specifically why it's incorrect and what the actual facts are
5. If the statement is true, confirm it with relevant facts and sources
6. Be objective, balanced, and evidence-based
7. Distinguish between facts and opinions - only fact-check factual claims

Format your response as:
- Start with a clear verdict: ✅ TRUE / ⚠️ MOSTLY TRUE / ⚠️ PARTIALLY TRUE / ❌ MOSTLY FALSE / ❌ FALSE
- Then provide a detailed explanation with reasoning
- Include specific reasons and evidence from reliable sources
- If false, explain what the correct information is

Keep responses concise but informative (max 500 words). Focus on facts from reliable sources, not opinions or speculation.`;

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
          {
            role: "user",
            content: `Please fact-check the following statement:\n\n"${text}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const factCheck = data.choices[0]?.message?.content?.trim();

    if (!factCheck) {
      throw new Error("No fact-check result received from API");
    }

    return factCheck;
  } catch (error) {
    log.error(BOT_NAME + " > Fact-Check Error", error);
    throw error;
  }
}

// Get today's date string in YYYY-MM-DD format (UTC)
function getTodayDateKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get remaining seconds until midnight UTC
function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

// Get today's fact-check count for a user
async function getDailyFactCheckCount(userId: number): Promise<number> {
  const dateKey = getTodayDateKey();
  const countKey = `${REDIS_PREFIX}:user:${userId}:factchecks:${dateKey}`;
  const count = await redis.get(countKey);
  return count ? parseInt(count, 10) : 0;
}

// Increment today's fact-check count for a user
async function incrementDailyFactCheckCount(userId: number): Promise<number> {
  const dateKey = getTodayDateKey();
  const countKey = `${REDIS_PREFIX}:user:${userId}:factchecks:${dateKey}`;
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
    { command: "usage", description: "Check your daily fact-check usage" },
  ];

  await bot.api.setMyCommands(commands);

  // Command: /start
  bot.command("start", async (ctx) => {
    ctx.react("🤔");
    const welcomeText = [
      "🔍 Welcome to TruthCheck Bot!",
      "",
      "I help you verify the truthfulness of statements using AI fact-checking.",
      "",
      "📱 How to use:",
      "1. In any chat, type @" +
        (bot.botInfo?.username || "truthcheck_bot") +
        " followed by the statement you want to check",
      "2. I'll analyze it and provide a fact-check report",
      "3. Tap the result to send it to the chat",
      "",
      "💡 Use /help for more information",
    ].join("\n");

    await ctx.reply(welcomeText);
  });

  // Command: /help
  bot.command("help", async (ctx) => {
    const helpText = [
      "📖 TruthCheck Bot Help",
      "",
      "Commands:",
      "/start - Start the bot",
      "/help - Show this help message",
      "",
      "Ways to use:",
      "",
      "1️⃣ Inline Mode (any chat):",
      "Type: @" +
        (bot.botInfo?.username || "truthcheck_bot") +
        " your statement here",
      "",
      "2️⃣ Reply to a message (any chat):",
      "Reply to a message, mention me, and add '?': @" +
        (bot.botInfo?.username || "truthcheck_bot") +
        " ?",
      "I'll automatically fact-check the replied message!",
      "",
      "3️⃣ Reply in private chat:",
      "Just reply to any message in this chat and I'll fact-check it",
      "",
      "4️⃣ Forward a message:",
      "Forward any message to me and I'll fact-check it",
      "",
      "Examples:",
      "@" +
        (bot.botInfo?.username || "truthcheck_bot") +
        " The Earth is flat",
      "@" +
        (bot.botInfo?.username || "truthcheck_bot") +
        " Water boils at 100 degrees Celsius",
      "",
      "🔍 I'll analyze the statement and provide:",
      "• A truthfulness verdict",
      "• Detailed explanation",
      "• Evidence and reasoning",
      "",
      "Note: Fact-checking is based on available information and may not cover all contexts or recent developments.",
      "",
      "📊 Daily Limit: 1000 fact-checks per day (resets at midnight UTC)",
      "Use /usage to check your current usage",
    ].join("\n");

    await ctx.reply(helpText);
  });

  // Command: /usage
  bot.command("usage", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const count = await getDailyFactCheckCount(userId);
    const remaining = MAX_DAILY_FACTCHECKS - count;
    const percentage = Math.round((count / MAX_DAILY_FACTCHECKS) * 100);

    const usageText = [
      "📊 Daily Fact-Check Usage",
      "",
      `Used: ${count}/${MAX_DAILY_FACTCHECKS} (${percentage}%)`,
      `Remaining: ${remaining}`,
      "",
      "The limit resets at midnight UTC.",
    ].join("\n");

    await ctx.reply(usageText);
  });

  // Helper function to send fact-check result
  async function sendFactCheckResult(
    ctx: any,
    text: string,
    originalMessage?: string
  ) {
    try {
      const userId = ctx.from?.id;
      
      // Check daily limit
      if (userId) {
        const currentCount = await getDailyFactCheckCount(userId);
        if (currentCount >= MAX_DAILY_FACTCHECKS) {
          await ctx.reply(
            `⛔ Daily fact-check limit reached!\n\n` +
            `You've used ${currentCount}/${MAX_DAILY_FACTCHECKS} fact-checks today.\n\n` +
            `The limit will reset at midnight UTC.`
          );
          return;
        }
      }
      
      await ctx.reply("🔍 Analyzing statement... Please wait.");

      const factCheckResult = await factCheckWithChatGPT(text);

      // Increment count after successful fact-check
      if (userId) {
        await incrementDailyFactCheckCount(userId);
      }

      const resultText =
        `🔍 <b>Fact-Check Report</b>\n\n` +
        (originalMessage
          ? `<i>Original Message:</i> "${originalMessage}"\n\n`
          : `<i>Statement:</i> "${text}"\n\n`) +
        `${factCheckResult}`;

      await ctx.reply(resultText, { parse_mode: "HTML" });

      log.info(BOT_NAME + " > Fact-Check (Message)", {
        userId: ctx.from?.id,
        textLength: text.length,
        resultLength: factCheckResult.length,
      });
    } catch (error) {
      log.error(BOT_NAME + " > Fact-Check Error (Message)", error);
      const errorMessage = error instanceof Error && error.message.includes("Too Many Requests")
        ? "❌ Too many requests. Please wait a moment and try again."
        : "❌ Fact-check failed. Please try again later or check your API configuration.";
      await ctx.reply(errorMessage);
    }
  }

  // Handle text messages (direct messages, replies, forwards)
  bot.on("message:text", async (ctx) => {
    try {
      const message = ctx.message;
      const text = message.text;

      // Skip commands
      if (text.startsWith("/")) return;

      // Check if this is a reply to another message
      if (message.reply_to_message) {
        const repliedText =
          message.reply_to_message.text ||
          message.reply_to_message.caption ||
          "";
        if (repliedText.trim()) {
          await sendFactCheckResult(ctx, repliedText, repliedText);
          return;
        }
      }

      // Check if this is a forwarded message
      if ("forward_from" in message || "forward_from_chat" in message) {
        if (text.trim()) {
          await sendFactCheckResult(ctx, text, text);
          return;
        }
      }

      // Regular message - fact-check it
      if (text.trim()) {
        await sendFactCheckResult(ctx, text);
      }
    } catch (error) {
      log.error(BOT_NAME + " > Message Handler Error", error);
    }
  });

  // Handle when bot is mentioned in a reply (for group chats)
  // This handler runs before the text handler to catch mentions
  bot.on("message", async (ctx) => {
    try {
      const message = ctx.message;
      
      // Only process text messages
      if (!("text" in message) || !message.text) return;
      
      const messageText = message.text;
      
      // Check if bot is mentioned and message is a reply
      const botMentioned = message.entities?.some(
        (e) =>
          e.type === "mention" &&
          messageText.substring(e.offset, e.offset + e.length).toLowerCase() ===
            `@${bot.botInfo?.username?.toLowerCase()}`
      );
      
      // Check if message ends with "?" (trigger for fact-checking)
      const endsWithQuestionMark = messageText.trim().endsWith("?");
      
      if (message.reply_to_message && botMentioned) {
        // Require "?" at the end to trigger fact-check
        if (!endsWithQuestionMark) {
          await ctx.reply(
            "💡 Tip: Add a question mark (?) at the end to trigger fact-checking!\n\nExample: @" +
              (bot.botInfo?.username || "bot") +
              " ?",
            {
              reply_to_message_id: message.message_id,
            }
          );
          return;
        }
        
        const repliedText =
          message.reply_to_message.text ||
          message.reply_to_message.caption ||
          "";
        
        if (repliedText.trim()) {
          const userId = ctx.from?.id;
          if (userId) {
            // Check daily limit
            const currentCount = await getDailyFactCheckCount(userId);
            if (currentCount >= MAX_DAILY_FACTCHECKS) {
              await ctx.reply(
                `⛔ Daily fact-check limit reached!\n\n` +
                `You've used ${currentCount}/${MAX_DAILY_FACTCHECKS} fact-checks today.\n\n` +
                `The limit will reset at midnight UTC.`,
                {
                  reply_to_message_id: message.message_id,
                }
              );
              return;
            }
          }
          
          await ctx.reply("🔍 Analyzing the replied message... Please wait.");
          
          try {
            const factCheckResult = await factCheckWithChatGPT(repliedText);
            
            // Increment count after successful fact-check
            if (userId) {
              await incrementDailyFactCheckCount(userId);
            }
            
            const resultText =
              `🔍 <b>Fact-Check Report</b>\n\n` +
              `<i>Original Message:</i> "${repliedText}"\n\n` +
              `${factCheckResult}`;
            
            await ctx.reply(resultText, {
              parse_mode: "HTML",
              reply_to_message_id: message.reply_to_message.message_id,
            });
            
            log.info(BOT_NAME + " > Fact-Check (Mentioned in Reply)", {
              userId: ctx.from?.id,
              chatId: ctx.chat?.id,
              textLength: repliedText.length,
            });
          } catch (error) {
            log.error(BOT_NAME + " > Fact-Check Error (Mention)", error);
            const errorMessage = error instanceof Error && error.message.includes("Too Many Requests")
              ? "❌ Too many requests. Please wait a moment and try again."
              : "❌ Fact-check failed. Please try again later.";
            await ctx.reply(errorMessage, {
              reply_to_message_id: message.message_id,
            });
          }
          return; // Don't process further
        } else {
          await ctx.reply(
            "❌ The replied message doesn't contain text to fact-check.",
            {
              reply_to_message_id: message.message_id,
            }
          );
          return; // Don't process further
        }
      }
    } catch (error) {
      log.error(BOT_NAME + " > Mention Handler Error", error);
    }
  });

  // Inline query handler
  bot.on("inline_query", async (ctx) => {
    try {
      const query = ctx.inlineQuery.query.trim();
      const userId = ctx.from.id;

      if (!query || query.length === 0) {
        // Show usage instructions with info about replying
        const result = InlineQueryResultBuilder.article(
          "usage",
          "🔍 Fact-Check Options",
          {
            description: "Type a statement or reply to a message",
          }
        ).text(
          `🔍 <b>How to use TruthCheck:</b>\n\n` +
          `1️⃣ <b>Type a statement:</b>\n` +
          `@${bot.botInfo?.username || "bot"} Your statement here\n\n` +
          `2️⃣ <b>Reply to a message:</b>\n` +
          `Reply to any message, mention me, and add '?': @${bot.botInfo?.username || "bot"} ?\n\n` +
          `3️⃣ <b>In private chat:</b>\n` +
          `Just reply to a message and I'll fact-check it`,
          { parse_mode: "HTML" }
        );

        await ctx.answerInlineQuery([result], { cache_time: 0 });
        return;
      }

      // Check daily limit first
      const currentCount = await getDailyFactCheckCount(userId);
      if (currentCount >= MAX_DAILY_FACTCHECKS) {
        const errorResult = InlineQueryResultBuilder.article(
          "limit-reached",
          "⛔ Daily Limit Reached",
          {
            description: `You've reached the daily limit of ${MAX_DAILY_FACTCHECKS} fact-checks`,
          }
        ).text(
          `⛔ Daily fact-check limit reached!\n\n` +
          `You've used ${currentCount}/${MAX_DAILY_FACTCHECKS} fact-checks today.\n\n` +
          `The limit will reset at midnight UTC.`
        );

        await ctx.answerInlineQuery([errorResult], { cache_time: 0 });
        log.info(BOT_NAME + " > Fact-Check Limit Reached", {
          userId,
          count: currentCount,
          limit: MAX_DAILY_FACTCHECKS,
        });
        return;
      }

      // Perform fact-check BEFORE answering inline query
      // This prevents the "Checking..." stuck issue
      try {
        const factCheckResult = await factCheckWithChatGPT(query);

        // Increment count after successful fact-check
        await incrementDailyFactCheckCount(userId);

        // Create inline result with fact-check
        const result = InlineQueryResultBuilder.article(
          "factcheck-" + Date.now(),
          "🔍 Fact-Check Result",
          {
            description: factCheckResult.substring(0, 100),
          }
        ).text(
          `🔍 <b>Fact-Check Report</b>\n\n` +
            `<i>Statement:</i> "${query}"\n\n` +
            `${factCheckResult}`,
          { parse_mode: "HTML" }
        );

        await ctx.answerInlineQuery([result], { cache_time: 0 });

        log.info(BOT_NAME + " > Fact-Check", {
          userId,
          queryLength: query.length,
          resultLength: factCheckResult.length,
          dailyCount: await getDailyFactCheckCount(userId),
        });
      } catch (error) {
        // Show error result
        const errorMessage = error instanceof Error && error.message.includes("Too Many Requests")
          ? "❌ Too many requests. Please wait a moment and try again."
          : "❌ Fact-check failed. Please try again later or check your API configuration.";
        
        const errorResult = InlineQueryResultBuilder.article(
          "error",
          "❌ Fact-Check Failed",
          {
            description: "Could not fact-check statement",
          }
        ).text(errorMessage);

        await ctx.answerInlineQuery([errorResult], { cache_time: 0 });
        log.error(BOT_NAME + " > Fact-Check Error", error);
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

