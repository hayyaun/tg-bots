import { configDotenv } from "dotenv";
import { Bot, Context, InlineKeyboard } from "grammy";
import { BotCommand } from "grammy/types";
import log from "../log";
import { query, getClient } from "../db";
import { Deity } from "../inmankist/archetype/types";
import { MBTIType } from "../inmankist/mbti/types";

configDotenv();

const BOT_NAME = "MatchFound";
const ADMIN_USER_ID = process.env.ADMIN_USER_ID
  ? parseInt(process.env.ADMIN_USER_ID)
  : undefined;

// Archetype compatibility matrix (from COMPLEMENTARY_MATRIX.md)
const archetypeCompatibility: Record<string, string[]> = {
  // Goddesses
  hera: ["zeus", "apollo"],
  demeter: ["zeus", "hades"],
  persephone: ["hades", "hermes"],
  artemis: ["ares", "hermes"],
  athena: ["zeus", "hephaestus"],
  aphrodite: ["ares", "hermes"],
  hestia: ["hephaestus", "poseidon"],
  
  // Gods
  zeus: ["hera", "aphrodite"],
  hades: ["persephone", "hestia"],
  apollo: ["athena", "aphrodite"],
  ares: ["aphrodite", "artemis"],
  dionysus: ["persephone", "aphrodite"],
  hermes: ["athena", "aphrodite"],
  hephaestus: ["hestia", "aphrodite"],
  poseidon: ["persephone", "demeter"],
};

// MBTI compatibility matrix (from COMPLEMENTARY_MATRIX.md)
const mbtiCompatibility: Record<string, string[]> = {
  ENFP: ["INTJ", "INFJ", "ISFJ"],
  ENTP: ["INFJ", "INTJ", "ISFJ"],
  ENFJ: ["INFP", "INTP", "ISFP"],
  ENTJ: ["INFP", "ISFP", "INTP"],
  INFP: ["ENTJ", "ENFJ", "ESTJ"],
  INTP: ["ENTJ", "ENFJ", "ESFJ"],
  INFJ: ["ENTP", "ENFP", "ESTP"],
  INTJ: ["ENFP", "ENTP", "ESFP"],
  ISFP: ["ENTJ", "ENFJ", "ESTJ"],
  ISFJ: ["ENFP", "ENTP", "ESFP"],
  ISTP: ["ESFJ", "ESTJ", "ENFJ"],
  ISTJ: ["ESFP", "ESTP", "ENFP"],
  ESFP: ["ISTJ", "ISFJ", "INTJ"],
  ESFJ: ["ISTP", "ISFP", "INTP"],
  ESTP: ["ISFJ", "ISTJ", "INFJ"],
  ESTJ: ["ISFP", "INFP", "ISTP"],
};

interface UserProfile {
  telegram_id: number;
  username: string | null;
  display_name: string | null;
  biography: string | null;
  birth_date: Date | null;
  gender: string | null;
  looking_for_gender: string | null;
  archetype_result: string | null;
  mbti_result: string | null;
  profile_images: string[] | null;
  completion_score: number;
  created_at: Date;
  updated_at: Date;
}

interface MatchUser extends UserProfile {
  age: number | null;
  match_priority: number; // 1 = both match, 2 = archetype only, 3 = MBTI only
}

// Session storage (simple in-memory Map)
interface SessionData {
  matches?: MatchUser[];
  currentMatchIndex?: number;
  likedUsers?: MatchUser[];
  currentLikedIndex?: number;
  reportingUserId?: number;
}

const sessions = new Map<number, SessionData>();

const startBot = async (botKey: string, agent: unknown) => {
  const bot = new Bot(botKey, {
    client: { baseFetchConfig: { agent } },
  });

  // Helper to get session
  function getSession(userId: number): SessionData {
    if (!sessions.has(userId)) {
      sessions.set(userId, {});
    }
    return sessions.get(userId)!;
  }

  // Admin notification helper
  async function notifyAdmin(message: string) {
    if (!ADMIN_USER_ID) return;
    try {
      await bot.api.sendMessage(ADMIN_USER_ID, `🤖 ${BOT_NAME}\n${message}`, {
        parse_mode: "HTML",
      });
    } catch (err) {
      log.error(BOT_NAME + " > Admin notification failed", err);
    }
  }

  // Helper functions
  function getUserName(ctx: Context): string {
    const from = ctx.from;
    if (!from) return "Unknown";
    return from.username
      ? `@${from.username}`
      : `${from.first_name || ""} ${from.last_name || ""}`.trim() || "Unknown";
  }

  function calculateAge(birthDate: Date | null): number | null {
    if (!birthDate) return null;
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  }

  async function getUserProfile(userId: number): Promise<UserProfile | null> {
    const result = await query(
      "SELECT * FROM users WHERE telegram_id = $1",
      [userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as UserProfile;
  }

  async function calculateCompletionScore(userId: number): Promise<number> {
    const profile = await getUserProfile(userId);
    if (!profile) return 0;

    let score = 0;
    if (profile.username) score++;
    if (profile.profile_images && profile.profile_images.length > 0) score++;
    if (profile.display_name) score++;
    if (profile.biography) score++;
    if (profile.birth_date) score++;
    if (profile.gender) score++;
    if (profile.looking_for_gender) score++;
    if (profile.archetype_result) score++;
    if (profile.mbti_result) score++;

    return score;
  }

  async function updateCompletionScore(userId: number): Promise<void> {
    const score = await calculateCompletionScore(userId);
    await query(
      "UPDATE users SET completion_score = $1, updated_at = NOW() WHERE telegram_id = $2",
      [score, userId]
    );
  }

  async function ensureUserExists(userId: number, username?: string): Promise<void> {
    const result = await query(
      "SELECT telegram_id FROM users WHERE telegram_id = $1",
      [userId]
    );
    if (result.rows.length === 0) {
      await query(
        `INSERT INTO users (telegram_id, username, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (telegram_id) DO NOTHING`,
        [userId, username || null]
      );
      await updateCompletionScore(userId);
      
      // Notify admin about new user registration
      notifyAdmin(
        `👤 <b>New User Registration</b>\nUser: ${username ? `@${username}` : `ID: ${userId}`}\nID: <code>${userId}</code>`
      );
    } else if (username) {
      // Update username if provided
      await query(
        "UPDATE users SET username = $1, updated_at = NOW() WHERE telegram_id = $2",
        [username, userId]
      );
      await updateCompletionScore(userId);
    }
  }

  // Commands
  const commands: BotCommand[] = [
    { command: "start", description: "شروع ربات" },
    { command: "find", description: "پیدا کردن افراد" },
    { command: "liked", description: "افرادی که من را لایک کردند" },
    { command: "profile", description: "مشاهده و ویرایش پروفایل" },
    { command: "completion", description: "وضعیت تکمیل پروفایل" },
    { command: "settings", description: "تنظیمات" },
  ];

  await bot.api.setMyCommands(commands);

  // /start command
  bot.command("start", async (ctx) => {
    ctx.react("❤‍🔥").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from?.username;
    await ensureUserExists(userId, username);

    const profile = await getUserProfile(userId);
    const completionScore = profile?.completion_score || 0;

    const welcomeMessage = `به ربات دوستیابی خوش اومدی. چیزی که باید بدونی اینه که این ربات با رباتای دیگه فرق داره
اینجا دیگه خبری از آدمای عجیب غریب با اهداف مختلف نیست، فقط و فقط دوستیابی سالم، دقیقا همونی که تو دنبالشی
اینجا هیچ محدودیتی وجود نداره و میتونی به بهترین افراد مچ بشی
هدف اصلی این ربات پیدا کردن دوست یا پارتنر هست و هرچیزی غیر ازین دو مورد گزارش بشه بررسی میشه
برای اینکه بهترین افراد رو برای دوستی بهت پیشنهاد کنم حتما نیازه چند تا تست رو پاس کنی

📊 وضعیت تکمیل پروفایل: ${completionScore}/9`;

    const keyboard = new InlineKeyboard()
      .text("📝 ویرایش پروفایل", "profile:edit")
      .row()
      .text("📊 وضعیت تکمیل", "completion:check");

    await ctx.reply(welcomeMessage, { reply_markup: keyboard });
  });

  // Rate limiting for /find command (once per hour)
  const findRateLimit = new Map<number, number>();

  // Matching algorithm
  async function findMatches(userId: number): Promise<MatchUser[]> {
    const user = await getUserProfile(userId);
    if (!user || !user.gender || !user.looking_for_gender) return [];

    const userAge = calculateAge(user.birth_date);
    if (!userAge) return [];

    // Get all excluded user IDs
    const excludedIds = [userId];
    
    // Get users already liked
    const likedResult = await query(
      "SELECT liked_user_id FROM likes WHERE user_id = $1",
      [userId]
    );
    likedResult.rows.forEach((row) => excludedIds.push(row.liked_user_id));

    // Get users who ignored this user
    const ignoredResult = await query(
      "SELECT user_id FROM ignored WHERE ignored_user_id = $1",
      [userId]
    );
    ignoredResult.rows.forEach((row) => excludedIds.push(row.user_id));

    // Get users this user has ignored
    const ignoredByUserResult = await query(
      "SELECT ignored_user_id FROM ignored WHERE user_id = $1",
      [userId]
    );
    ignoredByUserResult.rows.forEach((row) => excludedIds.push(row.ignored_user_id));

    // Base query: gender filter + age filter + minimum completion + not excluded
    let baseQuery = `
      SELECT u.*,
             EXTRACT(YEAR FROM AGE(u.birth_date))::INTEGER as age
      FROM users u
      WHERE u.telegram_id != $1
        AND NOT (u.telegram_id = ANY($2::bigint[]))
        AND u.completion_score >= 7
        AND u.username IS NOT NULL
        AND u.gender IS NOT NULL
        AND u.birth_date IS NOT NULL
    `;

    const params: unknown[] = [userId, excludedIds];
    let paramIndex = 3;

    // Gender filter
    if (user.looking_for_gender === "both") {
      baseQuery += ` AND u.gender IN ('male', 'female')`;
    } else {
      baseQuery += ` AND u.gender = $${paramIndex}`;
      params.push(user.looking_for_gender);
      paramIndex++;
    }

    // Age filter (max 8 years difference)
    baseQuery += ` AND ABS(EXTRACT(YEAR FROM AGE(u.birth_date))::INTEGER - $${paramIndex}) <= 8`;
    params.push(userAge);
    paramIndex++;

    const allCandidates = await query(baseQuery, params);
    const matches: MatchUser[] = [];

    for (const candidate of allCandidates.rows) {
      const matchUser = candidate as MatchUser;
      let matchPriority = 999; // Lower is better

      // Check archetype compatibility
      let archetypeMatch = false;
      if (user.archetype_result && matchUser.archetype_result) {
        const userArchetype = user.archetype_result.toLowerCase();
        const targetArchetype = matchUser.archetype_result.toLowerCase();

        if (user.gender === matchUser.gender) {
          // Same-gender matching: same archetype
          archetypeMatch = userArchetype === targetArchetype;
        } else {
          // Opposite-gender matching: use compatibility matrix
          const compatible = archetypeCompatibility[userArchetype] || [];
          archetypeMatch = compatible.includes(targetArchetype);
        }
      }

      // Check MBTI compatibility
      let mbtiMatch = false;
      if (user.mbti_result && matchUser.mbti_result) {
        const userMBTI = user.mbti_result.toUpperCase();
        const targetMBTI = matchUser.mbti_result.toUpperCase();
        const compatible = mbtiCompatibility[userMBTI] || [];
        mbtiMatch = compatible.includes(targetMBTI);
      }

      // Set priority
      if (archetypeMatch && mbtiMatch) {
        matchPriority = 1;
      } else if (archetypeMatch) {
        matchPriority = 2;
      } else if (mbtiMatch) {
        matchPriority = 3;
      } else {
        continue; // Skip if no match
      }

      matchUser.match_priority = matchPriority;
      matchUser.age = matchUser.age || calculateAge(matchUser.birth_date);
      matches.push(matchUser);
    }

    // Sort by priority, then by completion score, then by age difference
    matches.sort((a, b) => {
      if (a.match_priority !== b.match_priority) {
        return a.match_priority - b.match_priority;
      }
      if (a.completion_score !== b.completion_score) {
        return b.completion_score - a.completion_score;
      }
      const ageDiffA = Math.abs((a.age || 0) - userAge);
      const ageDiffB = Math.abs((b.age || 0) - userAge);
      return ageDiffA - ageDiffB;
    });

    return matches;
  }

  // Display match profile
  async function displayMatch(ctx: Context, match: MatchUser, showUsername = false) {
    const ageText = match.age ? `${match.age} سال` : "نامشخص";
    const nameText = match.display_name || "بدون نام";
    const bioText = match.biography || "بیوگرافی ثبت نشده";
    const archetypeText = match.archetype_result
      ? `کهن الگو: ${match.archetype_result}`
      : "کهن الگو: ثبت نشده";
    const mbtiText = match.mbti_result
      ? `MBTI: ${match.mbti_result.toUpperCase()}`
      : "MBTI: ثبت نشده";

    let message = `👤 ${nameText}\n`;
    message += `🎂 ${ageText}\n\n`;
    message += `📝 ${bioText}\n\n`;
    message += `🔮 ${archetypeText}\n`;
    message += `🧠 ${mbtiText}`;

    if (showUsername) {
      message += `\n\n👤 Username: ${match.username ? `@${match.username}` : "نام کاربری ثبت نشده"}`;
    }

    const keyboard = new InlineKeyboard();
    if (!showUsername) {
      keyboard.text("❤️ لایک", `like:${match.telegram_id}`);
      keyboard.text("❌ رد", `dislike:${match.telegram_id}`);
      keyboard.row();
    }
    keyboard.text("🚫 گزارش", `report:${match.telegram_id}`);

    // Send photos if available
    if (match.profile_images && Array.isArray(match.profile_images) && match.profile_images.length > 0) {
      const mediaGroup = match.profile_images.slice(0, 10).map((fileId) => ({
        type: "photo" as const,
        media: fileId,
      }));
      await ctx.replyWithMediaGroup(mediaGroup);
    }

    await ctx.reply(message, { reply_markup: keyboard });
  }

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
        `برای استفاده از این دستور، باید حداقل 7 مورد از 9 مورد پروفایل خود را تکمیل کنید.\nوضعیت فعلی: ${profile.completion_score}/9\nاز دستور /completion برای مشاهده جزئیات استفاده کنید.`
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

  // Display liked user
  async function displayLikedUser(ctx: Context, user: MatchUser, showUsername = false) {
    const ageText = user.age ? `${user.age} سال` : "نامشخص";
    const nameText = user.display_name || "بدون نام";
    const bioText = user.biography || "بیوگرافی ثبت نشده";
    const archetypeText = user.archetype_result
      ? `کهن الگو: ${user.archetype_result}`
      : "کهن الگو: ثبت نشده";
    const mbtiText = user.mbti_result
      ? `MBTI: ${user.mbti_result.toUpperCase()}`
      : "MBTI: ثبت نشده";

    let message = `👤 ${nameText}\n`;
    message += `🎂 ${ageText}\n\n`;
    message += `📝 ${bioText}\n\n`;
    message += `🔮 ${archetypeText}\n`;
    message += `🧠 ${mbtiText}`;

    if (showUsername) {
      message += `\n\n👤 Username: ${user.username ? `@${user.username}` : "نام کاربری ثبت نشده"}`;
    }

    const keyboard = new InlineKeyboard();
    if (!showUsername) {
      keyboard.text("👁️ نمایش", `show_liked:${user.telegram_id}`);
      keyboard.text("🗑️ حذف", `delete_liked:${user.telegram_id}`);
      keyboard.row();
    }
    keyboard.text("🚫 گزارش", `report:${user.telegram_id}`);

    // Send photos if available
    if (user.profile_images && Array.isArray(user.profile_images) && user.profile_images.length > 0) {
      const mediaGroup = user.profile_images.slice(0, 10).map((fileId) => ({
        type: "photo" as const,
        media: fileId,
      }));
      await ctx.replyWithMediaGroup(mediaGroup);
    }

    await ctx.reply(message, { reply_markup: keyboard });
  }

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

  // /profile command
  bot.command("profile", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

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

  // /completion command
  bot.command("completion", async (ctx) => {
    ctx.react("🤔").catch(() => {});
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

  // /settings command
  bot.command("settings", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    await ctx.reply(
      "تنظیمات:\n\n" +
      "/profile - ویرایش پروفایل\n" +
      "/completion - وضعیت تکمیل پروفایل"
    );
  });

  // Profile editing callbacks (simplified - full implementation would require state management)
  bot.callbackQuery(/profile:edit:(.+)/, async (ctx) => {
    const action = ctx.match[1];
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `برای ویرایش ${action}، لطفا از دستور /profile استفاده کنید.\nاین قابلیت در نسخه‌های بعدی اضافه خواهد شد.`
    );
  });

  bot.catch = (err) => {
    log.error(BOT_NAME + " > BOT", err);
    notifyAdmin(`❌ <b>Critical Bot Error</b>\nError: ${err}`);
  };

  bot.start();

  await bot.init();

  notifyAdmin(`🚀 <b>Bot Started</b>\nBot is now online and ready!`);

  return bot;
};

export default { startBot };

