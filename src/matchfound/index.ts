import { configDotenv } from "dotenv";
import { Bot } from "grammy";
import { BotCommand } from "grammy/types";
import { BOT_NAME } from "./constants";
import { setupCommands } from "./commands";
import { setupCallbacks } from "./callbacks";
import { setupDailyReports, setupProfileReminders } from "./reports";
import { createAdminNotifier, setupBotErrorHandling, initializeBot } from "../utils/bot";

configDotenv();

const ADMIN_USER_ID = process.env.ADMIN_USER_ID
  ? parseInt(process.env.ADMIN_USER_ID)
  : undefined;

const startBot = async (botKey: string, agent: unknown) => {
  const bot = new Bot(botKey, {
    client: { baseFetchConfig: { agent } },
  });

  // Admin notification helper
  const notifyAdmin = createAdminNotifier(bot, BOT_NAME, ADMIN_USER_ID);

  // Commands
  const commands: BotCommand[] = [
    { command: "start", description: "🚀 شروع ربات" },
    { command: "find", description: "🔍 پیدا کردن افراد" },
    { command: "liked", description: "❤️ افرادی که من را لایک کردند" },
    { command: "profile", description: "📋 مشاهده و ویرایش پروفایل" },
    { command: "settings", description: "⚙️ تنظیمات" },
  ];

  await bot.api.setMyCommands(commands);

  // Setup commands and callbacks
  setupCommands(bot, notifyAdmin, ADMIN_USER_ID);
  setupCallbacks(bot, notifyAdmin, ADMIN_USER_ID);

  // Setup daily reports
  setupDailyReports(bot, notifyAdmin);

  // Setup profile reminders
  setupProfileReminders(bot, notifyAdmin);

  setupBotErrorHandling(bot, BOT_NAME, notifyAdmin);

  await initializeBot(bot);

  notifyAdmin(`🚀 <b>Bot Started</b>\nBot is now online and ready!`);

  return bot;
};

export default { startBot };
