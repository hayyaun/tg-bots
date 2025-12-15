import { Bot, Context, InlineKeyboard } from "grammy";
import { FIELD_KEY, type ProfileFieldKey, INMANKIST_BOT_USERNAME, INTERESTS } from "../shared/constants";
import {
  getUserProfile,
  updateUserField,
} from "../shared/database";
import { getInterestNames } from "../shared/i18n";
import { UserProfile } from "../shared/types";
import { calculateAge } from "../shared/utils";
import {
  BOT_NAME,
  FIND_RATE_LIMIT_MS,
  ITEMS_PER_PAGE,
  MIN_COMPLETION_THRESHOLD,
  MIN_INTERESTS,
} from "./constants";
import { displayUser } from "./display";
import { findMatches } from "./matching";
import { getSession } from "./session";
import {
  buttons,
  editPrompts,
  errors,
  fields,
  profileCompletion,
  profileValues,
  success,
} from "./strings";

// Rate limiting for /find command (once per hour)
const findRateLimit = new Map<number, number>();

// Validate profile for find command (shared between /find and find:start callback)
export async function validateProfileForFind(
  profile: UserProfile | null,
  ctx: Context
): Promise<boolean> {
  if (!profile) {
    await ctx.reply(errors.startFirst);
    return false;
  }

  // Check required fields first (these are mandatory for matching to work)
  const missingRequiredFields: string[] = [];
  if (!profile.username) missingRequiredFields.push(fields.username);
  if (!profile.display_name) missingRequiredFields.push(fields.displayName);
  if (!profile.gender) missingRequiredFields.push(fields.gender);
  if (!profile.looking_for_gender)
    missingRequiredFields.push(fields.lookingForGender);
  if (!profile.birth_date) missingRequiredFields.push(fields.birthDate);

  // Check interests separately to show specific count
  if (!profile.interests || profile.interests.length < MIN_INTERESTS) {
    await ctx.reply(
      errors.minInterestsNotMet(profile.interests?.length || 0)
    );
    return false;
  }

  if (missingRequiredFields.length > 0) {
    await ctx.reply(errors.missingRequiredFields(missingRequiredFields));
    return false;
  }

  // Check minimum completion for other optional fields
  if (profile.completion_score < MIN_COMPLETION_THRESHOLD) {
    await ctx.reply(errors.incompleteProfile(profile.completion_score));
    return false;
  }

  return true;
}

// Execute find matches and display first result (shared logic)
export async function executeFindAndDisplay(
  ctx: Context,
  userId: number,
  profile: UserProfile,
  checkRateLimit: boolean = true
): Promise<void> {
  // Rate limiting (once per hour) - only for /find command, not button clicks
  if (checkRateLimit) {
    const now = Date.now();
    const lastFind = findRateLimit.get(userId);
    if (lastFind && now - lastFind < FIND_RATE_LIMIT_MS) {
      const remainingMinutes = Math.ceil(
        (FIND_RATE_LIMIT_MS - (now - lastFind)) / 60000
      );
      await ctx.reply(errors.rateLimit(remainingMinutes));
      return;
    }
    findRateLimit.set(userId, now);
  }

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
  await displayUser(
    ctx,
    matches[0],
    "match",
    false,
    session,
    profile.interests || [],
    profile
  );
}

// Profile completion helpers
interface RequiredField {
  key: keyof UserProfile;
  name: string;
  type: "text" | "select" | "date" | "interests" | "username";
}

// Field type constants
const FIELD_TYPE = {
  USERNAME: "username",
  TEXT: "text",
  SELECT: "select",
  DATE: "date",
  INTERESTS: "interests",
} as const;


const REQUIRED_FIELDS: RequiredField[] = [
  { key: FIELD_KEY.USERNAME, name: fields.username, type: FIELD_TYPE.USERNAME },
  { key: FIELD_KEY.DISPLAY_NAME, name: fields.displayName, type: FIELD_TYPE.TEXT },
  { key: FIELD_KEY.GENDER, name: fields.gender, type: FIELD_TYPE.SELECT },
  { key: FIELD_KEY.LOOKING_FOR_GENDER, name: fields.lookingForGender, type: FIELD_TYPE.SELECT },
  { key: FIELD_KEY.BIRTH_DATE, name: fields.birthDate, type: FIELD_TYPE.DATE },
  { key: FIELD_KEY.INTERESTS, name: fields.interests, type: FIELD_TYPE.INTERESTS },
];

// Reusable keyboard for main actions
export function createMainActionsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text(buttons.completionStatus, "profile:edit")
    .row()
    .text(buttons.findPeople, "find:start")
    .row()
    .url(
      buttons.takeQuizzes,
      `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`
    );
}

export function getMissingRequiredFields(
  profile: UserProfile | null
): RequiredField[] {
  if (!profile) return REQUIRED_FIELDS;

  const missing: RequiredField[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (field.key === FIELD_KEY.INTERESTS) {
      if (!profile.interests || profile.interests.length < MIN_INTERESTS) {
        missing.push(field);
      }
    } else if (!profile[field.key]) {
      missing.push(field);
    }
  }

  return missing;
}

// Helper function to prompt for next required field
export async function promptNextRequiredField(
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

    await ctx.reply(profileCompletion.allRequiredComplete, {
      reply_markup: createMainActionsKeyboard(),
    });
    return;
  }

  const field = missingFields[fieldIndex];
  const session = getSession(userId);
  session.completingProfile = true;
  session.profileCompletionFieldIndex = fieldIndex;
  // Use field key directly as editingField
  session.editingField = field.key as ProfileFieldKey;

  const remaining = missingFields.length - fieldIndex - 1;

  switch (field.type) {
    case FIELD_TYPE.USERNAME: {
      const currentUsername = ctx.from?.username;
      if (currentUsername) {
        // Auto-update username and continue
        await updateUserField(userId, FIELD_KEY.USERNAME, currentUsername);
        await ctx.reply(success.usernameUpdated(currentUsername));
        if (remaining > 0 && fieldIndex + 1 < missingFields.length) {
          await ctx.reply(
            profileCompletion.nextField(
              missingFields[fieldIndex + 1].name,
              remaining
            )
          );
        }
        await promptNextRequiredField(
          ctx,
          bot,
          userId,
          missingFields,
          fieldIndex + 1
        );
      } else {
        const keyboard = new InlineKeyboard().text(
          "✅ نام کاربری را تنظیم کردم",
          "profile:edit:username"
        );
        await ctx.reply(profileCompletion.fieldPrompt.username, {
          reply_markup: keyboard,
        });
      }
      break;
    }
    case FIELD_TYPE.TEXT: {
      if (fieldIndex > 0) {
        await ctx.reply(profileCompletion.nextField(field.name, remaining));
      }
      await ctx.reply(profileCompletion.fieldPrompt.displayName);
      break;
    }
    case FIELD_TYPE.SELECT: {
      if (fieldIndex > 0) {
        await ctx.reply(profileCompletion.nextField(field.name, remaining));
      }
      if (field.key === FIELD_KEY.GENDER) {
        const genderKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:gender:male")
          .text(profileValues.female, "profile:set:gender:female");
        await ctx.reply(profileCompletion.fieldPrompt.gender, {
          reply_markup: genderKeyboard,
        });
      } else if (field.key === FIELD_KEY.LOOKING_FOR_GENDER) {
        const lookingForKeyboard = new InlineKeyboard()
          .text(profileValues.male, "profile:set:looking_for:male")
          .text(profileValues.female, "profile:set:looking_for:female")
          .row()
          .text(profileValues.both, "profile:set:looking_for:both");
        await ctx.reply(profileCompletion.fieldPrompt.lookingFor, {
          reply_markup: lookingForKeyboard,
        });
      }
      break;
    }
    case FIELD_TYPE.DATE: {
      // Check if user already has birthdate (e.g., from Google OAuth)
      const profile = await getUserProfile(userId);
      if (profile?.birth_date) {
        // Birthdate already exists, skip this field
        const age = calculateAge(profile.birth_date);
        await ctx.reply(success.birthdateUpdated(age || 0));
        if (remaining > 0 && fieldIndex + 1 < missingFields.length) {
          await ctx.reply(
            profileCompletion.nextField(
              missingFields[fieldIndex + 1].name,
              remaining
            )
          );
        }
        await promptNextRequiredField(
          ctx,
          bot,
          userId,
          missingFields,
          fieldIndex + 1
        );
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
    case FIELD_TYPE.INTERESTS: {
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
        interestsKeyboard.text(
          `${prefix}${displayName}`,
          `profile:toggle:interest:${interest}`
        );
        rowCount++;
        if (rowCount % 2 === 0) {
          interestsKeyboard.row();
        }
      }

      if (totalPages > 1) {
        interestsKeyboard.row();
        interestsKeyboard.text(" ", "profile:interests:noop");
        interestsKeyboard.text(
          `صفحه 1/${totalPages}`,
          "profile:interests:noop"
        );
        interestsKeyboard.text(buttons.next, `profile:interests:page:1`);
      }

      const selectedCount = currentInterests.size;
      await ctx.reply(editPrompts.interests(selectedCount, 1, totalPages), {
        reply_markup: interestsKeyboard,
      });
      break;
    }
  }
}

// Helper function to continue profile completion flow
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

    await ctx.reply(profileCompletion.allRequiredComplete, {
      reply_markup: createMainActionsKeyboard(),
    });
    return;
  }

  // Find the next missing field by checking REQUIRED_FIELDS in order
  // Start from the current position (or 0) and find the first missing field
  const currentFieldIndex = session.profileCompletionFieldIndex ?? -1;

  // Find the first missing field in REQUIRED_FIELDS order, starting after the current field
  for (let i = currentFieldIndex + 1; i < REQUIRED_FIELDS.length; i++) {
    const field = REQUIRED_FIELDS[i];
    const isMissing =
      field.key === FIELD_KEY.INTERESTS
        ? !profile.interests || profile.interests.length < MIN_INTERESTS
        : !profile[field.key];

    if (isMissing) {
      // Find this field in the missingFields array
      const missingIndex = missingFields.findIndex((f) => f.key === field.key);
      if (missingIndex >= 0) {
        session.profileCompletionFieldIndex = i;
        await promptNextRequiredField(
          ctx,
          bot,
          userId,
          missingFields,
          missingIndex
        );
        return;
      }
    }
  }

  // If we get here, all fields after current are complete, but there are still missing fields
  // This shouldn't happen, but if it does, just prompt for the first missing field
  if (missingFields.length > 0) {
    session.profileCompletionFieldIndex = REQUIRED_FIELDS.findIndex(
      (f) => f.key === missingFields[0].key
    );
    await promptNextRequiredField(ctx, bot, userId, missingFields, 0);
  }
}

// Export helper functions used by commands.ts

