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
import { BOT_NAME, INMANKIST_BOT_USERNAME, MOODS, INTERESTS, INTEREST_NAMES, IRAN_PROVINCES, PROVINCE_NAMES } from "./constants";
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
} from "./strings";

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
  itemsPerPage: number = 20
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
  notifyAdmin: (message: string) => Promise<void>
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
        await ctx.answerCallbackQuery(callbacks.mutualLike);
        await ctx.reply(success.mutualLike);
      } else {
        await ctx.answerCallbackQuery(callbacks.likeRegistered);
      }

      // Show next match
      const session = getSession(userId);
      if (session.matches && session.currentMatchIndex !== undefined) {
        session.currentMatchIndex++;
        if (session.currentMatchIndex < session.matches.length) {
          const profile = await getUserProfile(userId);
          await displayMatch(ctx, session.matches[session.currentMatchIndex], false, session, profile?.interests || []);
        } else {
          await ctx.reply(errors.noMatches);
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
        await displayMatch(ctx, session.matches[session.currentMatchIndex], false, session, profile?.interests || []);
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
        await displayMatch(ctx, session.matches[session.currentMatchIndex], false, session, profile?.interests || []);
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

      await ctx.answerCallbackQuery(callbacks.deleted);

      // Show next liked user
      const session = getSession(userId);
      if (session.likedUsers && session.currentLikedIndex !== undefined) {
        session.currentLikedIndex++;
        if (session.currentLikedIndex < session.likedUsers.length) {
          await displayLikedUser(ctx, session.likedUsers[session.currentLikedIndex]);
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
        await ctx.reply(errors.editCancelled);
        return;
      }

      try {
        switch (session.editingField) {
          case "name":
            if (text.length > 100) {
              await ctx.reply(errors.nameTooLong);
              return;
            }
            await updateUserField(userId, "display_name", text);
            delete session.editingField;
            await ctx.reply(success.nameUpdated(text));
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
            // Check if age is reasonable (between 18 and 120)
            const age = calculateAge(birthDate);
            if (!age || age < 18 || age > 120) {
              await ctx.reply(errors.invalidAge);
              return;
            }
            // Pass Date object to Prisma, not the string
            await updateUserField(userId, "birth_date", birthDate);
            delete session.editingField;
            await ctx.reply(success.birthdateUpdated(age));
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

  // Callback: profile:edit (from /start command)
  bot.callbackQuery("profile:edit", async (ctx) => {
    await ctx.answerCallbackQuery();
    const userId = ctx.from?.id;
    if (!userId) return;

    // Trigger /profile command handler
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
        if (profile?.profile_images && profile.profile_images.length > 0) {
          const imagesKeyboard = new InlineKeyboard().text(buttons.addImage, "profile:images:add");
          if (profile.profile_images.length > 0) {
            imagesKeyboard.row().text(buttons.clearImages, "profile:images:clear");
          }
          await ctx.reply(
            editPrompts.images.hasImages(profile.profile_images.length),
            { reply_markup: imagesKeyboard }
          );
        } else {
          await ctx.reply(editPrompts.images.noImages);
        }
        break;

      case "username":
        session.editingField = "username";
        // Update username from current Telegram profile
        const currentUsername = ctx.from?.username;
        if (currentUsername) {
          await updateUserField(userId, "username", currentUsername);
          await ctx.reply(success.usernameUpdated(currentUsername));
        } else {
          await ctx.reply(errors.noUsername);
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
        await ctx.reply(editPrompts.mood, { reply_markup: moodKeyboard });
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
    await updateUserField(userId, "gender", gender);
    delete getSession(userId).editingField;
    await ctx.reply(success.genderUpdated(gender === "male" ? profileValues.male : profileValues.female));
  });

  // Handle setting looking_for
  bot.callbackQuery(/profile:set:looking_for:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const lookingFor = ctx.match[1];
    await ctx.answerCallbackQuery();
    const text =
      lookingFor === "male" ? profileValues.male : lookingFor === "female" ? profileValues.female : profileValues.both;
    await updateUserField(userId, "looking_for_gender", lookingFor);
    delete getSession(userId).editingField;
    await ctx.reply(success.lookingForUpdated(text));
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
    await updateUserField(userId, "profile_images", []);
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
      // Check if removing would go below minimum of 3
      if (currentInterests.size <= 3) {
        await ctx.answerCallbackQuery(errors.minInterestsRequired);
        return;
      }
      currentInterests.delete(interest);
    } else {
      // Check if user already has 7 interests (maximum allowed)
      if (currentInterests.size >= 7) {
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
    const interestsKeyboard = buildInterestsKeyboard(currentInterests, currentPage);
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / 20);
    
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
    
    const interestsKeyboard = buildInterestsKeyboard(currentInterests, page);
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
    const totalPages = Math.ceil(IRAN_PROVINCES.length / 20);
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
    const totalPages = Math.ceil(IRAN_PROVINCES.length / 20);
    
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
          await ctx.reply(success.imageAdded(imageCount));
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
}
