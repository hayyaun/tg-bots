import { Bot, Context, InlineKeyboard } from "grammy";
import { query } from "../db";
import { getUserProfile, updateCompletionScore } from "./database";
import { displayMatch, displayLikedUser } from "./display";
import { getSession } from "./session";
import { calculateAge } from "./utils";
import { UserProfile, MatchUser } from "./types";
import log from "../log";
import { BOT_NAME } from "./constants";

export function setupCallbacks(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
) {
  // Like action
  bot.callbackQuery(/like:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const likedUserId = parseInt(ctx.match[1]);
    if (userId === likedUserId) {
      await ctx.answerCallbackQuery("شما نمی‌توانید خودتان را لایک کنید!");
      return;
    }

    try {
      // Add like
      await query(
        `INSERT INTO likes (user_id, liked_user_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, liked_user_id) DO NOTHING`,
        [userId, likedUserId]
      );

      // Check for mutual like
      const mutualResult = await query(
        "SELECT id FROM likes WHERE user_id = $1 AND liked_user_id = $2",
        [likedUserId, userId]
      );

      if (mutualResult.rows.length > 0) {
        // Mutual like!
        await ctx.answerCallbackQuery("🎉 مچ شدید! هر دو شما یکدیگر را لایک کردید!");
        await ctx.reply("🎉 مچ شدید! هر دو شما یکدیگر را لایک کردید!");
      } else {
        await ctx.answerCallbackQuery("✅ لایک ثبت شد!");
      }

      // Show next match
      const session = getSession(userId);
      if (session.matches && session.currentMatchIndex !== undefined) {
        session.currentMatchIndex++;
        if (session.currentMatchIndex < session.matches.length) {
          await displayMatch(ctx, session.matches[session.currentMatchIndex]);
        } else {
          await ctx.reply("شما تمام افراد موجود را دیده‌اید. لطفا بعدا دوباره تلاش کنید!");
        }
      }
    } catch (err) {
      log.error(BOT_NAME + " > Like action failed", err);
      await ctx.answerCallbackQuery("❌ خطا در ثبت لایک");
    }
  });

  // Dislike action
  bot.callbackQuery(/dislike:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    await ctx.answerCallbackQuery("✅ رد شد");
    
    // Show next match
    const session = getSession(userId);
    if (session.matches && session.currentMatchIndex !== undefined) {
      session.currentMatchIndex++;
      if (session.currentMatchIndex < session.matches.length) {
        await displayMatch(ctx, session.matches[session.currentMatchIndex]);
      } else {
        await ctx.reply("شما تمام افراد موجود را دیده‌اید. لطفا بعدا دوباره تلاش کنید!");
      }
    }
  });

  // Show liked user username
  bot.callbackQuery(/show_liked:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const likedUserId = parseInt(ctx.match[1]);
    const userResult = await query(
      "SELECT * FROM users WHERE telegram_id = $1",
      [likedUserId]
    );

    if (userResult.rows.length === 0) {
      await ctx.answerCallbackQuery("کاربر یافت نشد");
      return;
    }

    const user = userResult.rows[0] as UserProfile;
    const age = calculateAge(user.birth_date);
    const matchUser: MatchUser = { ...user, age, match_priority: 0 };

    await ctx.answerCallbackQuery("✅");
    await displayLikedUser(ctx, matchUser, true);
  });

  // Delete liked user (add to ignored)
  bot.callbackQuery(/delete_liked:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const likedUserId = parseInt(ctx.match[1]);
    try {
      await query(
        `INSERT INTO ignored (user_id, ignored_user_id, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, ignored_user_id) DO NOTHING`,
        [userId, likedUserId]
      );

      await ctx.answerCallbackQuery("✅ حذف شد");

      // Show next liked user
      const session = getSession(userId);
      if (session.likedUsers && session.currentLikedIndex !== undefined) {
        session.currentLikedIndex++;
        if (session.currentLikedIndex < session.likedUsers.length) {
          await displayLikedUser(ctx, session.likedUsers[session.currentLikedIndex]);
        } else {
          await ctx.reply("تمام افرادی که شما را لایک کرده‌اند را دیده‌اید.");
        }
      }
    } catch (err) {
      log.error(BOT_NAME + " > Delete liked failed", err);
      await ctx.answerCallbackQuery("❌ خطا");
    }
  });

  // Report user
  bot.callbackQuery(/report:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const reportedUserId = parseInt(ctx.match[1]);
    if (userId === reportedUserId) {
      await ctx.answerCallbackQuery("شما نمی‌توانید خودتان را گزارش دهید!");
      return;
    }

    // Store in session for reason collection
    const session = getSession(userId);
    session.reportingUserId = reportedUserId;

    await ctx.answerCallbackQuery();
    await ctx.reply(
      "لطفا دلیل گزارش را ارسال کنید (یا /cancel برای لغو):"
    );
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
        await ctx.reply("گزارش لغو شد.");
        return;
      }

      try {
        await query(
          `INSERT INTO reports (reporter_id, reported_user_id, reason, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [userId, reportedUserId, reason]
        );

        // Get user info for admin notification
        const reporterResult = await query(
          "SELECT username, display_name FROM users WHERE telegram_id = $1",
          [userId]
        );
        const reportedResult = await query(
          "SELECT username, display_name FROM users WHERE telegram_id = $1",
          [reportedUserId]
        );

        const reporter = reporterResult.rows[0];
        const reported = reportedResult.rows[0];

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
        await ctx.reply("✅ گزارش شما ثبت شد و به ادمین ارسال شد.");
      } catch (err) {
        log.error(BOT_NAME + " > Report failed", err);
        await ctx.reply("❌ خطا در ثبت گزارش");
      }
      return;
    }
    await next();
  });

  // Callback: profile:edit (from /start command)
  bot.callbackQuery("profile:edit", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    // Trigger /profile command handler
    const profile = await getUserProfile(userId);
    if (!profile) {
      await ctx.reply("لطفا ابتدا با دستور /start شروع کنید.");
      return;
    }

    const ageText = profile.birth_date
      ? `${calculateAge(profile.birth_date)} سال`
      : "ثبت نشده";
    const genderText = profile.gender === "male" ? "مرد" : profile.gender === "female" ? "زن" : "ثبت نشده";
    const lookingForText =
      profile.looking_for_gender === "male"
        ? "مرد"
        : profile.looking_for_gender === "female"
        ? "زن"
        : profile.looking_for_gender === "both"
        ? "هر دو"
        : "ثبت نشده";

    let message = `📋 <b>پروفایل شما</b>\n\n`;
    message += `👤 نام: ${profile.display_name || "ثبت نشده"}\n`;
    message += `🎂 سن: ${ageText}\n`;
    message += `⚧️ جنسیت: ${genderText}\n`;
    message += `🔍 دنبال: ${lookingForText}\n`;
    message += `📝 بیوگرافی: ${profile.biography || "ثبت نشده"}\n`;
    message += `🔮 کهن الگو: ${profile.archetype_result || "ثبت نشده"}\n`;
    message += `🧠 MBTI: ${profile.mbti_result ? profile.mbti_result.toUpperCase() : "ثبت نشده"}\n`;
    message += `📊 تکمیل: ${profile.completion_score}/9`;

    const keyboard = new InlineKeyboard()
      .text("✏️ ویرایش نام", "profile:edit:name")
      .text("📝 ویرایش بیوگرافی", "profile:edit:bio")
      .row()
      .text("🎂 تاریخ تولد", "profile:edit:birthdate")
      .text("⚧️ جنسیت", "profile:edit:gender")
      .row()
      .text("🔍 دنبال", "profile:edit:looking_for")
      .text("📷 تصاویر", "profile:edit:images")
      .row()
      .text("🔗 نام کاربری", "profile:edit:username");

    await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
  });

  // Callback: completion:check (from /start command)
  bot.callbackQuery("completion:check", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    const profile = await getUserProfile(userId);
    if (!profile) {
      await ctx.reply("لطفا ابتدا با دستور /start شروع کنید.");
      return;
    }

    await updateCompletionScore(userId);
    const updatedProfile = await getUserProfile(userId);
    const score = updatedProfile?.completion_score || 0;

    let message = `📊 <b>وضعیت تکمیل پروفایل: ${score}/9</b>\n\n`;
    message += `${profile.username ? "✅" : "❌"} نام کاربری\n`;
    message += `${profile.profile_images && profile.profile_images.length > 0 ? "✅" : "❌"} تصاویر پروفایل\n`;
    message += `${profile.display_name ? "✅" : "❌"} نام نمایشی\n`;
    message += `${profile.biography ? "✅" : "❌"} بیوگرافی\n`;
    message += `${profile.birth_date ? "✅" : "❌"} تاریخ تولد\n`;
    message += `${profile.gender ? "✅" : "❌"} جنسیت\n`;
    message += `${profile.looking_for_gender ? "✅" : "❌"} دنبال چه کسی هستید\n`;
    message += `${profile.archetype_result ? "✅" : "❌"} تست کهن الگو\n`;
    message += `${profile.mbti_result ? "✅" : "❌"} تست MBTI\n\n`;

    if (score < 7) {
      message += `⚠️ برای استفاده از دستور /find باید حداقل 7 مورد را تکمیل کنید.`;
    } else {
      message += `✅ پروفایل شما آماده استفاده است!`;
    }

    await ctx.reply(message, { parse_mode: "HTML" });
  });

  // Profile editing callbacks (simplified - full implementation would require state management)
  bot.callbackQuery(/profile:edit:(.+)/, async (ctx) => {
    const action = ctx.match[1];
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `برای ویرایش ${action}، لطفا از دستور /profile استفاده کنید.\nاین قابلیت در نسخه‌های بعدی اضافه خواهد شد.`
    );
  });
}

