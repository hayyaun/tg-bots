import { configDotenv } from "dotenv";
import { Bot } from "grammy";
import { BotCommand } from "grammy/types";
import log from "../log";
import { BOT_NAME } from "./constants";
import { setupCommands } from "./commands";
import { setupCallbacks } from "./callbacks";
import { setupDailyReports } from "./reports";

configDotenv();

const ADMIN_USER_ID = process.env.ADMIN_USER_ID
  ? parseInt(process.env.ADMIN_USER_ID)
  : undefined;

const startBot = async (botKey: string, agent: unknown) => {
  const bot = new Bot(botKey, {
    client: { baseFetchConfig: { agent } },
  });

  // Admin notification helper
  async function notifyAdmin(message: string) {
    if (!ADMIN_USER_ID) return;
    try {
      await bot.api.sendMessage(ADMIN_USER_ID, `🤖 ${BOT_NAME}\n${message}`, {
        parse_mode: "HTML",
      });
    } catch (err) {
      log.error(BOT_NAME + " > Admin notification failed", err);
    }
  }

  // Commands
  const commands: BotCommand[] = [
    { command: "start", description: "شروع ربات" },
    { command: "find", description: "پیدا کردن افراد" },
    { command: "liked", description: "افرادی که من را لایک کردند" },
    { command: "profile", description: "مشاهده و ویرایش پروفایل" },
    { command: "settings", description: "تنظیمات" },
  ];

  await bot.api.setMyCommands(commands);

  // Setup commands and callbacks
  setupCommands(bot, notifyAdmin);
  setupCallbacks(bot, notifyAdmin);

  // Setup daily reports
  setupDailyReports(bot, notifyAdmin);

  bot.catch = (err) => {
    log.error(BOT_NAME + " > BOT", err);
    notifyAdmin(`❌ <b>Critical Bot Error</b>\nError: ${err}`);
  };

  bot.start();

  await bot.init();

  notifyAdmin(`🚀 <b>Bot Started</b>\nBot is now online and ready!`);

  return bot;
};

export default { startBot };
