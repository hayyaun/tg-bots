import { prisma } from "../db";
import { Bot } from "grammy";
import log from "../log";
import { MAX_COMPLETION_SCORE } from "../shared/constants";
import { BOT_NAME } from "./constants";
import { notifications } from "./strings";

export async function sendProfileReminders(bot: Bot): Promise<void> {
  try {
    // Find users with incomplete profiles (completion_score < MAX_COMPLETION_SCORE)
    // who haven't updated their profile in the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const usersToRemind = await prisma.user.findMany({
      where: {
        completion_score: {
          lt: MAX_COMPLETION_SCORE,
        },
        updated_at: {
          lt: threeDaysAgo,
        },
      },
      select: {
        telegram_id: true,
        completion_score: true,
      },
    });

    let successCount = 0;
    let failCount = 0;

    for (const user of usersToRemind) {
      try {
        await bot.api.sendMessage(
          Number(user.telegram_id),
          notifications.profileReminder(user.completion_score),
          { parse_mode: "HTML" }
        );
        successCount++;
      } catch (err) {
        // Silently fail if user blocked the bot or other errors
        failCount++;
        log.info(BOT_NAME + " > Profile reminder failed", {
          userId: Number(user.telegram_id),
          error: err,
        });
      }
    }

    log.info(
      BOT_NAME + " > Profile reminders sent",
      {
        total: usersToRemind.length,
        success: successCount,
        failed: failCount,
      }
    );
  } catch (err) {
    log.error(BOT_NAME + " > Profile reminders failed", err);
  }
}

export function setupProfileReminders(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
): void {
  // Send reminders every 3 days (72 hours)
  const intervalMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

  // Function to send reminders
  const sendReminders = async () => {
    try {
      await sendProfileReminders(bot);
    } catch (err) {
      log.error(BOT_NAME + " > Profile reminders failed", err);
      notifyAdmin(
        `❌ <b>Profile Reminders Failed</b>\nError: ${err}`
      );
    }
  };

  // Send first reminders after 3 days, then continue every 3 days
  setTimeout(() => {
    sendReminders();
    setInterval(sendReminders, intervalMs);
  }, intervalMs);

  log.info(BOT_NAME + " > Profile reminders scheduled (every 3 days)");
}

