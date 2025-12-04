import { Bot, Context, InlineKeyboard } from "grammy";
import { prisma } from "../db";
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
import { BOT_NAME, INMANKIST_BOT_USERNAME, MOODS, INTERESTS, INTEREST_NAMES } from "./constants";

// Helper function to build interests keyboard with pagination
function buildInterestsKeyboard(
  selectedInterests: Set<string>,
  currentPage: number,
  itemsPerPage: number = 20
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const totalItems = INTERESTS.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageItems = INTERESTS.slice(startIndex, endIndex);

  // Add interest buttons (2 per row)
  let rowCount = 0;
  for (const interest of pageItems) {
    const isSelected = selectedInterests.has(interest);
    const displayName = INTEREST_NAMES[interest];
    const prefix = isSelected ? "✅ " : "";
    keyboard.text(`${prefix}${displayName}`, `profile:toggle:interest:${interest}`);
    rowCount++;
    if (rowCount % 2 === 0) {
      keyboard.row();
    }
  }

  // Add pagination buttons
  if (totalPages > 1) {
    keyboard.row();
    if (currentPage > 0) {
      keyboard.text("◀️ قبلی", `profile:interests:page:${currentPage - 1}`);
    } else {
      keyboard.text(" ", "profile:interests:noop"); // Placeholder for spacing
    }
    keyboard.text(`صفحه ${currentPage + 1}/${totalPages}`, "profile:interests:noop");
    if (currentPage < totalPages - 1) {
      keyboard.text("بعدی ▶️", `profile:interests:page:${currentPage + 1}`);
    } else {
      keyboard.text(" ", "profile:interests:noop"); // Placeholder for spacing
    }
  }

  return keyboard;
}

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
      await prisma.like.upsert({
        where: {
          user_id_liked_user_id: {
            user_id: BigInt(userId),
            liked_user_id: BigInt(likedUserId),
          },
        },
        create: {
          user_id: BigInt(userId),
          liked_user_id: BigInt(likedUserId),
        },
        update: {},
      });

      // Check for mutual like
      const mutualLike = await prisma.like.findUnique({
        where: {
          user_id_liked_user_id: {
            user_id: BigInt(likedUserId),
            liked_user_id: BigInt(userId),
          },
        },
      });

      if (mutualLike) {
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
    const userData = await prisma.user.findUnique({
      where: { telegram_id: BigInt(likedUserId) },
    });

    if (!userData) {
      await ctx.answerCallbackQuery("کاربر یافت نشد");
      return;
    }

    const user: UserProfile = {
      ...userData,
      telegram_id: Number(userData.telegram_id),
      birth_date: userData.birth_date || null,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    };
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
      await prisma.ignored.upsert({
        where: {
          user_id_ignored_user_id: {
            user_id: BigInt(userId),
            ignored_user_id: BigInt(likedUserId),
          },
        },
        create: {
          user_id: BigInt(userId),
          ignored_user_id: BigInt(likedUserId),
        },
        update: {},
      });

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
        await prisma.report.create({
          data: {
            reporter_id: BigInt(userId),
            reported_user_id: BigInt(reportedUserId),
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
        ? "خانم"
        : profile.looking_for_gender === "both"
        ? "هر دو"
        : "ثبت نشده";

    let message = `📋 <b>پروفایل شما</b>\n\n`;
    message += `👤 نام: ${profile.display_name || "ثبت نشده"}\n`;
    message += `🎂 سن: ${ageText}\n`;
    message += `⚧️ جنسیت: ${genderText}\n`;
    message += `💝 پیشنهاد: ${lookingForText}\n`;
    message += `📝 بیوگرافی: ${profile.biography || "ثبت نشده"}\n`;
    
    // Show quiz results with instructions if missing
    if (profile.archetype_result) {
      message += `🔮 کهن الگو: ${profile.archetype_result}\n`;
    } else {
      message += `🔮 کهن الگو: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
    if (profile.mbti_result) {
      message += `🧠 تست MBTI: ${profile.mbti_result.toUpperCase()}\n`;
    } else {
      message += `🧠 تست MBTI: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
    if (profile.mood) {
      message += `😊 مود: ${MOODS[profile.mood] || profile.mood}\n`;
    } else {
      message += `😊 مود: ثبت نشده\n`;
    }
    
    if (profile.interests && profile.interests.length > 0) {
      const interestNames = profile.interests
        .map((interest) => INTEREST_NAMES[interest as keyof typeof INTEREST_NAMES] || interest)
        .join(", ");
      message += `🎯 علایق: ${interestNames}\n`;
    } else {
      message += `🎯 علایق: ثبت نشده\n`;
    }
    
    message += `📊 تکمیل: ${profile.completion_score}/11`;

    const keyboard = new InlineKeyboard()
      .text("✏️ ویرایش نام", "profile:edit:name")
      .text("📝 ویرایش بیوگرافی", "profile:edit:bio")
      .row()
      .text("🎂 تاریخ تولد", "profile:edit:birthdate")
      .text("⚧️ جنسیت", "profile:edit:gender")
      .row()
      .text("💝 پیشنهاد", "profile:edit:looking_for")
      .text("📷 تصاویر", "profile:edit:images")
      .row()
      .text("🔗 نام کاربری", "profile:edit:username")
      .text("😊 مود", "profile:edit:mood")
      .row()
      .text("🎯 علایق", "profile:edit:interests");
    
    // Add quiz button if quizzes are missing
    if (!profile.archetype_result || !profile.mbti_result) {
      keyboard.row().url("🧪 انجام تست‌ها", `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);
    }

    // Send photos if available - attach text to first image
    if (profile.profile_images && Array.isArray(profile.profile_images) && profile.profile_images.length > 0) {
      const images = profile.profile_images.slice(0, 10);
      // Send first image with text as caption
      await ctx.replyWithPhoto(images[0], {
        caption: message,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      // Send remaining images if any
      if (images.length > 1) {
        const remainingImages = images.slice(1).map((fileId) => ({
          type: "photo" as const,
          media: fileId,
        }));
        await ctx.replyWithMediaGroup(remainingImages);
      }
    } else {
      // No images - send text message only
      await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
    }
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
        ? "خانم"
        : profile.looking_for_gender === "both"
        ? "هر دو"
        : "ثبت نشده";

    let message = `📋 <b>پروفایل شما</b>\n\n`;
    message += `👤 نام: ${profile.display_name || "ثبت نشده"}\n`;
    message += `🎂 سن: ${ageText}\n`;
    message += `⚧️ جنسیت: ${genderText}\n`;
    message += `💝 پیشنهاد: ${lookingForText}\n`;
    message += `📝 بیوگرافی: ${profile.biography || "ثبت نشده"}\n`;
    
    // Show quiz results with instructions if missing
    if (profile.archetype_result) {
      message += `🔮 کهن الگو: ${profile.archetype_result}\n`;
    } else {
      message += `🔮 کهن الگو: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
    if (profile.mbti_result) {
      message += `🧠 تست MBTI: ${profile.mbti_result.toUpperCase()}\n`;
    } else {
      message += `🧠 تست MBTI: ثبت نشده (در @${INMANKIST_BOT_USERNAME} انجام دهید)\n`;
    }
    
    if (profile.mood) {
      message += `😊 مود: ${MOODS[profile.mood] || profile.mood}\n`;
    } else {
      message += `😊 مود: ثبت نشده\n`;
    }
    
    if (profile.interests && profile.interests.length > 0) {
      const interestNames = profile.interests
        .map((interest) => INTEREST_NAMES[interest as keyof typeof INTEREST_NAMES] || interest)
        .join(", ");
      message += `🎯 علایق: ${interestNames}\n`;
    } else {
      message += `🎯 علایق: ثبت نشده\n`;
    }
    
    message += `📊 تکمیل: ${profile.completion_score}/11`;

    const keyboard = new InlineKeyboard()
      .text("✏️ ویرایش نام", "profile:edit:name")
      .text("📝 ویرایش بیوگرافی", "profile:edit:bio")
      .row()
      .text("🎂 تاریخ تولد", "profile:edit:birthdate")
      .text("⚧️ جنسیت", "profile:edit:gender")
      .row()
      .text("💝 پیشنهاد", "profile:edit:looking_for")
      .text("📷 تصاویر", "profile:edit:images")
      .row()
      .text("🔗 نام کاربری", "profile:edit:username")
      .text("😊 مود", "profile:edit:mood")
      .row()
      .text("🎯 علایق", "profile:edit:interests");
    
    // Add quiz button if quizzes are missing
    if (!profile.archetype_result || !profile.mbti_result) {
      keyboard.row().url("🧪 انجام تست‌ها", `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);
    }

    // Send photos if available - attach text to first image
    if (profile.profile_images && Array.isArray(profile.profile_images) && profile.profile_images.length > 0) {
      const images = profile.profile_images.slice(0, 10);
      // Send first image with text as caption
      await ctx.replyWithPhoto(images[0], {
        caption: message,
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      // Send remaining images if any
      if (images.length > 1) {
        const remainingImages = images.slice(1).map((fileId) => ({
          type: "photo" as const,
          media: fileId,
        }));
        await ctx.replyWithMediaGroup(remainingImages);
      }
    } else {
      // No images - send text message only
      await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
    }
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
          .text("خانم", "profile:set:looking_for:female")
          .row()
          .text("هر دو", "profile:set:looking_for:both");
        await ctx.reply("می‌خواهید چه کسی به شما پیشنهاد شود؟", { reply_markup: lookingForKeyboard });
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

      case "mood":
        session.editingField = "mood";
        const moodKeyboard = new InlineKeyboard()
          .text(`${MOODS.happy} خوشحال`, "profile:set:mood:happy")
          .text(`${MOODS.sad} غمگین`, "profile:set:mood:sad")
          .row()
          .text(`${MOODS.tired} خسته`, "profile:set:mood:tired")
          .text(`${MOODS.cool} باحال`, "profile:set:mood:cool")
          .row()
          .text(`${MOODS.thinking} در حال فکر`, "profile:set:mood:thinking")
          .text(`${MOODS.excited} هیجان‌زده`, "profile:set:mood:excited")
          .row()
          .text(`${MOODS.calm} آرام`, "profile:set:mood:calm")
          .text(`${MOODS.angry} عصبانی`, "profile:set:mood:angry")
          .row()
          .text(`${MOODS.neutral} خنثی`, "profile:set:mood:neutral")
          .text(`${MOODS.playful} بازیگوش`, "profile:set:mood:playful");
        await ctx.reply("مود خود را انتخاب کنید:", { reply_markup: moodKeyboard });
        break;

      case "interests":
        session.editingField = "interests";
        const profileForInterests = await getUserProfile(userId);
        const currentInterests = new Set(profileForInterests?.interests || []);
        session.interestsPage = 0; // Start at first page
        
        const interestsKeyboard = buildInterestsKeyboard(currentInterests, session.interestsPage);
        const selectedCount = currentInterests.size;
        const totalPages = Math.ceil(INTERESTS.length / 20);
        await ctx.reply(
          `🎯 علایق خود را انتخاب کنید (${selectedCount} مورد انتخاب شده)\nصفحه 1/${totalPages}\n\nبرای انتخاب/لغو انتخاب هر مورد، روی آن کلیک کنید. تغییرات به صورت خودکار ذخیره می‌شوند.`,
          { reply_markup: interestsKeyboard }
        );
        break;

      default:
        await ctx.reply("عملیات نامعتبر است.");
    }
  });

  // Handle setting mood
  bot.callbackQuery(/profile:set:mood:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const mood = ctx.match[1];
    await ctx.answerCallbackQuery();
    const session = getSession(userId);

    if (!Object.keys(MOODS).includes(mood)) {
      await ctx.reply("❌ مود نامعتبر است.");
      delete session.editingField;
      return;
    }

    await updateUserField(userId, "mood", mood);
    delete session.editingField;
    await ctx.reply(`✅ مود به ${MOODS[mood]} تغییر یافت.`);
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
      lookingFor === "male" ? "مرد" : lookingFor === "female" ? "خانم" : "هر دو";
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


  // Handle toggling interests (saves immediately to database)
  bot.callbackQuery(/profile:toggle:interest:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Answer callback query immediately to prevent timeout
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries

    const interest = ctx.match[1];
    const session = getSession(userId);
    
    // Get current interests from database
    const profile = await getUserProfile(userId);
    const currentInterests = new Set(profile?.interests || []);
    
    // Toggle interest
    if (currentInterests.has(interest)) {
      currentInterests.delete(interest);
    } else {
      currentInterests.add(interest);
    }
    
    // Save to database immediately
    const interestsArray = Array.from(currentInterests);
    await updateUserField(userId, "interests", interestsArray);
    
    // Get current page from session or default to 0
    const currentPage = session.interestsPage ?? 0;
    
    // Update the keyboard to reflect the new state (stay on same page)
    const interestsKeyboard = buildInterestsKeyboard(currentInterests, currentPage);
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / 20);
    
    try {
      await ctx.editMessageText(
        `🎯 علایق خود را انتخاب کنید (${selectedCount} مورد انتخاب شده)\nصفحه ${currentPage + 1}/${totalPages}\n\nبرای انتخاب/لغو انتخاب هر مورد، روی آن کلیک کنید. تغییرات به صورت خودکار ذخیره می‌شوند.`,
        { reply_markup: interestsKeyboard }
      );
    } catch (err) {
      // If edit fails, send a new message
      await ctx.reply(
        `🎯 علایق خود را انتخاب کنید (${selectedCount} مورد انتخاب شده)\nصفحه ${currentPage + 1}/${totalPages}\n\nبرای انتخاب/لغو انتخاب هر مورد، روی آن کلیک کنید. تغییرات به صورت خودکار ذخیره می‌شوند.`,
        { reply_markup: interestsKeyboard }
      );
    }
  });

  // Handle pagination for interests
  bot.callbackQuery(/profile:interests:page:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Answer callback query immediately to prevent timeout
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries

    const page = parseInt(ctx.match[1]);
    const session = getSession(userId);
    
    // Get current interests from database
    const profile = await getUserProfile(userId);
    const currentInterests = new Set(profile?.interests || []);
    
    session.interestsPage = page;
    
    const interestsKeyboard = buildInterestsKeyboard(currentInterests, page);
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / 20);
    
    try {
      await ctx.editMessageText(
        `🎯 علایق خود را انتخاب کنید (${selectedCount} مورد انتخاب شده)\nصفحه ${page + 1}/${totalPages}\n\nبرای انتخاب/لغو انتخاب هر مورد، روی آن کلیک کنید. تغییرات به صورت خودکار ذخیره می‌شوند.`,
        { reply_markup: interestsKeyboard }
      );
    } catch (err) {
      await ctx.reply(
        `🎯 علایق خود را انتخاب کنید (${selectedCount} مورد انتخاب شده)\nصفحه ${page + 1}/${totalPages}\n\nبرای انتخاب/لغو انتخاب هر مورد، روی آن کلیک کنید. تغییرات به صورت خودکار ذخیره می‌شوند.`,
        { reply_markup: interestsKeyboard }
      );
    }
  });

  // Handle no-op callback (for disabled pagination buttons)
  bot.callbackQuery("profile:interests:noop", async (ctx) => {
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries
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
