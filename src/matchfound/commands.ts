import { Bot, Context, InlineKeyboard } from "grammy";
import { prisma } from "../db";
import { getUserProfile, ensureUserExists, getUserIdFromTelegramId, updateUserField } from "../shared/database";
import { findMatches } from "./matching";
import { displayUser } from "./display";
import { getSession } from "./session";
import { calculateAge } from "../shared/utils";
import { MatchUser, UserProfile } from "./types";
import log from "../log";
import { getInterestNames } from "../shared/i18n";
import { BOT_NAME, INMANKIST_BOT_USERNAME, MIN_INTERESTS, MIN_COMPLETION_THRESHOLD, MAX_COMPLETION_SCORE, FIND_RATE_LIMIT_MS, ITEMS_PER_PAGE, INTERESTS } from "./constants";
import {
  getWelcomeMessage,
  errors,
  success,
  fields,
  buttons,
  settings,
  profileCompletion,
  editPrompts,
  profileValues,
  deleteData,
} from "./strings";
import { setupProfileCommand } from "../shared/profileCommand";

// Rate limiting for /find command (once per hour)
const findRateLimit = new Map<number, number>();

// Helper function to get missing required fields
interface RequiredField {
  key: keyof UserProfile;
  name: string;
  type: "text" | "select" | "date" | "interests" | "username";
}

const REQUIRED_FIELDS: RequiredField[] = [
  { key: "username", name: fields.username, type: "username" },
  { key: "display_name", name: fields.displayName, type: "text" },
  { key: "gender", name: fields.gender, type: "select" },
  { key: "looking_for_gender", name: fields.lookingForGender, type: "select" },
  { key: "birth_date", name: fields.birthDate, type: "date" },
  { key: "interests", name: fields.interests, type: "interests" },
];

function getMissingRequiredFields(profile: UserProfile | null): RequiredField[] {
  if (!profile) return REQUIRED_FIELDS;
  
  const missing: RequiredField[] = [];
  
  for (const field of REQUIRED_FIELDS) {
    if (field.key === "interests") {
      if (!profile.interests || profile.interests.length < MIN_INTERESTS) {
        missing.push(field);
      }
    } else if (!profile[field.key]) {
      missing.push(field);
    }
  }
  
  return missing;
}

// Helper function to continue profile completion flow (exported for use in callbacks)
export async function continueProfileCompletion(
  ctx: Context,
  bot: Bot,
  userId: number
): Promise<void> {
  const session = getSession(userId);
  if (!session.completingProfile) return;
  
  const profile = await getUserProfile(userId);
  if (!profile) return;
  
  const missingFields = getMissingRequiredFields(profile);
  
  if (missingFields.length === 0) {
    // All required fields completed
    session.completingProfile = false;
    session.profileCompletionFieldIndex = undefined;
    
    const keyboard = new InlineKeyboard()
      .text(buttons.completionStatus, "profile:edit")
      .text(buttons.findPeople, "find:start")
      .row()
      .url(buttons.takeQuizzes, `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);
    
    await ctx.reply(profileCompletion.allRequiredComplete, { reply_markup: keyboard });
    return;
  }
  
  // Find the next missing field by checking REQUIRED_FIELDS in order
  // Start from the current position (or 0) and find the first missing field
  const currentFieldIndex = session.profileCompletionFieldIndex ?? -1;
  
  // Find the first missing field in REQUIRED_FIELDS order, starting after the current field
  for (let i = currentFieldIndex + 1; i < REQUIRED_FIELDS.length; i++) {
    const field = REQUIRED_FIELDS[i];
    const isMissing = field.key === "interests" 
      ? !profile.interests || profile.interests.length < MIN_INTERESTS
      : !profile[field.key];
    
    if (isMissing) {
      // Find this field in the missingFields array
      const missingIndex = missingFields.findIndex(f => f.key === field.key);
      if (missingIndex >= 0) {
        session.profileCompletionFieldIndex = i;
        await promptNextRequiredField(ctx, bot, userId, missingFields, missingIndex);
        return;
      }
    }
  }
  
  // If we get here, all fields after current are complete, but there are still missing fields
  // This shouldn't happen, but if it does, just prompt for the first missing field
  if (missingFields.length > 0) {
    session.profileCompletionFieldIndex = REQUIRED_FIELDS.findIndex(f => f.key === missingFields[0].key);
    await promptNextRequiredField(ctx, bot, userId, missingFields, 0);
  }
}

// Helper function to prompt for next required field
async function promptNextRequiredField(
  ctx: Context,
  bot: Bot,
  userId: number,
  missingFields: RequiredField[],
  fieldIndex: number
): Promise<void> {
  if (fieldIndex >= missingFields.length) {
    // All required fields completed
    const session = getSession(userId);
    session.completingProfile = false;
    session.profileCompletionFieldIndex = undefined;
    
    const keyboard = new InlineKeyboard()
      .text(buttons.completionStatus, "profile:edit")
      .text(buttons.findPeople, "find:start")
      .row()
      .url(buttons.takeQuizzes, `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);
    
    await ctx.reply(profileCompletion.allRequiredComplete, { reply_markup: keyboard });
    return;
  }
  
  const field = missingFields[fieldIndex];
  const session = getSession(userId);
  session.completingProfile = true;
  session.profileCompletionFieldIndex = fieldIndex;
  session.editingField = field.key === "display_name" ? "name" 
    : field.key === "birth_date" ? "birthdate"
    : field.key === "gender" ? "gender"
    : field.key === "looking_for_gender" ? "looking_for"
    : field.key === "interests" ? "interests"
    : field.key === "username" ? "username"
    : undefined;
  
  const remaining = missingFields.length - fieldIndex - 1;
  
  switch (field.type) {
    case "username": {
      const currentUsername = ctx.from?.username;
      if (currentUsername) {
        // Auto-update username and continue
        await updateUserField(userId, "username", currentUsername);
        await ctx.reply(success.usernameUpdated(currentUsername));
        if (remaining > 0 && fieldIndex + 1 < missingFields.length) {
          await ctx.reply(profileCompletion.nextField(missingFields[fieldIndex + 1].name, remaining));
        }
        await promptNextRequiredField(ctx, bot, userId, missingFields, fieldIndex + 1);
      } else {
        const keyboard = new InlineKeyboard()
          .text("✅ نام کاربری را تنظیم کردم", "profile:edit:username");
        await ctx.reply(profileCompletion.fieldPrompt.username, { reply_markup: keyboard });
      }
      break;
    }
    case "text": {
      if (fieldIndex > 0) {
        await ctx.reply(profileCompletion.nextField(field.name, remaining));
      }
      await ctx.reply(profileCompletion.fieldPrompt.displayName);
      break;
    }
    case "select": {
      if (fieldIndex > 0) {
        await ctx.reply(profileCompletion.nextField(field.name, remaining));
      }
      if (field.key === "gender") {
        const genderKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:gender:male")
          .text(profileValues.female, "profile:set:gender:female");
        await ctx.reply(profileCompletion.fieldPrompt.gender, { reply_markup: genderKeyboard });
      } else if (field.key === "looking_for_gender") {
        const lookingForKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:looking_for:male")
          .text(profileValues.female, "profile:set:looking_for:female")
          .row()
          .text(profileValues.both, "profile:set:looking_for:both");
        await ctx.reply(profileCompletion.fieldPrompt.lookingFor, { reply_markup: lookingForKeyboard });
      }
      break;
    }
    case "date": {
      // Check if user already has birthdate (e.g., from Google OAuth)
      const profile = await getUserProfile(userId);
      if (profile?.birth_date) {
        // Birthdate already exists, skip this field
        const age = calculateAge(profile.birth_date);
        await ctx.reply(success.birthdateUpdated(age || 0));
        if (remaining > 0 && fieldIndex + 1 < missingFields.length) {
          await ctx.reply(profileCompletion.nextField(missingFields[fieldIndex + 1].name, remaining));
        }
        await promptNextRequiredField(ctx, bot, userId, missingFields, fieldIndex + 1);
      } else {
        // Telegram doesn't provide birthdate in user profile, so we need manual input
        // Note: If user linked Google account, birthdate would have been imported via OAuth
        if (fieldIndex > 0) {
          await ctx.reply(profileCompletion.nextField(field.name, remaining));
        }
        await ctx.reply(profileCompletion.fieldPrompt.birthDate);
      }
      break;
    }
    case "interests": {
      if (fieldIndex > 0) {
        await ctx.reply(profileCompletion.nextField(field.name, remaining));
      }
      const profile = await getUserProfile(userId);
      const currentInterests = new Set(profile?.interests || []);
      session.interestsPage = 0;
      
      // Build interests keyboard inline
      const interestsKeyboard = new InlineKeyboard();
      const itemsPerPage = ITEMS_PER_PAGE;
      const totalPages = Math.ceil(INTERESTS.length / itemsPerPage);
      const startIndex = 0;
      const endIndex = Math.min(itemsPerPage, INTERESTS.length);
      const pageItems = INTERESTS.slice(startIndex, endIndex);
      
      const interestNamesMap = await getInterestNames(userId, BOT_NAME);
      let rowCount = 0;
      for (const interest of pageItems) {
        const isSelected = currentInterests.has(interest);
        const displayName = interestNamesMap[interest];
        const prefix = isSelected ? "✅ " : "";
        interestsKeyboard.text(`${prefix}${displayName}`, `profile:toggle:interest:${interest}`);
        rowCount++;
        if (rowCount % 2 === 0) {
          interestsKeyboard.row();
        }
      }
      
      if (totalPages > 1) {
        interestsKeyboard.row();
        interestsKeyboard.text(" ", "profile:interests:noop");
        interestsKeyboard.text(`صفحه 1/${totalPages}`, "profile:interests:noop");
        interestsKeyboard.text(buttons.next, `profile:interests:page:1`);
      }
      
      const selectedCount = currentInterests.size;
      await ctx.reply(editPrompts.interests(selectedCount, 1, totalPages), { reply_markup: interestsKeyboard });
      break;
    }
  }
}

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
      await ensureUserExists(userId, username, async (uid, uname) => {
        await notifyAdmin(
          `👤 <b>New User Registration</b>\nUser: ${uname ? `@${uname}` : `ID: ${uid}`}\nID: <code>${uid}</code>`
        );
      }, firstName, lastName);

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
        const keyboard = new InlineKeyboard()
          .text(buttons.completionStatus, "profile:edit")
          .text(buttons.findPeople, "find:start")
          .row()
          .url(buttons.takeQuizzes, `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);

        await ctx.reply("✨ می‌تونی از دکمه‌های زیر استفاده کنی:", { reply_markup: keyboard });
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

      // Rate limiting (once per hour)
      const now = Date.now();
      const lastFind = findRateLimit.get(userId);
      if (lastFind && now - lastFind < FIND_RATE_LIMIT_MS) {
        const remainingMinutes = Math.ceil((FIND_RATE_LIMIT_MS - (now - lastFind)) / 60000);
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

      // Show match count
      await ctx.reply(success.matchesFound(matches.length));

      // Show first match (profile already fetched above for validation)
      await displayUser(ctx, matches[0], "match", false, session, profile.interests || [], profile);
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
      const profile = await getUserProfile(userId);
      await displayUser(ctx, firstUser, "liked", false, undefined, profile?.interests || [], profile || undefined);
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
    
    const keyboard = new InlineKeyboard()
      .text("📋 Reports", "admin:reports")
      .text("👥 All Users", "admin:all_users")
      .row();

    await ctx.reply("🔐 <b>Admin Panel</b>", {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  });
}

