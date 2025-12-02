import { Bot, Context, InlineKeyboard } from "grammy";
import { query } from "../db";
import {
  getUserProfile,
  updateCompletionScore,
  updateUserField,
  addProfileImage,
  removeProfileImage,
} from "./database";
import { displayMatch, displayLikedUser } from "./display";
import { getSession } from "./session";
import { calculateAge } from "./utils";
import { UserProfile, MatchUser } from "./types";
import log from "../log";
import { BOT_NAME, INMANKIST_BOT_USERNAME } from "./constants";

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
        delete session.reportingUserId; // Clear session state on error
        await ctx.reply("❌ خطا در ثبت گزارش. لطفا دوباره تلاش کنید.");
      }
      return;
    }

    // Handle profile editing
    if (session.editingField) {
      const text = ctx.message.text;
      
      // Handle cancel
      if (text === "/cancel") {
        delete session.editingField;
        await ctx.reply("❌ ویرایش لغو شد.");
        return;
      }

      try {
        switch (session.editingField) {
          case "name":
            if (text.length > 100) {
              await ctx.reply("❌ نام نمایشی نمی‌تواند بیشتر از 100 کاراکتر باشد.");
              return;
            }
            await updateUserField(userId, "display_name", text);
            delete session.editingField;
            await ctx.reply(`✅ نام نمایشی به "${text}" تغییر یافت.`);
            break;

          case "bio":
            if (text.length > 2000) {
              await ctx.reply("❌ بیوگرافی نمی‌تواند بیشتر از 2000 کاراکتر باشد.");
              return;
            }
            await updateUserField(userId, "biography", text);
            delete session.editingField;
            await ctx.reply("✅ بیوگرافی به‌روزرسانی شد.");
            break;

          case "birthdate":
            // Validate date format YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(text)) {
              await ctx.reply(
                "❌ فرمت تاریخ نامعتبر است. لطفا به فرمت YYYY-MM-DD ارسال کنید (مثال: 1995-05-15)"
              );
              return;
            }
            const birthDate = new Date(text);
            if (isNaN(birthDate.getTime())) {
              await ctx.reply("❌ تاریخ نامعتبر است.");
              return;
            }
            // Check if date is not in the future
            if (birthDate > new Date()) {
              await ctx.reply("❌ تاریخ تولد نمی‌تواند در آینده باشد.");
              return;
            }
            // Check if age is reasonable (between 18 and 120)
            const age = calculateAge(birthDate);
            if (!age || age < 18 || age > 120) {
              await ctx.reply("❌ سن باید بین 18 تا 120 سال باشد.");
              return;
            }
            await updateUserField(userId, "birth_date", text);
            delete session.editingField;
            await ctx.reply(`✅ تاریخ تولد ثبت شد. سن شما: ${age} سال`);
            break;

          default:
            await next();
            return;
        }
      } catch (err) {
        log.error(BOT_NAME + " > Profile edit failed", err);
        await ctx.reply("❌ خطا در به‌روزرسانی پروفایل.");
        delete session.editingField;
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
    
    // Show quiz results with instructions if missing
    if (profile.archetype_result) {
      message += `🔮 کهن الگو: ${profile.archetype_result}\n`;
    } else {
      message += `🔮 کهن الگو: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
    if (profile.mbti_result) {
      message += `🧠 MBTI: ${profile.mbti_result.toUpperCase()}\n`;
    } else {
      message += `🧠 MBTI: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
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
    
    // Add quiz button if quizzes are missing
    if (!profile.archetype_result || !profile.mbti_result) {
      keyboard.row().url("🧪 انجام تست‌ها", `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);
    }

    // Send photos if available
    if (profile.profile_images && Array.isArray(profile.profile_images) && profile.profile_images.length > 0) {
      const mediaGroup = profile.profile_images.slice(0, 10).map((fileId) => ({
        type: "photo" as const,
        media: fileId,
      }));
      await ctx.replyWithMediaGroup(mediaGroup);
    }

    await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
  });

  // Callback: completion:check (from /start command) - redirects to profile
  bot.callbackQuery("completion:check", async (ctx) => {
    await ctx.answerCallbackQuery();
    // Trigger /profile command by simulating it
    const userId = ctx.from?.id;
    if (!userId) return;

    // Recalculate completion score to ensure it's up to date
    await updateCompletionScore(userId);
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
    
    // Show quiz results with instructions if missing
    if (profile.archetype_result) {
      message += `🔮 کهن الگو: ${profile.archetype_result}\n`;
    } else {
      message += `🔮 کهن الگو: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
    if (profile.mbti_result) {
      message += `🧠 MBTI: ${profile.mbti_result.toUpperCase()}\n`;
    } else {
      message += `🧠 MBTI: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
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
    
    // Add quiz button if quizzes are missing
    if (!profile.archetype_result || !profile.mbti_result) {
      keyboard.row().url("🧪 انجام تست‌ها", `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);
    }

    // Send photos if available
    if (profile.profile_images && Array.isArray(profile.profile_images) && profile.profile_images.length > 0) {
      const mediaGroup = profile.profile_images.slice(0, 10).map((fileId) => ({
        type: "photo" as const,
        media: fileId,
      }));
      await ctx.replyWithMediaGroup(mediaGroup);
    }

    await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
  });

  // Profile editing callbacks
  bot.callbackQuery(/profile:edit:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const action = ctx.match[1];
    const session = getSession(userId);
    await ctx.answerCallbackQuery();

    switch (action) {
      case "name":
        session.editingField = "name";
        await ctx.reply(
          "لطفا نام نمایشی خود را ارسال کنید (حداکثر 100 کاراکتر):\n\nبرای لغو: /cancel"
        );
        break;

      case "bio":
        session.editingField = "bio";
        await ctx.reply(
          "لطفا بیوگرافی خود را ارسال کنید (حداکثر 2000 کاراکتر):\n\nبرای لغو: /cancel"
        );
        break;

      case "birthdate":
        session.editingField = "birthdate";
        await ctx.reply(
          "لطفا تاریخ تولد خود را به فرمت YYYY-MM-DD ارسال کنید (مثال: 1995-05-15):\n\nبرای لغو: /cancel"
        );
        break;

      case "gender":
        session.editingField = "gender";
        const genderKeyboard = new InlineKeyboard()
          .text("مرد", "profile:set:gender:male")
          .text("زن", "profile:set:gender:female");
        await ctx.reply("جنسیت خود را انتخاب کنید:", { reply_markup: genderKeyboard });
        break;

      case "looking_for":
        session.editingField = "looking_for";
        const lookingForKeyboard = new InlineKeyboard()
          .text("مرد", "profile:set:looking_for:male")
          .text("زن", "profile:set:looking_for:female")
          .row()
          .text("هر دو", "profile:set:looking_for:both");
        await ctx.reply("دنبال چه کسی هستید؟", { reply_markup: lookingForKeyboard });
        break;

      case "images":
        session.editingField = "images";
        const profile = await getUserProfile(userId);
        if (profile?.profile_images && profile.profile_images.length > 0) {
          const imagesKeyboard = new InlineKeyboard().text("➕ افزودن تصویر", "profile:images:add");
          if (profile.profile_images.length > 0) {
            imagesKeyboard.row().text("🗑️ حذف تصاویر", "profile:images:clear");
          }
          await ctx.reply(
            `شما ${profile.profile_images.length} تصویر دارید.\n\nبرای افزودن تصویر جدید، یک عکس ارسال کنید.\nبرای حذف همه تصاویر، از دکمه زیر استفاده کنید.`,
            { reply_markup: imagesKeyboard }
          );
        } else {
          await ctx.reply(
            "شما هنوز تصویری ندارید.\n\nبرای افزودن تصویر، یک عکس ارسال کنید:\n\nبرای لغو: /cancel"
          );
        }
        break;

      case "username":
        session.editingField = "username";
        // Update username from current Telegram profile
        const currentUsername = ctx.from?.username;
        if (currentUsername) {
          await updateUserField(userId, "username", currentUsername);
          await ctx.reply(
            `✅ نام کاربری به‌روزرسانی شد: @${currentUsername}\n\nنام کاربری شما از پروفایل تلگرام شما خوانده می‌شود و به صورت خودکار به‌روزرسانی می‌شود.`
          );
        } else {
          await ctx.reply(
            "❌ شما در حال حاضر نام کاربری تلگرام ندارید.\n\nلطفا در تنظیمات تلگرام یک نام کاربری تنظیم کنید و سپس دوباره این دکمه را بزنید."
          );
        }
        delete session.editingField;
        break;

      default:
        await ctx.reply("عملیات نامعتبر است.");
    }
  });

  // Handle setting gender
  bot.callbackQuery(/profile:set:gender:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const gender = ctx.match[1];
    await ctx.answerCallbackQuery();
    await updateUserField(userId, "gender", gender);
    delete getSession(userId).editingField;
    await ctx.reply(`✅ جنسیت به "${gender === "male" ? "مرد" : "زن"}" تغییر یافت.`);
  });

  // Handle setting looking_for
  bot.callbackQuery(/profile:set:looking_for:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const lookingFor = ctx.match[1];
    await ctx.answerCallbackQuery();
    const text =
      lookingFor === "male" ? "مرد" : lookingFor === "female" ? "زن" : "هر دو";
    await updateUserField(userId, "looking_for_gender", lookingFor);
    delete getSession(userId).editingField;
    await ctx.reply(`✅ تنظیمات به "${text}" تغییر یافت.`);
  });

  // Handle image management
  bot.callbackQuery("profile:images:add", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply("لطفا یک عکس ارسال کنید:\n\nبرای لغو: /cancel");
  });

  bot.callbackQuery("profile:images:clear", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();
    await updateUserField(userId, "profile_images", []);
    delete getSession(userId).editingField;
    await ctx.reply("✅ تمام تصاویر حذف شدند.");
  });


  // Handle photo uploads for profile images
  bot.on("message:photo", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = getSession(userId);
    if (session.editingField === "images") {
      const photo = ctx.message.photo;
      if (photo && photo.length > 0) {
        // Get the largest photo
        const largestPhoto = photo[photo.length - 1];
        const fileId = largestPhoto.file_id;

        try {
          await addProfileImage(userId, fileId);
          const profile = await getUserProfile(userId);
          const imageCount = profile?.profile_images?.length || 0;
          await ctx.reply(`✅ تصویر اضافه شد. شما اکنون ${imageCount} تصویر دارید.`);
        } catch (err) {
          log.error(BOT_NAME + " > Add image failed", err);
          await ctx.reply("❌ خطا در افزودن تصویر.");
        }
      }
    } else {
      await next();
    }
  });
}

