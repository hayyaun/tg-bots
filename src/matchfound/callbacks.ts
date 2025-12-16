import { Bot, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import log from "../log";
import {
  deleteUserData,
  getUserIdFromTelegramId,
  getUserProfile,
} from "../shared/database";
import { setupProfileCallbacks } from "../shared/profileCallbacks";
import { handleDisplayProfile } from "../shared/profileCommand";
import { calculateAge } from "../shared/utils";
import { BOT_NAME } from "./constants";
import { displayUser } from "./display";
import { continueProfileCompletion, handleFind, showNextUser, storeMatchesInSession } from "./helpers";
import { getSession } from "./session";
import {
  admin,
  callbacks,
  deleteData,
  display,
  errors,
  notifications,
  report,
  success,
} from "./strings";
import { MatchUser } from "./types";

export function setupCallbacks(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>,
  adminUserId?: number
) {
  // Like action
  bot.callbackQuery(/like:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const likedUserId = parseInt(ctx.match[1]);
    if (userId === likedUserId) {
      await ctx.answerCallbackQuery(errors.cannotLikeSelf);
      return;
    }

    try {
      // Get user ids from telegram_ids
      const userIdBigInt = await getUserIdFromTelegramId(userId);
      const likedUserIdBigInt = await getUserIdFromTelegramId(likedUserId);

      if (!userIdBigInt || !likedUserIdBigInt) {
        await ctx.answerCallbackQuery(errors.userNotFound);
        return;
      }

      // Add like
      await prisma.like.upsert({
        where: {
          user_id_liked_user_id: {
            user_id: userIdBigInt,
            liked_user_id: likedUserIdBigInt,
          },
        },
        create: {
          user_id: userIdBigInt,
          liked_user_id: likedUserIdBigInt,
        },
        update: {},
      });

      // Check for mutual like
      const mutualLike = await prisma.like.findUnique({
        where: {
          user_id_liked_user_id: {
            user_id: likedUserIdBigInt,
            liked_user_id: userIdBigInt,
          },
        },
      });

      if (mutualLike) {
        // Mutual like!
        await ctx.answerCallbackQuery(callbacks.mutualLike);
        await ctx.reply(success.mutualLike);
      } else {
        await ctx.answerCallbackQuery(callbacks.likeRegistered);

        // Send notification to the liked user
        try {
          const likerProfile = await getUserProfile(userId);
          const likerName =
            likerProfile?.display_name ||
            (likerProfile?.username
              ? `@${likerProfile.username}`
              : display.unknownPerson);

          await bot.api.sendMessage(
            likedUserId,
            notifications.newLike(likerName),
            { parse_mode: "HTML" }
          );
        } catch (notifErr) {
          // Silently fail if user blocked the bot or other errors
          // Don't log as error since this is expected in some cases
          log.info(
            BOT_NAME +
              " > Like notification failed (user may have blocked bot)",
            {
              likedUserId,
              error: notifErr,
            }
          );
        }
      }

      // Show next match or next liked user
      const session = await getSession(userId);
      if (session.matchIds && session.currentMatchIndex !== undefined) {
        await showNextUser(ctx, userId, "match");
      } else if (
        session.likedUserIds &&
        session.currentLikedIndex !== undefined
      ) {
        await showNextUser(ctx, userId, "liked");
      }
    } catch (err) {
      log.error(BOT_NAME + " > Like action failed", err);
      await ctx.answerCallbackQuery(errors.likeActionFailed);
      notifyAdmin(
        `❌ <b>Like Action Failed</b>\nUser: <code>${userId}</code>\nLiked User: <code>${likedUserId}</code>\nError: ${err}`
      );
    }
  });

  // Dislike action
  bot.callbackQuery(/dislike:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery(callbacks.disliked);
    await showNextUser(ctx, userId, "match");
  });

  // Next match action (skip without like/dislike)
  bot.callbackQuery(/next_match:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();
    await showNextUser(ctx, userId, "match");
  });

  // Delete liked user (add to ignored)
  bot.callbackQuery(/delete_liked:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const likedUserId = parseInt(ctx.match[1]);
    try {
      // Get user ids from telegram_ids
      const userIdBigInt = await getUserIdFromTelegramId(userId);
      const likedUserIdBigInt = await getUserIdFromTelegramId(likedUserId);

      if (!userIdBigInt || !likedUserIdBigInt) {
        await ctx.answerCallbackQuery(errors.userNotFound);
        return;
      }

      await prisma.ignored.upsert({
        where: {
          user_id_ignored_user_id: {
            user_id: userIdBigInt,
            ignored_user_id: likedUserIdBigInt,
          },
        },
        create: {
          user_id: userIdBigInt,
          ignored_user_id: likedUserIdBigInt,
        },
        update: {},
      });

      await ctx.answerCallbackQuery(callbacks.deleted);
      await showNextUser(ctx, userId, "liked");
    } catch (err) {
      log.error(BOT_NAME + " > Delete liked failed", err);
      await ctx.answerCallbackQuery(errors.deleteLikedFailed);
      notifyAdmin(
        `❌ <b>Delete Liked User Failed</b>\nUser: <code>${userId}</code>\nLiked User: <code>${likedUserId}</code>\nError: ${err}`
      );
    }
  });

  // Report user
  bot.callbackQuery(/report:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const reportedUserId = parseInt(ctx.match[1]);
    if (userId === reportedUserId) {
      await ctx.answerCallbackQuery(errors.cannotReportSelf);
      return;
    }

    // Store in session for reason collection
    const session = await getSession(userId);
    session.reportingUserId = reportedUserId;

    await ctx.answerCallbackQuery();
    await ctx.reply(report.prompt);
  });

  // Handle report reason
  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = await getSession(userId);
    if (session.reportingUserId) {
      const reportedUserId = session.reportingUserId;
      const reason = ctx.message.text;

      if (reason === "/cancel") {
        delete session.reportingUserId;
        await ctx.reply(report.cancelled);
        return;
      }

      try {
        // Get user ids from telegram_ids
        const userIdBigInt = await getUserIdFromTelegramId(userId);
        const reportedUserIdBigInt =
          await getUserIdFromTelegramId(reportedUserId);

        if (!userIdBigInt || !reportedUserIdBigInt) {
          await ctx.reply(errors.userNotFound);
          delete session.reportingUserId;
          return;
        }

        await prisma.report.create({
          data: {
            reporter_id: userIdBigInt,
            reported_user_id: reportedUserIdBigInt,
            reason,
          },
        });

        // Get user info for admin notification
        const reporter = await prisma.user.findUnique({
          where: { telegram_id: BigInt(userId) },
          select: { username: true, display_name: true },
        });
        const reported = await prisma.user.findUnique({
          where: { telegram_id: BigInt(reportedUserId) },
          select: { username: true, display_name: true },
        });

        // Notify admin immediately
        notifyAdmin(
          `🚨 <b>New Report</b>\n\n` +
            `Reporter: ${reporter?.username ? `@${reporter.username}` : reporter?.display_name || userId}\n` +
            `Reporter ID: <code>${userId}</code>\n\n` +
            `Reported: ${reported?.username ? `@${reported.username}` : reported?.display_name || reportedUserId}\n` +
            `Reported ID: <code>${reportedUserId}</code>\n\n` +
            `Reason: ${reason}`
        );

        delete session.reportingUserId;
        await ctx.reply(success.reportSubmitted);
      } catch (err) {
        log.error(BOT_NAME + " > Report failed", err);
        delete session.reportingUserId; // Clear session state on error
        await ctx.reply(errors.reportFailed);
        notifyAdmin(
          `❌ <b>Report Submission Failed</b>\nReporter: <code>${userId}</code>\nReported: <code>${reportedUserId}</code>\nError: ${err}`
        );
      }
      return;
    }

    // Profile editing is now handled by setupProfileCallbacks
    await next();
  });

  // Callback: profile (from /start command) - shows profile with completion status
  bot.callbackQuery("profile", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    await handleDisplayProfile(ctx, userId, BOT_NAME, notifyAdmin);
  });

  // Callback: find:start - triggers find functionality (same as /find command)
  bot.callbackQuery("find:start", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      // Note: Rate limiting is skipped for button clicks to improve UX
      // Users can still use /find command which has rate limiting
      await handleFind(ctx, userId, false);
    } catch (err) {
      log.error(BOT_NAME + " > Find callback failed", err);
      await ctx.reply(errors.findFailed);
      notifyAdmin(
        `❌ <b>Find Callback Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // Profile editing callbacks are now handled by setupProfileCallbacks
  // This is called at the end of setupCallbacks

  // Wipe data confirmation
  bot.callbackQuery("wipe_data:confirm", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();

    try {
      await deleteUserData(userId);

      // Clear session data
      const session = await getSession(userId);
      Object.keys(session).forEach(
        (key) => delete (session as Record<string, unknown>)[key]
      );

      await ctx.editMessageText(success.dataDeleted);

      // Notify admin
      await notifyAdmin(
        `🗑️ <b>User Data Deleted</b>\nUser: <code>${userId}</code>\nAll data has been permanently deleted.`
      );
    } catch (err) {
      log.error(BOT_NAME + " > Delete user data failed", err);
      await ctx.editMessageText(errors.deleteFailed);
      await notifyAdmin(
        `❌ <b>Delete User Data Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  bot.callbackQuery("wipe_data:cancel", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();

    await ctx.editMessageText(deleteData.cancelled);
  });

  // Settings: wipe_data callback
  bot.callbackQuery("settings:wipe_data", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();

    try {
      const profile = await getUserProfile(userId);
      if (!profile) {
        await ctx.editMessageText(errors.startFirst);
        return;
      }

      const keyboard = new InlineKeyboard()
        .text(deleteData.buttons.confirm, "wipe_data:confirm")
        .row()
        .text(deleteData.buttons.cancel, "wipe_data:cancel");

      await ctx.editMessageText(deleteData.confirmPrompt, {
        reply_markup: keyboard,
        parse_mode: "HTML",
      });
    } catch (err) {
      log.error(BOT_NAME + " > Settings wipe_data callback failed", err);
      await ctx.editMessageText(errors.commandFailed);
      await notifyAdmin(
        `❌ <b>Settings Wipe Data Callback Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // Photo uploads for profile image are now handled by setupProfileCallbacks

  // Admin callbacks
  if (adminUserId) {
    // Admin: Reports
    bot.callbackQuery(/^admin:reports$/, async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId || userId !== adminUserId) {
        await ctx.answerCallbackQuery(errors.accessDenied);
        return;
      }

      await ctx.answerCallbackQuery();

      try {
        const reports = await prisma.report.findMany({
          take: 50, // Show last 50 reports
          orderBy: { created_at: "desc" },
          include: {
            reporter: {
              select: {
                telegram_id: true,
                display_name: true,
                username: true,
              },
            },
            reportedUser: {
              select: {
                telegram_id: true,
                display_name: true,
                username: true,
              },
            },
          },
        });

        if (reports.length === 0) {
          await ctx.reply(admin.noReports);
          return;
        }

        let message = `${admin.reportsTitle(reports.length)}\n\n`;
        for (const report of reports) {
          const reporterName =
            report.reporter.display_name ||
            report.reporter.username ||
            `${admin.userPrefix} ${report.reporter.telegram_id}`;
          const reportedName =
            report.reportedUser.display_name ||
            report.reportedUser.username ||
            `${admin.userPrefix} ${report.reportedUser.telegram_id}`;
          const reason = report.reason || admin.noReason;
          const date = report.created_at.toLocaleDateString("fa-IR");

          message += `${admin.reportLabels.reporter} ${reporterName} (<code>${report.reporter.telegram_id}</code>)\n`;
          message += `${admin.reportLabels.reported} ${reportedName} (<code>${report.reported_user_id}</code>)\n`;
          message += `${admin.reportLabels.reason} ${reason}\n`;
          message += `${admin.reportLabels.date} ${date}\n\n`;
        }

        await ctx.reply(message, { parse_mode: "HTML" });
      } catch (err) {
        log.error(BOT_NAME + " > Admin reports failed", err);
        await ctx.reply(errors.reportsFailed);
      }
    });

    // Admin: All Users
    bot.callbackQuery(/^admin:all_users$/, async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId || userId !== adminUserId) {
        await ctx.answerCallbackQuery(errors.accessDenied);
        return;
      }

      await ctx.answerCallbackQuery();

      try {
        // Get all users without any filtering
        const allUsers = await prisma.user.findMany({
          orderBy: { created_at: "desc" },
        });

        if (allUsers.length === 0) {
          await ctx.reply(admin.noUsers);
          return;
        }

        // Convert to MatchUser format for display
        const users: MatchUser[] = allUsers.map((user) => {
          const age = user.birth_date ? calculateAge(user.birth_date) : null;
          return {
            ...user,
            telegram_id: Number(user.telegram_id),
            birth_date: user.birth_date || null,
            interests: user.interests || [],
            age: age,
            match_priority: 999, // Default priority for admin view
          } as MatchUser;
        });

        // Store in optimized format (IDs + metadata)
        const session = await getSession(userId);
        storeMatchesInSession(users, session);
        session.currentMatchIndex = 0;
        // Mark as admin view so navigation preserves showUsername
        session.isAdminView = true;

        await ctx.reply(admin.allUsersTitle(users.length), {
          parse_mode: "HTML",
        });

        // Show first user
        if (users.length > 0) {
          await displayUser(ctx, users[0], "match", true, session);
        }
      } catch (err) {
        log.error(BOT_NAME + " > Admin all users failed", err);
        await ctx.reply(errors.usersFailed);
      }
    });
  }

  // Setup shared profile callbacks (all profile editing)
  setupProfileCallbacks(bot, {
    botName: BOT_NAME,
    getSession,
    onContinueProfileCompletion: continueProfileCompletion,
    notifyAdmin,
  });
}
