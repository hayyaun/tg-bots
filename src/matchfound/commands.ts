import { Bot, Context, InlineKeyboard, InputFile } from "grammy";
import { prisma } from "../db";
import log from "../log";
import {
  ensureUserExists,
  getUserIdFromTelegramId,
  getUserProfile,
} from "../shared/database";
import { setupProfileCommand } from "../shared/profileCommand";
import { UserProfile } from "../shared/types";
import { calculateAge } from "../shared/utils";
import {
  BOT_NAME,
  FIND_RATE_LIMIT_MS,
  MIN_COMPLETION_THRESHOLD,
} from "./constants";
import { displayUser } from "./display";
import {
  createMainActionsKeyboard,
  executeFindAndDisplay,
  getMissingRequiredFields,
  promptNextRequiredField,
  validateProfileForFind,
} from "./helpers";
import { findMatches } from "./matching";
import { getSession } from "./session";
import {
  buttons,
  deleteData,
  errors,
  fields,
  getWelcomeMessage,
  profileCompletion,
  settings,
  success,
} from "./strings";
import { MatchUser } from "./types";
import { generateDailyActiveUsersChart } from "./charts";

const formatNumber = (value: number | bigint) => value.toLocaleString("en-US");
const ADMIN_DAU_DAYS = 14;

export function setupCommands(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>,
  adminUserId?: number
) {
  // /start command
  bot.command("start", async (ctx) => {
    ctx.react("❤‍🔥").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      const username = ctx.from?.username;
      const firstName = ctx.from?.first_name;
      const lastName = ctx.from?.last_name;
      await ensureUserExists(
        userId,
        username,
        async (uid, uname) => {
          await notifyAdmin(
            `👤 <b>New User Registration</b>\nUser: ${uname ? `@${uname}` : `ID: ${uid}`}\nID: <code>${uid}</code>`
          );
        },
        firstName,
        lastName
      );

      const profile = await getUserProfile(userId);
      if (!profile) {
        await ctx.reply("❌ خطا در دریافت پروفایل. لطفا دوباره تلاش کنید.");
        return;
      }

      // Always show welcome message first
      const completionScore = profile.completion_score || 0;
      const welcomeMessage = getWelcomeMessage(completionScore);
      await ctx.reply(welcomeMessage);

      // Check for missing required fields
      const missingFields = getMissingRequiredFields(profile);

      if (missingFields.length > 0) {
        // Start profile completion flow
        await ctx.reply(profileCompletion.welcome);
        await promptNextRequiredField(ctx, bot, userId, missingFields, 0);
      } else {
        // All required fields completed, show action buttons
        await ctx.reply("✨ می‌تونی از دکمه‌های زیر استفاده کنی:", {
          reply_markup: createMainActionsKeyboard(),
        });
      }
    } catch (err) {
      log.error(BOT_NAME + " > Start command failed", err);
      await ctx.reply("❌ خطا در اجرای دستور. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Start Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // /find command
  bot.command("find", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      const profile = await getUserProfile(userId);
      if (!(await validateProfileForFind(profile, ctx))) {
        return;
      }

      await executeFindAndDisplay(ctx, userId, profile!, true);
    } catch (err) {
      log.error(BOT_NAME + " > Find command failed", err);
      await ctx.reply("❌ خطا در پیدا کردن افراد. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Find Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // /liked command
  bot.command("liked", async (ctx) => {
    ctx.react("❤").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      // Get user id from telegram_id
      const userIdBigInt = await getUserIdFromTelegramId(userId);
      if (!userIdBigInt) {
        await ctx.reply(errors.userNotFound);
        return;
      }

      // Get users who liked this user (and not ignored)
      // Get users who liked this user, excluding ignored ones
      const likes = await prisma.like.findMany({
        where: {
          liked_user_id: userIdBigInt,
          user: {
            ignoredReceived: {
              none: {
                user_id: userIdBigInt,
              },
            },
          },
        },
        include: {
          user: true,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      // Filter out users that this user has ignored
      const ignoredByUser = await prisma.ignored.findMany({
        where: { user_id: userIdBigInt },
        select: { ignored_user_id: true },
      });
      const ignoredIds = new Set(
        ignoredByUser.map((i: { ignored_user_id: bigint }) => i.ignored_user_id)
      );
      const filteredLikes = likes.filter(
        (like: (typeof likes)[0]) => !ignoredIds.has(like.user_id)
      );

      if (filteredLikes.length === 0) {
        await ctx.reply(errors.noLikes);
        return;
      }

      // Store in session for pagination
      const session = getSession(userId);
      session.likedUsers = filteredLikes.map(
        (like: (typeof filteredLikes)[0]) => {
          const user = like.user;
          return {
            ...user,
            telegram_id: Number(user.telegram_id),
            birth_date: user.birth_date || null,
            created_at: user.created_at,
            updated_at: user.updated_at,
            age: calculateAge(user.birth_date),
            match_priority: 0,
          } as MatchUser;
        }
      );
      session.currentLikedIndex = 0;

      // Show first person
      const firstUser = session.likedUsers![0];
      firstUser.age = firstUser.age || calculateAge(firstUser.birth_date);
      const profile = await getUserProfile(userId);
      await displayUser(
        ctx,
        firstUser,
        "liked",
        false,
        undefined,
        profile?.interests || [],
        profile || undefined
      );
    } catch (err) {
      log.error(BOT_NAME + " > Liked command failed", err);
      await ctx.reply("❌ خطا در دریافت لیست لایک‌ها. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Liked Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // /profile command (using shared module)
  setupProfileCommand(bot, {
    botName: BOT_NAME,
    notifyAdmin,
  });

  // /settings command
  bot.command("settings", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    const userId = ctx.from?.id;
    try {
      await ctx.reply(
        settings.title +
          settings.profile +
          settings.find +
          settings.liked +
          settings.deleteData
      );
    } catch (err) {
      log.error(BOT_NAME + " > Settings command failed", err);
      await ctx.reply("❌ خطا در نمایش تنظیمات. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Settings Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // /wipe_data command
  bot.command("wipe_data", async (ctx) => {
    ctx.react("😱").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;
    try {
      const profile = await getUserProfile(userId);
      if (!profile) {
        await ctx.reply(errors.startFirst);
        return;
      }

      const keyboard = new InlineKeyboard()
        .text("✅ بله، حذف کن", "wipe_data:confirm")
        .row()
        .text("❌ لغو", "wipe_data:cancel");

      await ctx.reply(deleteData.confirmPrompt, {
        reply_markup: keyboard,
        parse_mode: "HTML",
      });
    } catch (err) {
      log.error(BOT_NAME + " > Delete data command failed", err);
      await ctx.reply("❌ خطا در اجرای دستور. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Delete Data Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // /admin command
  bot.command("admin", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Check if user is admin
    if (!adminUserId || userId !== adminUserId) {
      await ctx.reply("❌ دسترسی محدود");
      return;
    }

    ctx.react("👏").catch(() => {});

    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dauStart = new Date();
      dauStart.setHours(0, 0, 0, 0);
      dauStart.setDate(dauStart.getDate() - (ADMIN_DAU_DAYS - 1));

      const [
        totalUsers,
        completedProfiles,
        newUsers,
        totalLikes,
        totalReports,
        mutualLikesRows,
      ] = await prisma.$transaction([
        prisma.user.count(),
        prisma.user.count({
          where: { completion_score: { gte: MIN_COMPLETION_THRESHOLD } },
        }),
        prisma.user.count({
          where: { created_at: { gte: since24h } },
        }),
        prisma.like.count(),
        prisma.report.count(),
        prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint AS count
            FROM likes l1
            JOIN likes l2
              ON l1.user_id = l2.liked_user_id
             AND l1.liked_user_id = l2.user_id
           WHERE l1.user_id < l1.liked_user_id
          `,
      ]);

      const mutualLikes = Number(mutualLikesRows?.[0]?.count ?? 0);

      const dailyActiveRows = await prisma.$queryRaw<
        { day: Date; active_users: bigint }[]
      >`
          SELECT
            date_trunc('day', updated_at) AS day,
            COUNT(*)::bigint AS active_users
          FROM users
          WHERE updated_at >= ${dauStart}
          GROUP BY 1
          ORDER BY 1;
        `;

      const dailyNewRows = await prisma.$queryRaw<
        { day: Date; new_users: bigint }[]
      >`
          SELECT
            date_trunc('day', created_at) AS day,
            COUNT(*)::bigint AS new_users
          FROM users
          WHERE created_at >= ${dauStart}
          GROUP BY 1
          ORDER BY 1;
        `;

      const totalBeforeWindow = await prisma.user.count({
        where: { created_at: { lt: dauStart } },
      });

      // Helper to convert date row to day key
      const getDayKey = (day: Date | string): string => {
        const date = day instanceof Date ? day : new Date(day as unknown as string);
        return date.toISOString().slice(0, 10);
      };

      const dailyActiveMap = new Map<string, number>();
      for (const row of dailyActiveRows) {
        const dayKey = getDayKey(row.day);
        dailyActiveMap.set(dayKey, Number(row.active_users ?? 0));
      }

      const dailyNewMap = new Map<string, number>();
      for (const row of dailyNewRows) {
        const dayKey = getDayKey(row.day);
        dailyNewMap.set(dayKey, Number(row.new_users ?? 0));
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyActiveSeries = [];
      const dailyTotalSeries = [];
      let runningTotal = totalBeforeWindow;
      for (let i = ADMIN_DAU_DAYS - 1; i >= 0; i--) {
        const day = new Date(today);
        day.setDate(today.getDate() - i);
        const dayKey = day.toISOString().slice(0, 10);
        runningTotal += dailyNewMap.get(dayKey) ?? 0;
        dailyActiveSeries.push({
          date: day,
          active: dailyActiveMap.get(dayKey) ?? 0,
        });
        dailyTotalSeries.push({
          date: day,
          active: runningTotal,
        });
      }

      const chartBuffer = generateDailyActiveUsersChart(
        dailyActiveSeries,
        dailyTotalSeries,
        {
          title: `Users & DAU (last ${ADMIN_DAU_DAYS} days)`,
          activeLabel: "Daily Active Users",
          totalLabel: "Total Users",
        }
      );

      const keyboard = new InlineKeyboard()
        .text("📋 Reports", "admin:reports")
        .row()
        .text("👥 Users", "admin:all_users")
        .row();

      const statsMessage =
        "🔐 <b>Admin Panel</b>\n\n" +
        "📊 <b>Statistics</b>\n" +
        `👥 Users: ${formatNumber(totalUsers)} (24h: ${formatNumber(newUsers)})\n` +
        `✅ Completed (>=${MIN_COMPLETION_THRESHOLD}%): ${formatNumber(completedProfiles)}\n` +
        `❤️ Likes: ${formatNumber(totalLikes)}\n` +
        `🤝 Matches (mutual likes): ${formatNumber(mutualLikes)}\n` +
        `🚫 Reports: ${formatNumber(totalReports)}`;

      await ctx.replyWithPhoto(new InputFile(chartBuffer, "dau.png"), {
        caption: statsMessage,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
    } catch (err) {
      log.error(BOT_NAME + " > Admin stats failed", err);
      await ctx.reply("⚠️ خطا در دریافت آمار. لطفا دوباره تلاش کنید.");
    }
  });
}
