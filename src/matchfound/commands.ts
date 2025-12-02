import { Bot, Context, InlineKeyboard } from "grammy";
import { query } from "../db";
import { getUserProfile, ensureUserExists, updateCompletionScore } from "./database";
import { findMatches } from "./matching";
import { displayMatch, displayLikedUser } from "./display";
import { getSession } from "./session";
import { calculateAge } from "./utils";
import { MatchUser } from "./types";
import log from "../log";
import { BOT_NAME, INMANKIST_BOT_USERNAME } from "./constants";

// Rate limiting for /find command (once per hour)
const findRateLimit = new Map<number, number>();

export function setupCommands(
  bot: Bot,
  notifyAdmin: (message: string) => Promise<void>
) {
  // /start command
  bot.command("start", async (ctx) => {
    ctx.react("❤‍🔥").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from?.username;
    await ensureUserExists(userId, username, async (uid, uname) => {
      await notifyAdmin(
        `👤 <b>New User Registration</b>\nUser: ${uname ? `@${uname}` : `ID: ${uid}`}\nID: <code>${uid}</code>`
      );
    });

    const profile = await getUserProfile(userId);
    const completionScore = profile?.completion_score || 0;

    const welcomeMessage = `به ربات دوستیابی خوش اومدی. چیزی که باید بدونی اینه که این ربات با رباتای دیگه فرق داره
اینجا دیگه خبری از آدمای عجیب غریب با اهداف مختلف نیست، فقط و فقط دوستیابی سالم، دقیقا همونی که تو دنبالشی
اینجا هیچ محدودیتی وجود نداره و میتونی به بهترین افراد مچ بشی
هدف اصلی این ربات پیدا کردن دوست یا پارتنر هست و هرچیزی غیر ازین دو مورد گزارش بشه بررسی میشه

برای اینکه بهترین افراد رو برای دوستی بهت پیشنهاد کنم، باید تست‌های شخصیت‌شناسی رو در ربات @${INMANKIST_BOT_USERNAME} پاس کنی:
• تست کهن الگو (Archetype)
• تست MBTI

📊 وضعیت تکمیل پروفایل: ${completionScore}/9`;

    const keyboard = new InlineKeyboard()
      .text("📝 ویرایش پروفایل", "profile:edit")
      .row()
      .text("📊 وضعیت تکمیل", "completion:check")
      .row()
      .url("🧪 انجام تست‌ها", `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);

    await ctx.reply(welcomeMessage, { reply_markup: keyboard });
  });

  // /find command
  bot.command("find", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    const profile = await getUserProfile(userId);
    if (!profile) {
      await ctx.reply("لطفا ابتدا با دستور /start شروع کنید.");
      return;
    }

    // Check minimum completion (7/9) and username requirement
    if (profile.completion_score < 7) {
      await ctx.reply(
        `برای استفاده از این دستور، باید حداقل 7 مورد از 9 مورد پروفایل خود را تکمیل کنید.\nوضعیت فعلی: ${profile.completion_score}/9\nاز دستور /profile برای مشاهده و تکمیل پروفایل استفاده کنید.`
      );
      return;
    }

    if (!profile.username) {
      await ctx.reply(
        "برای استفاده از این دستور، باید نام کاربری تلگرام خود را تنظیم کنید.\nاز دستور /profile برای ویرایش پروفایل استفاده کنید."
      );
      return;
    }

    // Rate limiting (once per hour)
    const now = Date.now();
    const lastFind = findRateLimit.get(userId);
    if (lastFind && now - lastFind < 3600000) {
      const remainingMinutes = Math.ceil((3600000 - (now - lastFind)) / 60000);
      await ctx.reply(
        `⏰ شما می‌توانید هر ساعت یک بار از این دستور استفاده کنید.\nزمان باقی‌مانده: ${remainingMinutes} دقیقه`
      );
      return;
    }

    findRateLimit.set(userId, now);

    const matches = await findMatches(userId);
    if (matches.length === 0) {
      await ctx.reply(
        "شما تمام افراد موجود را دیده‌اید. لطفا بعدا دوباره تلاش کنید!"
      );
      return;
    }

    // Store matches in session for pagination
    const session = getSession(userId);
    session.matches = matches;
    session.currentMatchIndex = 0;

    // Show first match
    await displayMatch(ctx, matches[0]);
  });

  // /liked command
  bot.command("liked", async (ctx) => {
    ctx.react("❤").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    // Get users who liked this user (and not ignored)
    const result = await query(
      `SELECT u.*, EXTRACT(YEAR FROM AGE(u.birth_date))::INTEGER as age
       FROM users u
       INNER JOIN likes l ON u.telegram_id = l.user_id
       LEFT JOIN ignored i ON i.user_id = $1 AND i.ignored_user_id = u.telegram_id
       WHERE l.liked_user_id = $1
         AND i.id IS NULL
       ORDER BY l.created_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      await ctx.reply("هنوز کسی شما را لایک نکرده است.");
      return;
    }

    // Store in session for pagination
    const session = getSession(userId);
    session.likedUsers = result.rows as MatchUser[];
    session.currentLikedIndex = 0;

    // Show first person
    const firstUser = result.rows[0] as MatchUser;
    firstUser.age = firstUser.age || calculateAge(firstUser.birth_date);
    await displayLikedUser(ctx, firstUser);
  });

  // /profile command
  bot.command("profile", async (ctx) => {
    ctx.react("🤔").catch(() => {});
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

    await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
  });


  // /settings command
  bot.command("settings", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    await ctx.reply(
      "تنظیمات:\n\n" +
      "/profile - مشاهده و ویرایش پروفایل\n" +
      "/find - پیدا کردن افراد\n" +
      "/liked - افرادی که من را لایک کردند"
    );
  });
}

