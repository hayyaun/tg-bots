import { configDotenv } from "dotenv";
import { Bot } from "grammy";
import { BotCommand } from "grammy/types";
import {
  createAdminNotifier,
  setupBotErrorHandling,
  initializeBot,
} from "../utils/bot";
import { getQuizTypeName, quizTypes } from "./config";
import { getQuizTypeEmoji } from "../shared/quizUtils";
import { getStrings } from "./i18n";
import { Language, QuizType } from "../shared/types";
import { setCustomCommands } from "./reducer";
import { setupCommands } from "./commands";
import { setupCallbacks } from "./callbacks";

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
  const notifyAdmin = createAdminNotifier(bot, BOT_NAME, ADMIN_USER_ID);

  // Commands - use English descriptions
  const englishStrings = getStrings(Language.English);
  const commands: BotCommand[] = [
    { command: "start", description: englishStrings.start_btn },
    { command: "language", description: englishStrings.language_btn },
    { command: "profile", description: "👤 View your profile" },
  ];

  for (const key in quizTypes) {
    const quizType = key as QuizType;
    const emoji = getQuizTypeEmoji(quizType);
    commands.push({
      command: key,
      description: `${emoji} ${englishStrings.about} ${getQuizTypeName(quizType, Language.English)}`,
    });
  }

  await bot.api.setMyCommands(commands);

  // Setup commands and callbacks
  setupCommands(bot, notifyAdmin);
  setupCallbacks(bot, notifyAdmin);

  // Setup custom commands for quiz types
  await setCustomCommands(bot);

  setupBotErrorHandling(bot, BOT_NAME, notifyAdmin);

  await initializeBot(bot);

  // Notify admin that bot started successfully
  notifyAdmin(`🚀 <b>Bot Started</b>\nBot is now online and ready!`);

  return bot;
};

export default { startBot };
