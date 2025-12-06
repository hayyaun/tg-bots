import { Bot, Context, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { getUserProfile, ensureUserExists, updateCompletionScore } from "./database";
import { findMatches } from "./matching";
import { displayMatch, displayLikedUser } from "./display";
import { getSession } from "./session";
import { calculateAge } from "./utils";
import { MatchUser } from "./types";
import log from "../log";
import { BOT_NAME, INMANKIST_BOT_USERNAME, MOODS, INTEREST_NAMES, PROVINCE_NAMES } from "./constants";
import {
  getWelcomeMessage,
  errors,
  success,
  fields,
  profileValues,
  buttons,
  settings,
} from "./strings";

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

    try {
      const username = ctx.from?.username;
      const firstName = ctx.from?.first_name;
      const lastName = ctx.from?.last_name;
      await ensureUserExists(userId, username, async (uid, uname) => {
        await notifyAdmin(
          `👤 <b>New User Registration</b>\nUser: ${uname ? `@${uname}` : `ID: ${uid}`}\nID: <code>${uid}</code>`
        );
      }, firstName, lastName);

      const profile = await getUserProfile(userId);
      const completionScore = profile?.completion_score || 0;

      const welcomeMessage = getWelcomeMessage(completionScore);

      const keyboard = new InlineKeyboard()
        .text(buttons.editProfile, "profile:edit")
        .row()
        .text(buttons.completionStatus, "completion:check")
        .row()
        .url(buttons.takeQuizzes, `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);

      await ctx.reply(welcomeMessage, { reply_markup: keyboard });
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
      if (!profile.interests || profile.interests.length < 3) {
        await ctx.reply(errors.minInterestsNotMet(profile.interests?.length || 0));
        return;
      }

      if (missingRequiredFields.length > 0) {
        await ctx.reply(errors.missingRequiredFields(missingRequiredFields));
        return;
      }

      // Check minimum completion (7/12) for other optional fields
      if (profile.completion_score < 7) {
        await ctx.reply(errors.incompleteProfile(profile.completion_score));
        return;
      }

      // Rate limiting (once per hour)
      const now = Date.now();
      const lastFind = findRateLimit.get(userId);
      if (lastFind && now - lastFind < 3600000) {
        const remainingMinutes = Math.ceil((3600000 - (now - lastFind)) / 60000);
        await ctx.reply(errors.rateLimit(remainingMinutes));
        return;
      }

      findRateLimit.set(userId, now);

      const matches = await findMatches(userId);
      if (matches.length === 0) {
        await ctx.reply(errors.noMatches);
        return;
      }

      // Store matches in session for pagination
      const session = getSession(userId);
      session.matches = matches;
      session.currentMatchIndex = 0;

      // Show first match
      await displayMatch(ctx, matches[0]);
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
      // Get users who liked this user (and not ignored)
      // Get users who liked this user, excluding ignored ones
      const likes = await prisma.like.findMany({
        where: {
          liked_user_id: BigInt(userId),
          user: {
            ignoredReceived: {
              none: {
                user_id: BigInt(userId),
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
        where: { user_id: BigInt(userId) },
        select: { ignored_user_id: true },
      });
      const ignoredIds = new Set(ignoredByUser.map((i: { ignored_user_id: bigint }) => i.ignored_user_id));
      const filteredLikes = likes.filter((like: typeof likes[0]) => !ignoredIds.has(like.user_id));

      if (filteredLikes.length === 0) {
        await ctx.reply(errors.noLikes);
        return;
      }

      // Store in session for pagination
      const session = getSession(userId);
      session.likedUsers = filteredLikes.map((like: typeof filteredLikes[0]) => {
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
      });
      session.currentLikedIndex = 0;

      // Show first person
      const firstUser = session.likedUsers![0];
      firstUser.age = firstUser.age || calculateAge(firstUser.birth_date);
      await displayLikedUser(ctx, firstUser);
    } catch (err) {
      log.error(BOT_NAME + " > Liked command failed", err);
      await ctx.reply("❌ خطا در دریافت لیست لایک‌ها. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Liked Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });

  // /profile command
  bot.command("profile", async (ctx) => {
    ctx.react("🤔").catch(() => {});
    const userId = ctx.from?.id;
    if (!userId) return;

    try {
      // Recalculate completion score to ensure it's up to date
      await updateCompletionScore(userId);
      const profile = await getUserProfile(userId);
      if (!profile) {
        await ctx.reply(errors.startFirst);
        return;
      }

    const ageText = profile.birth_date
      ? `${calculateAge(profile.birth_date)} ${profileValues.year}`
      : fields.notSet;
    const genderText = profile.gender === "male" ? profileValues.male : profile.gender === "female" ? profileValues.female : fields.notSet;
    const lookingForText =
      profile.looking_for_gender === "male"
        ? profileValues.male
        : profile.looking_for_gender === "female"
        ? profileValues.female
        : profile.looking_for_gender === "both"
        ? profileValues.both
        : fields.notSet;

    let message = `${fields.profileTitle}\n\n`;
    message += `${fields.name}: ${profile.display_name || fields.notSet}\n`;
    message += `${fields.age}: ${ageText}\n`;
    message += `${fields.genderLabel}: ${genderText}\n`;
    message += `${fields.lookingFor}: ${lookingForText}\n`;
    message += `${fields.biography}: ${profile.biography || fields.notSet}\n`;
    
    // Show quiz results with instructions if missing
    if (profile.archetype_result) {
      message += `${fields.archetype}: ${profile.archetype_result}\n`;
    } else {
      message += `${fields.archetype}: ${profileValues.archetypeNotSet(INMANKIST_BOT_USERNAME)}\n`;
    }
    
    if (profile.mbti_result) {
      message += `${fields.mbti}: ${profile.mbti_result.toUpperCase()}\n`;
    } else {
      message += `${fields.mbti}: ${profileValues.mbtiNotSet(INMANKIST_BOT_USERNAME)}\n`;
    }
    
    if (profile.mood) {
      message += `${fields.mood}: ${MOODS[profile.mood] || profile.mood}\n`;
    } else {
      message += `${fields.mood}: ${fields.notSet}\n`;
    }
    
    if (profile.interests && profile.interests.length > 0) {
      const interestNames = profile.interests
        .map((interest) => INTEREST_NAMES[interest as keyof typeof INTEREST_NAMES] || interest)
        .join(", ");
      message += `${fields.interests}: ${interestNames}\n`;
    } else {
      message += `${fields.interests}: ${fields.notSet}\n`;
    }
    
    if (profile.location) {
      message += `${fields.location}: ${PROVINCE_NAMES[profile.location as keyof typeof PROVINCE_NAMES] || profile.location}\n`;
    } else {
      message += `${fields.location}: ${fields.notSet}\n`;
    }
    
    message += `${fields.completion}: ${profile.completion_score}/12`;

    const keyboard = new InlineKeyboard()
      .text(buttons.editName, "profile:edit:name")
      .text(buttons.editBio, "profile:edit:bio")
      .row()
      .text(buttons.editBirthdate, "profile:edit:birthdate")
      .text(buttons.editGender, "profile:edit:gender")
      .row()
      .text(buttons.editLookingFor, "profile:edit:looking_for")
      .text(buttons.editImages, "profile:edit:images")
      .row()
      .text(buttons.editUsername, "profile:edit:username")
      .text(buttons.editMood, "profile:edit:mood")
      .row()
      .text(buttons.editInterests, "profile:edit:interests")
      .text(buttons.editLocation, "profile:edit:location");
    
    // Add quiz button if quizzes are missing
    if (!profile.archetype_result || !profile.mbti_result) {
      keyboard.row().url(buttons.takeQuizzes, `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);
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
    } catch (err) {
      log.error(BOT_NAME + " > Profile command failed", err);
      await ctx.reply("❌ خطا در نمایش پروفایل. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Profile Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
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
        settings.liked
      );
    } catch (err) {
      log.error(BOT_NAME + " > Settings command failed", err);
      await ctx.reply("❌ خطا در نمایش تنظیمات. لطفا دوباره تلاش کنید.");
      notifyAdmin(
        `❌ <b>Settings Command Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
      );
    }
  });
}

