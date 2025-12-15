import { Bot, Context, InlineKeyboard } from "grammy";
import { getUserProfile, updateUserField } from "./database";
import { getInterestNames, getProvinceNames } from "./i18n";
import { INTERESTS, IRAN_PROVINCES } from "./constants";
import { MIN_INTERESTS, MAX_INTERESTS, ITEMS_PER_PAGE } from "../matchfound/constants";
import { editPrompts, errors, buttons } from "../matchfound/strings";
import log from "../log";

export interface ProfileCallbacksConfig {
  botName: string;
  getSession: (userId: number) => {
    editingField?: string;
    interestsPage?: number;
    locationPage?: number;
    completingProfile?: boolean;
  };
  onContinueProfileCompletion?: (ctx: Context, bot: Bot, userId: number) => Promise<void>;
}

// Helper function to build interests keyboard with pagination
async function buildInterestsKeyboard(
  userId: number,
  selectedInterests: Set<string>,
  currentPage: number,
  botName: string
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
  botName: string
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
  } = config;

  // Handle profile:edit:interests callback
  bot.callbackQuery("profile:edit:interests", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    session.editingField = "interests";
    
    const profile = await getUserProfile(userId);
    const currentInterests = new Set(profile?.interests || []);
    session.interestsPage = 0; // Start at first page
    
    const interestsKeyboard = await buildInterestsKeyboard(
      userId,
      currentInterests,
      session.interestsPage,
      botName
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

    await ctx.answerCallbackQuery();
    const session = getSession(userId);
    session.editingField = "location";
    
    const profile = await getUserProfile(userId);
    const currentLocation = profile?.location || null;
    session.locationPage = 0; // Start at first page
    
    const locationKeyboard = await buildLocationKeyboard(
      userId,
      currentLocation,
      session.locationPage,
      botName
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
    const interestsKeyboard = await buildInterestsKeyboard(
      userId,
      currentInterests,
      currentPage,
      botName
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
      botName
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
    const locationKeyboard = await buildLocationKeyboard(
      userId,
      location,
      currentPage,
      botName
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
      botName
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
}

