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
import { getInterestNames } from "../shared/i18n";
import {
  INMANKIST_BOT_USERNAME,
  MOODS,
  INTERESTS,
  IRAN_PROVINCES,
  PROVINCE_NAMES,
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

// Helper function to build interests keyboard with pagination
async function buildInterestsKeyboard(
  userId: number,
  selectedInterests: Set<string>,
  currentPage: number,
  itemsPerPage: number = ITEMS_PER_PAGE
): Promise<InlineKeyboard> {
  const keyboard = new InlineKeyboard();
  const totalItems = INTERESTS.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageItems = INTERESTS.slice(startIndex, endIndex);

  // Add interest buttons (2 per row)
  const interestNamesMap = await getInterestNames(userId, BOT_NAME);
  let rowCount = 0;
  for (const interest of pageItems) {
    const isSelected = selectedInterests.has(interest);
    const displayName = interestNamesMap[interest];
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
      keyboard.text(buttons.previous, `profile:interests:page:${currentPage - 1}`);
    } else {
      keyboard.text(" ", "profile:interests:noop"); // Placeholder for spacing
    }
    keyboard.text(`صفحه ${currentPage + 1}/${totalPages}`, "profile:interests:noop");
    if (currentPage < totalPages - 1) {
      keyboard.text(buttons.next, `profile:interests:page:${currentPage + 1}`);
    } else {
      keyboard.text(" ", "profile:interests:noop"); // Placeholder for spacing
    }
  }

  return keyboard;
}

// Helper function to build location keyboard with pagination
function buildLocationKeyboard(
  selectedLocation: string | null,
  currentPage: number,
  itemsPerPage: number = ITEMS_PER_PAGE
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const totalItems = IRAN_PROVINCES.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageItems = IRAN_PROVINCES.slice(startIndex, endIndex);

  // Add province buttons (2 per row)
  let rowCount = 0;
  for (const province of pageItems) {
    const isSelected = selectedLocation === province;
    const displayName = PROVINCE_NAMES[province];
    const prefix = isSelected ? "✅ " : "";
    keyboard.text(`${prefix}${displayName}`, `profile:set:location:${province}`);
    rowCount++;
    if (rowCount % 2 === 0) {
      keyboard.row();
    }
  }

  // Add pagination buttons
  if (totalPages > 1) {
    keyboard.row();
    if (currentPage > 0) {
      keyboard.text(buttons.previous, `profile:location:page:${currentPage - 1}`);
    } else {
      keyboard.text(" ", "profile:location:noop"); // Placeholder for spacing
    }
    keyboard.text(`صفحه ${currentPage + 1}/${totalPages}`, "profile:location:noop");
    if (currentPage < totalPages - 1) {
      keyboard.text(buttons.next, `profile:location:page:${currentPage + 1}`);
    } else {
      keyboard.text(" ", "profile:location:noop"); // Placeholder for spacing
    }
  }

  return keyboard;
}

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

    // Handle profile editing
    if (session.editingField) {
      const text = ctx.message.text;
      
      // Handle cancel
      if (text === "/cancel") {
        delete session.editingField;
        // If in profile completion flow, exit it
        if (session.completingProfile) {
          session.completingProfile = false;
          session.profileCompletionFieldIndex = undefined;
          await ctx.reply(errors.editCancelled + "\n\nبرای تکمیل پروفایل، دوباره از دستور /start استفاده کنید.");
        } else {
          await ctx.reply(errors.editCancelled);
        }
        return;
      }

      try {
        switch (session.editingField) {
          case "name":
            if (text.length > MAX_DISPLAY_NAME_LENGTH) {
              await ctx.reply(errors.nameTooLong);
              return;
            }
            await updateUserField(userId, "display_name", text);
            delete session.editingField;
            await ctx.reply(success.nameUpdated(text));
            // Continue profile completion if in progress
            if (session.completingProfile) {
              await continueProfileCompletion(ctx, bot, userId);
            }
            break;

          case "bio":
            if (text.length > 500) {
              await ctx.reply(errors.bioTooLong + `\n\n📝 تعداد کاراکتر فعلی: ${text.length}/500`);
              return;
            }
            await updateUserField(userId, "biography", text);
            delete session.editingField;
            await ctx.reply(success.bioUpdated + `\n\n📝 تعداد کاراکتر: ${text.length}/500`);
            break;

          case "birthdate":
            // Validate date format YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(text)) {
              await ctx.reply(errors.invalidDate);
              return;
            }
            // Parse date string to Date object
            // Note: Date constructor with YYYY-MM-DD string interprets it as UTC midnight
            // We need to create a proper Date object for the local timezone
            const [year, month, day] = text.split("-").map(Number);
            const birthDate = new Date(year, month - 1, day); // month is 0-indexed
            if (isNaN(birthDate.getTime())) {
              await ctx.reply(errors.invalidDateValue);
              return;
            }
            // Check if date is not in the future
            if (birthDate > new Date()) {
              await ctx.reply(errors.futureDate);
              return;
            }
            // Check if age is reasonable
            const age = calculateAge(birthDate);
            if (!age || age < MIN_AGE || age > MAX_AGE) {
              await ctx.reply(errors.invalidAge);
              return;
            }
            // Pass Date object to Prisma, not the string
            await updateUserField(userId, "birth_date", birthDate);
            delete session.editingField;
            await ctx.reply(success.birthdateUpdated(age));
            // Continue profile completion if in progress
            if (session.completingProfile) {
              await continueProfileCompletion(ctx, bot, userId);
            }
            break;

          default:
            await next();
            return;
        }
      } catch (err) {
        log.error(BOT_NAME + " > Profile edit failed", err);
        const editingField = session.editingField || "unknown";
        await ctx.reply(errors.updateFailed);
        delete session.editingField;
        notifyAdmin(
          `❌ <b>Profile Edit Failed</b>\nUser: <code>${userId}</code>\nField: ${editingField}\nError: ${err}`
        );
      }
      return;
    }

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
        await ctx.reply(editPrompts.name);
        break;

      case "bio":
        session.editingField = "bio";
        await ctx.reply(editPrompts.bio);
        break;

      case "birthdate":
        session.editingField = "birthdate";
        await ctx.reply(editPrompts.birthdate);
        break;

      case "gender":
        session.editingField = "gender";
        const genderKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:gender:male")
          .text(profileValues.female, "profile:set:gender:female");
        await ctx.reply(editPrompts.gender, { reply_markup: genderKeyboard });
        break;

      case "looking_for":
        session.editingField = "looking_for";
        const lookingForKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:looking_for:male")
          .text(profileValues.female, "profile:set:looking_for:female")
          .row()
          .text(profileValues.both, "profile:set:looking_for:both");
        await ctx.reply(editPrompts.lookingFor, { reply_markup: lookingForKeyboard });
        break;

      case "images":
        session.editingField = "images";
        const profile = await getUserProfile(userId);
        if (profile?.profile_image) {
          const imagesKeyboard = new InlineKeyboard()
            .text(buttons.addImage, "profile:images:add")
            .row()
            .text(buttons.clearImages, "profile:images:clear");
          await ctx.reply(
            editPrompts.images.hasImages(),
            { reply_markup: imagesKeyboard }
          );
        } else {
          const imagesKeyboard = new InlineKeyboard().text(buttons.addImage, "profile:images:add");
          await ctx.reply(editPrompts.images.noImages, { reply_markup: imagesKeyboard });
        }
        break;

      case "username":
        session.editingField = "username";
        // Update username from current Telegram profile
        const currentUsername = ctx.from?.username;
        if (currentUsername) {
          await updateUserField(userId, "username", currentUsername);
          await ctx.reply(success.usernameUpdated(currentUsername));
          delete session.editingField;
          // Continue profile completion if in progress
          if (session.completingProfile) {
            await continueProfileCompletion(ctx, bot, userId);
          }
        } else {
          await ctx.reply(errors.noUsername);
          // Don't delete editingField or continue if username is missing
        }
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
        await ctx.reply(editPrompts.mood, { reply_markup: moodKeyboard });
        break;

      case "interests":
        session.editingField = "interests";
        const profileForInterests = await getUserProfile(userId);
        const currentInterests = new Set(profileForInterests?.interests || []);
        session.interestsPage = 0; // Start at first page
        
        const interestsKeyboard = await buildInterestsKeyboard(userId, currentInterests, session.interestsPage);
        const selectedCount = currentInterests.size;
        const totalPages = Math.ceil(INTERESTS.length / ITEMS_PER_PAGE);
        await ctx.reply(
          editPrompts.interests(selectedCount, 1, totalPages),
          { reply_markup: interestsKeyboard }
        );
        break;

      case "location":
        session.editingField = "location";
        const profileForLocation = await getUserProfile(userId);
        const currentLocation = profileForLocation?.location || null;
        session.locationPage = 0; // Start at first page
        
        const locationKeyboard = buildLocationKeyboard(currentLocation, session.locationPage);
        const totalLocationPages = Math.ceil(IRAN_PROVINCES.length / 20);
        await ctx.reply(
          editPrompts.location(1, totalLocationPages),
          { reply_markup: locationKeyboard }
        );
        break;

      default:
        await ctx.reply(errors.invalidOperation);
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
      await ctx.reply(errors.invalidMood);
      delete session.editingField;
      return;
    }

    await updateUserField(userId, "mood", mood);
    delete session.editingField;
    await ctx.reply(success.moodUpdated(MOODS[mood]));
  });

  // Handle setting gender
  bot.callbackQuery(/profile:set:gender:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const gender = ctx.match[1];
    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    await updateUserField(userId, "gender", gender);
    delete session.editingField;
    await ctx.reply(success.genderUpdated(gender === "male" ? profileValues.male : profileValues.female));
    // Continue profile completion if in progress
    if (session.completingProfile) {
      await continueProfileCompletion(ctx, bot, userId);
    }
  });

  // Handle setting looking_for
  bot.callbackQuery(/profile:set:looking_for:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const lookingFor = ctx.match[1];
    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    const text =
      lookingFor === "male" ? profileValues.male : lookingFor === "female" ? profileValues.female : profileValues.both;
    await updateUserField(userId, "looking_for_gender", lookingFor);
    delete session.editingField;
    await ctx.reply(success.lookingForUpdated(text));
    // Continue profile completion if in progress
    if (session.completingProfile) {
      await continueProfileCompletion(ctx, bot, userId);
    }
  });

  // Handle image management
  bot.callbackQuery("profile:images:add", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(editPrompts.photo);
  });

  bot.callbackQuery("profile:images:clear", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();
    await updateUserField(userId, "profile_image", null);
    delete getSession(userId).editingField;
    await ctx.reply(success.imagesCleared);
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
      // Check if removing would go below minimum
      if (currentInterests.size <= MIN_INTERESTS) {
        await ctx.answerCallbackQuery(errors.minInterestsRequired);
        return;
      }
      currentInterests.delete(interest);
    } else {
      // Check if user already has maximum interests
      if (currentInterests.size >= MAX_INTERESTS) {
        await ctx.answerCallbackQuery(errors.maxInterestsReached);
        return;
      }
      currentInterests.add(interest);
    }
    
    // Save to database immediately
    const interestsArray = Array.from(currentInterests);
    await updateUserField(userId, "interests", interestsArray);
    
    // Get current page from session or default to 0
    const currentPage = session.interestsPage ?? 0;
    
    // Update the keyboard to reflect the new state (stay on same page)
    const interestsKeyboard = await buildInterestsKeyboard(userId, currentInterests, currentPage);
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / 20);
    
    // If in profile completion mode and minimum interests met, add continue button
    if (session.completingProfile && selectedCount >= MIN_INTERESTS) {
      interestsKeyboard.row();
      interestsKeyboard.text(`✅ ادامه (${selectedCount} علاقه انتخاب شده)`, "profile:completion:continue");
    }
    
    try {
      await ctx.editMessageText(
        editPrompts.interests(selectedCount, currentPage + 1, totalPages),
        { reply_markup: interestsKeyboard }
      );
    } catch (err) {
      // If edit fails, send a new message
      await ctx.reply(
        editPrompts.interests(selectedCount, currentPage + 1, totalPages),
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
    
    const interestsKeyboard = await buildInterestsKeyboard(userId, currentInterests, page);
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / 20);
    
    try {
      await ctx.editMessageText(
        editPrompts.interests(selectedCount, page + 1, totalPages),
        { reply_markup: interestsKeyboard }
      );
    } catch (err) {
      await ctx.reply(
        editPrompts.interests(selectedCount, page + 1, totalPages),
        { reply_markup: interestsKeyboard }
      );
    }
  });

  // Handle no-op callback (for disabled pagination buttons)
  bot.callbackQuery("profile:interests:noop", async (ctx) => {
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries
  });

  // Handle setting location
  bot.callbackQuery(/profile:set:location:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const location = ctx.match[1];
    // Answer callback query immediately to prevent timeout
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries
    const session = getSession(userId);

    if (!IRAN_PROVINCES.includes(location as any)) {
      await ctx.reply(errors.invalidProvince);
      delete session.editingField;
      return;
    }

    await updateUserField(userId, "location", location);
    
    // Get current page from session or default to 0
    const currentPage = session.locationPage ?? 0;
    
    // Update the keyboard to reflect the new selection (stay on same page)
    const locationKeyboard = buildLocationKeyboard(location, currentPage);
    const totalPages = Math.ceil(IRAN_PROVINCES.length / ITEMS_PER_PAGE);
    const provinceName = PROVINCE_NAMES[location as keyof typeof PROVINCE_NAMES] || location;
    
    try {
      await ctx.editMessageText(
        editPrompts.locationSelected(provinceName, currentPage + 1, totalPages),
        { reply_markup: locationKeyboard }
      );
    } catch (err) {
      // If edit fails, send a new message
      await ctx.reply(
        `✅ استان به "${provinceName}" تغییر یافت.`, // TODO: Add to strings
        { reply_markup: locationKeyboard }
      );
    }
  });

  // Handle pagination for location
  bot.callbackQuery(/profile:location:page:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Answer callback query immediately to prevent timeout
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries

    const page = parseInt(ctx.match[1]);
    const session = getSession(userId);
    
    // Get current location from database
    const profile = await getUserProfile(userId);
    const currentLocation = profile?.location || null;
    
    session.locationPage = page;
    
    const locationKeyboard = buildLocationKeyboard(currentLocation, page);
    const totalPages = Math.ceil(IRAN_PROVINCES.length / ITEMS_PER_PAGE);
    
    try {
      await ctx.editMessageText(
        editPrompts.location(page + 1, totalPages),
        { reply_markup: locationKeyboard }
      );
    } catch (err) {
      await ctx.reply(
        editPrompts.location(page + 1, totalPages),
        { reply_markup: locationKeyboard }
      );
    }
  });

  // Handle no-op callback for location (for disabled pagination buttons)
  bot.callbackQuery("profile:location:noop", async (ctx) => {
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries
  });

  // Handle profile completion continue button (for interests)
  bot.callbackQuery("profile:completion:continue", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    
    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    
    // Verify minimum interests are met
    const profile = await getUserProfile(userId);
    if (!profile || !profile.interests || profile.interests.length < MIN_INTERESTS) {
      await ctx.reply(errors.minInterestsNotMet(profile?.interests?.length || 0));
      return;
    }
    
    // Continue profile completion flow
    delete session.editingField;
    await continueProfileCompletion(ctx, bot, userId);
  });

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
          await ctx.reply(success.imageAdded());
        } catch (err) {
          log.error(BOT_NAME + " > Add image failed", err);
          await ctx.reply(errors.addImageFailed);
          notifyAdmin(
            `❌ <b>Add Profile Image Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
          );
        }
      }
    } else {
      await next();
    }
  });

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
}
