import { Bot } from "grammy";
import log from "../log";

/**
 * Creates an admin notification function for a bot
 * @param bot - The bot instance
 * @param botName - The name of the bot for logging
 * @param adminUserId - Optional admin user ID to send notifications to
 * @returns A function to send admin notifications
 */
export function createAdminNotifier(
  bot: Bot,
  botName: string,
  adminUserId?: number
): (message: string) => Promise<void> {
  return async (message: string) => {
    if (!adminUserId) return;
    try {
      await bot.api.sendMessage(adminUserId, `🤖 ${botName}\n${message}`, {
        parse_mode: "HTML",
      });
    } catch (err) {
      log.error(`${botName} > Admin notification failed`, err);
    }
  };
}

/**
 * Sets up standard error handling for a bot
 * @param bot - The bot instance
 * @param botName - The name of the bot for logging
 * @param notifyAdmin - Optional admin notification function
 */
export function setupBotErrorHandling(
  bot: Bot,
  botName: string,
  notifyAdmin?: (message: string) => Promise<void>
): void {
  bot.catch = (err) => {
    log.error(`${botName} > BOT`, err);
    if (notifyAdmin) {
      notifyAdmin(`❌ <b>Critical Bot Error</b>\nError: ${err}`).catch(() => {});
    }
  };
}

/**
 * Initializes and starts a bot with standard setup
 * @param bot - The bot instance
 * @returns Promise that resolves when bot is initialized
 */
export async function initializeBot(bot: Bot): Promise<void> {
  bot.start();
  await bot.init();
}

