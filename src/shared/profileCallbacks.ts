import { Bot, Context, InlineKeyboard } from "grammy";
import { FIELD_KEY } from "./constants";
import { getUserProfile, updateUserField, addProfileImage } from "./database";
import { getInterestNames, getProvinceNames } from "./i18n";
import { INTERESTS, IRAN_PROVINCES, MOODS, MIN_INTERESTS, MAX_INTERESTS, ITEMS_PER_PAGE, MIN_AGE, MAX_AGE, MAX_DISPLAY_NAME_LENGTH } from "./constants";
import { getProfileStrings } from "./i18n/profileStrings";
import { calculateAge } from "./utils";
import { BaseSessionData } from "./session";
import log from "../log";

export interface ProfileCallbacksConfig {
  botName: string;
  getSession: (userId: number) => BaseSessionData;
  onContinueProfileCompletion?: (ctx: Context, bot: Bot, userId: number) => Promise<void>;
  notifyAdmin?: (message: string) => Promise<void>;
}

// Helper function to build interests keyboard with pagination
async function buildInterestsKeyboard(
  userId: number,
  selectedInterests: Set<string>,
  currentPage: number,
  botName: string,
  buttons: { previous: string; next: string }
): Promise<InlineKeyboard> {
  const keyboard = new InlineKeyboard();
  const totalItems = INTERESTS.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const pageItems = INTERESTS.slice(startIndex, endIndex);

  // Add interest buttons (2 per row)
  const interestNamesMap = await getInterestNames(userId, botName);
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
async function buildLocationKeyboard(
  userId: number,
  selectedLocation: string | null,
  currentPage: number,
  botName: string,
  buttons: { previous: string; next: string }
): Promise<InlineKeyboard> {
  const keyboard = new InlineKeyboard();
  const totalItems = IRAN_PROVINCES.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const pageItems = IRAN_PROVINCES.slice(startIndex, endIndex);

  // Add province buttons (2 per row)
  const provinceNamesMap = await getProvinceNames(userId, botName);
  let rowCount = 0;
  for (const province of pageItems) {
    const isSelected = selectedLocation === province;
    const displayName = provinceNamesMap[province];
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

/**
 * Sets up profile-related callbacks for interests and location editing
 * This can be used by both matchfound and inmankist bots
 */
export function setupProfileCallbacks(
  bot: Bot,
  config: ProfileCallbacksConfig
): void {
  const {
    botName,
    getSession,
    onContinueProfileCompletion,
    notifyAdmin,
  } = config;
  const loadProfileStrings = (userId: number | undefined) =>
    getProfileStrings(userId, botName);

  // Handle profile:edit:interests callback
  bot.callbackQuery("profile:edit:interests", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { editPrompts, buttons } = await loadProfileStrings(userId);

    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    session.editingField = FIELD_KEY.INTERESTS;
    
    const profile = await getUserProfile(userId);
    const currentInterests = new Set(profile?.interests || []);
    session.interestsPage = 0; // Start at first page
    
    const interestsKeyboard = await buildInterestsKeyboard(
      userId,
      currentInterests,
      session.interestsPage,
      botName,
      buttons
    );
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / ITEMS_PER_PAGE);
    
    await ctx.reply(
      editPrompts.interests(selectedCount, 1, totalPages),
      { reply_markup: interestsKeyboard }
    );
  });

  // Handle profile:edit:location callback
  bot.callbackQuery("profile:edit:location", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { editPrompts, buttons } = await loadProfileStrings(userId);

    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    session.editingField = FIELD_KEY.LOCATION;
    
    const profile = await getUserProfile(userId);
    const currentLocation = profile?.location || null;
    session.locationPage = 0; // Start at first page
    
    const locationKeyboard = await buildLocationKeyboard(
      userId,
      currentLocation,
      session.locationPage,
      botName,
      buttons
    );
    const totalLocationPages = Math.ceil(IRAN_PROVINCES.length / ITEMS_PER_PAGE);
    
    await ctx.reply(
      editPrompts.location(1, totalLocationPages),
      { reply_markup: locationKeyboard }
    );
  });

  // Handle toggling interests (saves immediately to database)
  bot.callbackQuery(/profile:toggle:interest:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { errors, buttons, editPrompts } = await loadProfileStrings(userId);

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
    await updateUserField(userId, FIELD_KEY.INTERESTS, interestsArray);
    
    // Get current page from session or default to 0
    const currentPage = session.interestsPage ?? 0;
    
    // Update the keyboard to reflect the new state (stay on same page)
    const interestsKeyboard = await buildInterestsKeyboard(
      userId,
      currentInterests,
      currentPage,
      botName,
      buttons
    );
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / ITEMS_PER_PAGE);
    
    // If in profile completion mode and minimum interests met, add continue button
    if (session.completingProfile && selectedCount >= MIN_INTERESTS && onContinueProfileCompletion) {
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

    const { editPrompts, buttons } = await loadProfileStrings(userId);

    // Answer callback query immediately to prevent timeout
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries

    const page = parseInt(ctx.match[1]);
    const session = getSession(userId);
    
    // Get current interests from database
    const profile = await getUserProfile(userId);
    const currentInterests = new Set(profile?.interests || []);
    
    session.interestsPage = page;
    
    const interestsKeyboard = await buildInterestsKeyboard(
      userId,
      currentInterests,
      page,
      botName,
      buttons
    );
    const selectedCount = currentInterests.size;
    const totalPages = Math.ceil(INTERESTS.length / ITEMS_PER_PAGE);
    
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

    const { errors, editPrompts, buttons } = await loadProfileStrings(userId);

    const location = ctx.match[1];
    // Answer callback query immediately to prevent timeout
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries
    const session = getSession(userId);

    if (!IRAN_PROVINCES.includes(location as any)) {
      await ctx.reply(errors.invalidProvince);
      delete session.editingField;
      return;
    }

    await updateUserField(userId, FIELD_KEY.LOCATION, location);
    
    // Get current page from session or default to 0
    const currentPage = session.locationPage ?? 0;
    
    // Update the keyboard to reflect the new selection (stay on same page)
    const locationKeyboard = await buildLocationKeyboard(
      userId,
      location,
      currentPage,
      botName,
      buttons
    );
    const totalPages = Math.ceil(IRAN_PROVINCES.length / ITEMS_PER_PAGE);
    const provinceNamesMap = await getProvinceNames(userId, botName);
    const provinceName = provinceNamesMap[location as keyof typeof provinceNamesMap] || location;
    
    try {
      await ctx.editMessageText(
        editPrompts.locationSelected(provinceName, currentPage + 1, totalPages),
        { reply_markup: locationKeyboard }
      );
    } catch (err) {
      // If edit fails, send a new message
      await ctx.reply(
        editPrompts.locationSelected(provinceName, currentPage + 1, totalPages),
        { reply_markup: locationKeyboard }
      );
    }
  });

  // Handle pagination for location
  bot.callbackQuery(/profile:location:page:(\d+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { editPrompts, buttons } = await loadProfileStrings(userId);

    // Answer callback query immediately to prevent timeout
    ctx.answerCallbackQuery().catch(() => {}); // Ignore errors for expired queries

    const page = parseInt(ctx.match[1]);
    const session = getSession(userId);
    
    // Get current location from database
    const profile = await getUserProfile(userId);
    const currentLocation = profile?.location || null;
    
    session.locationPage = page;
    
    const locationKeyboard = await buildLocationKeyboard(
      userId,
      currentLocation,
      page,
      botName,
      buttons
    );
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

  // Handle profile completion continue button (for interests) - only if callback provided
  if (onContinueProfileCompletion) {
    bot.callbackQuery("profile:completion:continue", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      const { errors } = await loadProfileStrings(userId);
      
      await ctx.answerCallbackQuery();
      const session = getSession(userId);
      
      // Verify minimum interests are met
      const profile = await getUserProfile(userId);
      if (!profile || !profile.interests || profile.interests.length < MIN_INTERESTS) {
        await ctx.reply(errors.minInterestsRequired);
        return;
      }
      
      // Continue profile completion flow
      delete session.editingField;
      await onContinueProfileCompletion(ctx, bot, userId);
    });
  }

  // Handle profile:edit:(.+) - handles all profile edit actions
  bot.callbackQuery(/profile:edit:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const {
      editPrompts,
      errors,
      buttons,
      success,
      profileValues,
      moodOptions,
    } =
      await loadProfileStrings(userId);

    const action = ctx.match[1];
    const session = getSession(userId);
    await ctx.answerCallbackQuery();

    switch (action) {
      case "name":
        session.editingField = FIELD_KEY.DISPLAY_NAME;
        await ctx.reply(editPrompts.name);
        break;

      case "bio":
        session.editingField = FIELD_KEY.BIOGRAPHY;
        await ctx.reply(editPrompts.bio);
        break;

      case "birthdate":
        session.editingField = FIELD_KEY.BIRTH_DATE;
        await ctx.reply(editPrompts.birthdate);
        break;

      case "gender":
        session.editingField = FIELD_KEY.GENDER;
        const genderKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:gender:male")
          .text(profileValues.female, "profile:set:gender:female");
        await ctx.reply(editPrompts.gender, { reply_markup: genderKeyboard });
        break;

      case "looking_for":
        session.editingField = FIELD_KEY.LOOKING_FOR_GENDER;
        const lookingForKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:looking_for:male")
          .text(profileValues.female, "profile:set:looking_for:female")
          .row()
          .text(profileValues.both, "profile:set:looking_for:both");
        await ctx.reply(editPrompts.lookingFor, { reply_markup: lookingForKeyboard });
        break;

      case "image":
        session.editingField = FIELD_KEY.PROFILE_IMAGE;
        const profile = await getUserProfile(userId);
        if (profile?.profile_image) {
          const imageKeyboard = new InlineKeyboard()
            .text(buttons.addImage, "profile:image:add")
            .row()
            .text(buttons.clearImage, "profile:image:clear");
          await ctx.reply(
            editPrompts.image.hasImage(),
            { reply_markup: imageKeyboard }
          );
        } else {
          const imageKeyboard = new InlineKeyboard().text(buttons.addImage, "profile:image:add");
          await ctx.reply(editPrompts.image.noImage, { reply_markup: imageKeyboard });
        }
        break;

      case "username":
        session.editingField = FIELD_KEY.USERNAME;
        // Update username from current Telegram profile
        const currentUsername = ctx.from?.username;
        if (currentUsername) {
          await updateUserField(userId, FIELD_KEY.USERNAME, currentUsername);
          await ctx.reply(success.usernameUpdated(currentUsername));
          delete session.editingField;
          // Continue profile completion if in progress
          if (session.completingProfile && onContinueProfileCompletion) {
            await onContinueProfileCompletion(ctx, bot, userId);
          }
        } else {
          await ctx.reply(errors.noUsername);
          // Don't delete editingField or continue if username is missing
        }
        break;

      case "mood":
        session.editingField = FIELD_KEY.MOOD;
        const moodKeyboard = new InlineKeyboard()
          .text(`${MOODS.happy} ${moodOptions.happy}`, "profile:set:mood:happy")
          .text(`${MOODS.sad} ${moodOptions.sad}`, "profile:set:mood:sad")
          .row()
          .text(`${MOODS.tired} ${moodOptions.tired}`, "profile:set:mood:tired")
          .text(`${MOODS.cool} ${moodOptions.cool}`, "profile:set:mood:cool")
          .row()
          .text(
            `${MOODS.thinking} ${moodOptions.thinking}`,
            "profile:set:mood:thinking"
          )
          .text(
            `${MOODS.excited} ${moodOptions.excited}`,
            "profile:set:mood:excited"
          )
          .row()
          .text(`${MOODS.calm} ${moodOptions.calm}`, "profile:set:mood:calm")
          .text(`${MOODS.angry} ${moodOptions.angry}`, "profile:set:mood:angry")
          .row()
          .text(
            `${MOODS.neutral} ${moodOptions.neutral}`,
            "profile:set:mood:neutral"
          )
          .text(
            `${MOODS.playful} ${moodOptions.playful}`,
            "profile:set:mood:playful"
          );
        await ctx.reply(editPrompts.mood, { reply_markup: moodKeyboard });
        break;

      case "interests":
        session.editingField = FIELD_KEY.INTERESTS;
        // Handled by separate handler above
        break;
      case "location":
        session.editingField = FIELD_KEY.LOCATION;
        // Handled by separate handler above
        break;

      default:
        await ctx.reply(errors.invalidOperation);
    }
  });

  // Handle setting mood
  bot.callbackQuery(/profile:set:mood:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { errors, success } = await loadProfileStrings(userId);

    const mood = ctx.match[1];
    await ctx.answerCallbackQuery();
    const session = getSession(userId);

    if (!Object.keys(MOODS).includes(mood)) {
      await ctx.reply(errors.invalidMood);
      delete session.editingField;
      return;
    }

    await updateUserField(userId, FIELD_KEY.MOOD, mood);
    delete session.editingField;
    await ctx.reply(success.moodUpdated(MOODS[mood]));
  });

  // Handle setting gender
  bot.callbackQuery(/profile:set:gender:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { success, profileValues } = await loadProfileStrings(userId);

    const gender = ctx.match[1];
    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    await updateUserField(userId, FIELD_KEY.GENDER, gender);
    delete session.editingField;
    await ctx.reply(success.genderUpdated(gender === "male" ? profileValues.male : profileValues.female));
    // Continue profile completion if in progress
    if (session.completingProfile && onContinueProfileCompletion) {
      await onContinueProfileCompletion(ctx, bot, userId);
    }
  });

  // Handle setting looking_for
  bot.callbackQuery(/profile:set:looking_for:(.+)/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { success, profileValues } = await loadProfileStrings(userId);

    const lookingFor = ctx.match[1];
    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    const text =
      lookingFor === "male" ? profileValues.male : lookingFor === "female" ? profileValues.female : profileValues.both;
    await updateUserField(userId, FIELD_KEY.LOOKING_FOR_GENDER, lookingFor);
    delete session.editingField;
    await ctx.reply(success.lookingForUpdated(text));
    // Continue profile completion if in progress
    if (session.completingProfile && onContinueProfileCompletion) {
      await onContinueProfileCompletion(ctx, bot, userId);
    }
  });

  // Handle image management
  bot.callbackQuery("profile:image:add", async (ctx) => {
    await ctx.answerCallbackQuery();
    const { editPrompts } = await loadProfileStrings(ctx.from?.id);
    await ctx.reply(editPrompts.photo);
  });

  bot.callbackQuery("profile:image:clear", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { success } = await loadProfileStrings(userId);

    await ctx.answerCallbackQuery();
    await updateUserField(userId, FIELD_KEY.PROFILE_IMAGE, null);
    delete getSession(userId).editingField;
    await ctx.reply(success.imageCleared);
  });

  // Handle text messages for profile editing (name, bio, birthdate)
  bot.on("message:text", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const session = getSession(userId);
    const { errors, success, profileValues } = await loadProfileStrings(userId);
    if (session.editingField) {
      const text = ctx.message.text;
      
      // Handle cancel
      if (text === "/cancel") {
        delete session.editingField;
        // If in profile completion flow, exit it
        if (session.completingProfile) {
          session.completingProfile = false;
          await ctx.reply(errors.editCancelled + "\n\nبرای تکمیل پروفایل، دوباره از دستور /start استفاده کنید.");
        } else {
          await ctx.reply(errors.editCancelled);
        }
        return;
      }

      try {
        switch (session.editingField) {
          case FIELD_KEY.DISPLAY_NAME:
            if (text.length > MAX_DISPLAY_NAME_LENGTH) {
              await ctx.reply(errors.nameTooLong);
              return;
            }
            await updateUserField(userId, FIELD_KEY.DISPLAY_NAME, text);
            delete session.editingField;
            await ctx.reply(success.nameUpdated(text));
            // Continue profile completion if in progress
            if (session.completingProfile && onContinueProfileCompletion) {
              await onContinueProfileCompletion(ctx, bot, userId);
            }
            break;

          case FIELD_KEY.BIOGRAPHY:
            if (text.length > 500) {
              await ctx.reply(errors.bioTooLong + `\n\n📝 تعداد کاراکتر فعلی: ${text.length}/500`);
              return;
            }
            await updateUserField(userId, FIELD_KEY.BIOGRAPHY, text);
            delete session.editingField;
            await ctx.reply(success.bioUpdated + `\n\n📝 تعداد کاراکتر: ${text.length}/500`);
            break;

          case FIELD_KEY.BIRTH_DATE:
            // Validate date format YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(text)) {
              await ctx.reply(errors.invalidDate);
              return;
            }
            // Parse date string to Date object
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
            await updateUserField(userId, FIELD_KEY.BIRTH_DATE, birthDate);
            delete session.editingField;
            await ctx.reply(success.birthdateUpdated(age));
            // Continue profile completion if in progress
            if (session.completingProfile && onContinueProfileCompletion) {
              await onContinueProfileCompletion(ctx, bot, userId);
            }
            break;

          default:
            await next();
            return;
        }
      } catch (err) {
        log.error(botName + " > Profile edit failed", err);
        const editingField = session.editingField || "unknown";
        await ctx.reply(errors.updateFailed);
        delete session.editingField;
        if (notifyAdmin) {
          await notifyAdmin(
            `❌ <b>Profile Edit Failed</b>\nUser: <code>${userId}</code>\nField: ${editingField}\nError: ${err}`
          );
        }
      }
      return;
    }

    await next();
  });

  // Handle photo uploads for profile image
  bot.on("message:photo", async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const { success, errors } = await loadProfileStrings(userId);

    const session = getSession(userId);
    if (session.editingField === FIELD_KEY.PROFILE_IMAGE) {
      const photo = ctx.message.photo;
      if (photo && photo.length > 0) {
        // Get the largest photo
        const largestPhoto = photo[photo.length - 1];
        const fileId = largestPhoto.file_id;

        try {
          await addProfileImage(userId, fileId);
          await ctx.reply(success.imageAdded());
        } catch (err) {
          log.error(botName + " > Add image failed", err);
          await ctx.reply(errors.addImageFailed);
          if (notifyAdmin) {
            await notifyAdmin(
              `❌ <b>Add Profile Image Failed</b>\nUser: <code>${userId}</code>\nError: ${err}`
            );
          }
        }
      }
    } else {
      await next();
    }
  });
}

