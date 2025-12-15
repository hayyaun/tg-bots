import { Bot, Context, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import {
  getUserProfile,
  updateCompletionScore,
  updateUserField,
  addProfileImage,
  removeProfileImage,
  deleteUserData,
  getUserIdFromTelegramId,
} from "../shared/database";
import { displayUser } from "./display";
import { displayProfile } from "../shared/display";
import { getSession } from "./session";
import { calculateAge } from "../shared/utils";
import { UserProfile } from "../shared/types";
import { MatchUser } from "./types";
import log from "../log";
import {
  INMANKIST_BOT_USERNAME,
  MOODS,
  MAX_COMPLETION_SCORE,
} from "../shared/constants";
import {
  BOT_NAME,
  MIN_INTERESTS,
  MAX_INTERESTS,
  MIN_COMPLETION_THRESHOLD,
  MIN_AGE,
  MAX_AGE,
  MAX_DISPLAY_NAME_LENGTH,
  ITEMS_PER_PAGE,
} from "./constants";
import {
  errors,
  success,
  fields,
  profileValues,
  buttons,
  editPrompts,
  report,
  callbacks,
  display,
  notifications,
  deleteData,
} from "./strings";
import { continueProfileCompletion } from "./commands";
import { findMatches } from "./matching";
import { setupProfileCallbacks } from "../shared/profileCallbacks";

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
          const likerName = likerProfile?.display_name 
            || (likerProfile?.username ? `@${likerProfile.username}` : "یک نفر");
          
          await bot.api.sendMessage(
            likedUserId,
            notifications.newLike(likerName),
            { parse_mode: "HTML" }
          );
        } catch (notifErr) {
          // Silently fail if user blocked the bot or other errors
          // Don't log as error since this is expected in some cases
          log.info(BOT_NAME + " > Like notification failed (user may have blocked bot)", { 
            likedUserId, 
            error: notifErr 
          });
        }
      }

      // Show next match or next liked user
      const session = getSession(userId);
      if (session.matches && session.currentMatchIndex !== undefined) {
        session.currentMatchIndex++;
        if (session.currentMatchIndex < session.matches.length) {
          const profile = await getUserProfile(userId);
          await displayUser(ctx, session.matches[session.currentMatchIndex], "match", false, session, profile?.interests || [], profile || undefined);
        } else {
          await ctx.reply(errors.noMatches);
        }
      } else if (session.likedUsers && session.currentLikedIndex !== undefined) {
        // Handle navigation for liked users list
        session.currentLikedIndex++;
        if (session.currentLikedIndex < session.likedUsers.length) {
          const profile = await getUserProfile(userId);
          await displayUser(ctx, session.likedUsers[session.currentLikedIndex], "liked", false, undefined, profile?.interests || [], profile || undefined);
        } else {
          await ctx.reply(display.allLikedSeen);
        }
      }
    } catch (err) {
      log.error(BOT_NAME + " > Like action failed", err);
      await ctx.answerCallbackQuery("❌ خطا در ثبت لایک"); // TODO: Add to strings
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
    
    // Show next match
    const session = getSession(userId);
    if (session.matches && session.currentMatchIndex !== undefined) {
      session.currentMatchIndex++;
      if (session.currentMatchIndex < session.matches.length) {
        const profile = await getUserProfile(userId);
        await displayUser(ctx, session.matches[session.currentMatchIndex], "match", false, session, profile?.interests || [], profile || undefined);
      } else {
        await ctx.reply(errors.noMatches);
      }
    }
  });

  // Next match action (skip without like/dislike)
  bot.callbackQuery(/next_match:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();
    
      // Show next match
      const session = getSession(userId);
      if (session.matches && session.currentMatchIndex !== undefined) {
        session.currentMatchIndex++;
        if (session.currentMatchIndex < session.matches.length) {
          const profile = await getUserProfile(userId);
          // Check if this is admin view (preserve showUsername setting)
          const isAdminView = (session as any).isAdminView === true;
          await displayUser(ctx, session.matches[session.currentMatchIndex], "match", isAdminView, session, profile?.interests || [], profile || undefined);
        } else {
          await ctx.reply(errors.noMatches);
        }
      }
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

      // Show next liked user
      const session = getSession(userId);
      if (session.likedUsers && session.currentLikedIndex !== undefined) {
        session.currentLikedIndex++;
        if (session.currentLikedIndex < session.likedUsers.length) {
          const profile = await getUserProfile(userId);
          await displayUser(ctx, session.likedUsers[session.currentLikedIndex], "liked", false, undefined, profile?.interests || [], profile || undefined);
        } else {
          await ctx.reply(display.allLikedSeen);
        }
      }
    } catch (err) {
      log.error(BOT_NAME + " > Delete liked failed", err);
      await ctx.answerCallbackQuery("❌ خطا"); // TODO: Add to strings
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
    const session = getSession(userId);
    session.reportingUserId = reportedUserId;

    await ctx.answerCallbackQuery();
    await ctx.reply(report.prompt);
  });

  // Handle report reason
  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = getSession(userId);
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
        const reportedUserIdBigInt = await getUserIdFromTelegramId(reportedUserId);
        
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


  // Callback: profile:edit (from /start command) - shows profile with completion status
  bot.callbackQuery("profile:edit", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    // Recalculate completion score to ensure it's up to date
    await updateCompletionScore(userId);
    const profile = await getUserProfile(userId);
    if (!profile) {
      await ctx.reply(errors.startFirst);
      return;
    }

    await displayProfile(ctx, profile, BOT_NAME, userId);
  });

  // Callback: find:start - triggers find functionality (same as /find command)
  bot.callbackQuery("find:start", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      const profile = await getUserProfile(userId);
      if (!profile) {
        await ctx.reply(errors.startFirst);
        return;
      }

      // Check required fields first (these are mandatory for matching to work)
      const missingRequiredFields: string[] = [];
      if (!profile.username) missingRequiredFields.push(fields.username);
      if (!profile.display_name) missingRequiredFields.push(fields.displayName);
      if (!profile.gender) missingRequiredFields.push(fields.gender);
      if (!profile.looking_for_gender) missingRequiredFields.push(fields.lookingForGender);
      if (!profile.birth_date) missingRequiredFields.push(fields.birthDate);
      
      // Check interests separately to show specific count
      if (!profile.interests || profile.interests.length < MIN_INTERESTS) {
        await ctx.reply(errors.minInterestsNotMet(profile.interests?.length || 0));
        return;
      }

      if (missingRequiredFields.length > 0) {
        await ctx.reply(errors.missingRequiredFields(missingRequiredFields));
        return;
      }

      // Check minimum completion for other optional fields
      if (profile.completion_score < MIN_COMPLETION_THRESHOLD) {
        await ctx.reply(errors.incompleteProfile(profile.completion_score));
        return;
      }

      // Note: Rate limiting is skipped for button clicks to improve UX
      // Users can still use /find command which has rate limiting
      
      const matches = await findMatches(userId);
      if (matches.length === 0) {
        await ctx.reply(errors.noMatches);
        return;
      }

      // Store matches in session for pagination
      const session = getSession(userId);
      session.matches = matches;
      session.currentMatchIndex = 0;

      // Show match count
      await ctx.reply(success.matchesFound(matches.length));

      // Show first match
      await displayUser(ctx, matches[0], "match", false, session, profile.interests || [], profile);
    } catch (err) {
      log.error(BOT_NAME + " > Find callback failed", err);
      await ctx.reply("❌ خطا در پیدا کردن افراد. لطفا دوباره تلاش کنید.");
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
      const session = getSession(userId);
      Object.keys(session).forEach(key => delete (session as Record<string, unknown>)[key]);
      
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

  // Photo uploads for profile image are now handled by setupProfileCallbacks

  // Admin callbacks
  if (adminUserId) {
    // Admin: Reports
    bot.callbackQuery(/^admin:reports$/, async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId || userId !== adminUserId) {
        await ctx.answerCallbackQuery("❌ دسترسی محدود");
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
          await ctx.reply("📋 هیچ گزارشی ثبت نشده است.");
          return;
        }

        let message = `📋 <b>Reports (${reports.length})</b>\n\n`;
        for (const report of reports) {
          const reporterName = report.reporter.display_name || report.reporter.username || `User ${report.reporter.telegram_id}`;
          const reportedName = report.reportedUser.display_name || report.reportedUser.username || `User ${report.reportedUser.telegram_id}`;
          const reason = report.reason || "بدون دلیل";
          const date = report.created_at.toLocaleDateString("fa-IR");
          
          message += `👤 <b>Reporter:</b> ${reporterName} (<code>${report.reporter.telegram_id}</code>)\n`;
          message += `🚫 <b>Reported:</b> ${reportedName} (<code>${report.reported_user_id}</code>)\n`;
          message += `📝 <b>Reason:</b> ${reason}\n`;
          message += `📅 <b>Date:</b> ${date}\n\n`;
        }

        await ctx.reply(message, { parse_mode: "HTML" });
      } catch (err) {
        log.error(BOT_NAME + " > Admin reports failed", err);
        await ctx.reply("❌ خطا در دریافت گزارش‌ها");
      }
    });

    // Admin: All Users
    bot.callbackQuery(/^admin:all_users$/, async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId || userId !== adminUserId) {
        await ctx.answerCallbackQuery("❌ دسترسی محدود");
        return;
      }

      await ctx.answerCallbackQuery();

      try {
        // Get all users without any filtering
        const allUsers = await prisma.user.findMany({
          orderBy: { created_at: "desc" },
        });

        if (allUsers.length === 0) {
          await ctx.reply("👥 هیچ کاربری ثبت نشده است.");
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

        // Store in session for pagination
        const session = getSession(userId);
        session.matches = users;
        session.currentMatchIndex = 0;
        // Mark as admin view so navigation preserves showUsername
        (session as any).isAdminView = true;

        await ctx.reply(`👥 <b>All Users (${users.length})</b>`, { parse_mode: "HTML" });

        // Show first user
        if (users.length > 0) {
          await displayUser(ctx, users[0], "match", true, session);
        }
      } catch (err) {
        log.error(BOT_NAME + " > Admin all users failed", err);
        await ctx.reply("❌ خطا در دریافت کاربران");
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
