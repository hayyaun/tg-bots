import { prisma } from "../db";
import { Bot } from "grammy";
import log from "../log";
import { MAX_COMPLETION_SCORE, MIN_COMPLETION_THRESHOLD } from "../shared/constants";
import { BOT_NAME } from "./constants";
import { notifications } from "./strings";

export async function generateDailyReport(): Promise<string> {
  try {
    // Get statistics from the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    // Total users
    const totalUsers = await prisma.user.count();

    // New users in last 24h
    const newUsers = await prisma.user.count({
      where: {
        created_at: {
          gte: yesterday,
        },
      },
    });

    // Active users (users who updated their profile in last 24h)
    const activeUsers = await prisma.user.count({
      where: {
        updated_at: {
          gte: yesterday,
        },
      },
    });

    // Total likes
    const totalLikes = await prisma.like.count();

    // New likes in last 24h
    const newLikes = await prisma.like.count({
      where: {
        created_at: {
          gte: yesterday,
        },
      },
    });

    // Mutual likes (matches) - count pairs where both users liked each other
    const allLikes = await prisma.like.findMany({
      select: {
        user_id: true,
        liked_user_id: true,
      },
    });

    // Create a set of like pairs for quick lookup
    const likesSet = new Set<string>();
    allLikes.forEach((like) => {
      likesSet.add(`${like.user_id}-${like.liked_user_id}`);
    });

    // Count mutual likes (where both A->B and B->A exist)
    let totalMutualLikes = 0;
    const countedPairs = new Set<string>();
    for (const like of allLikes) {
      const pairKey = `${like.user_id}-${like.liked_user_id}`;
      const reversePairKey = `${like.liked_user_id}-${like.user_id}`;
      
      // Check if reverse like exists and we haven't counted this pair yet
      if (
        likesSet.has(reversePairKey) &&
        !countedPairs.has(pairKey) &&
        !countedPairs.has(reversePairKey)
      ) {
        totalMutualLikes++;
        countedPairs.add(pairKey);
        countedPairs.add(reversePairKey);
      }
    }

    // Total reports
    const totalReports = await prisma.report.count();

    // New reports in last 24h
    const newReports = await prisma.report.count({
      where: {
        created_at: {
          gte: yesterday,
        },
      },
    });

    // Total ignored
    const totalIgnored = await prisma.ignored.count();

    // Users with complete profiles (completion_score >= MIN_COMPLETION_THRESHOLD)
    const completeProfiles = await prisma.user.count({
      where: {
        completion_score: {
          gte: MIN_COMPLETION_THRESHOLD,
        },
      },
    });

    // Users with interests (MIN_INTERESTS-MAX_INTERESTS interests)
    const usersWithInterests = await prisma.user.count({
      where: {
        interests: {
          isEmpty: false,
        },
      },
    });

    // Format report message
    const report = `
📊 <b>گزارش روزانه ربات ${BOT_NAME}</b>

👥 <b>کاربران:</b>
• کل کاربران: ${totalUsers.toLocaleString("fa-IR")}
• کاربران جدید (24h): ${newUsers.toLocaleString("fa-IR")}
• کاربران فعال (24h): ${activeUsers.toLocaleString("fa-IR")}
• پروفایل‌های کامل: ${completeProfiles.toLocaleString("fa-IR")}
• کاربران با علایق: ${usersWithInterests.toLocaleString("fa-IR")}

❤️ <b>لایک‌ها:</b>
• کل لایک‌ها: ${totalLikes.toLocaleString("fa-IR")}
• لایک‌های جدید (24h): ${newLikes.toLocaleString("fa-IR")}
• مچ‌های موفق: ${totalMutualLikes.toLocaleString("fa-IR")}

🚫 <b>گزارش‌ها و بلاک‌ها:</b>
• کل گزارش‌ها: ${totalReports.toLocaleString("fa-IR")}
• گزارش‌های جدید (24h): ${newReports.toLocaleString("fa-IR")}
• کل بلاک‌ها: ${totalIgnored.toLocaleString("fa-IR")}

⏰ زمان گزارش: ${new Date().toLocaleString("fa-IR", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}
    `.trim();

    return report;
  } catch (err) {
    log.error(BOT_NAME + " > Daily report generation failed", err);
    return `❌ خطا در تولید گزارش روزانه:\n${err}`;
  }
}

export function setupDailyReports(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
): void {
  const intervalMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Function to send report
  const sendReport = async () => {
    try {
      const report = await generateDailyReport();
      await notifyAdmin(report);
      log.info(BOT_NAME + " > Daily report sent");
    } catch (err) {
      log.error(BOT_NAME + " > Daily report failed", err);
    }
  };

  // Send first report after 24 hours, then continue every 24 hours
  setTimeout(() => {
    sendReport();
    setInterval(sendReport, intervalMs);
  }, intervalMs);

  log.info(BOT_NAME + " > Daily reports scheduled (every 24 hours)");
}

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

