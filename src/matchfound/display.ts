import { Context, InlineKeyboard } from "grammy";
import log from "../log";
import {
  MOODS,
  MAX_COMPLETION_SCORE,
  MAX_INTERESTS,
  ARCHETYPE_MATCH_SCORE,
  MBTI_MATCH_SCORE,
  MAX_INTERESTS_SCORE,
  MAX_AGE_BONUS,
  MAX_COMPLETION_BONUS,
  MAX_COMPATIBILITY_SCORE,
  MAX_AGE_DIFFERENCE,
  ADMIN_USER_ID,
} from "../shared/constants";
import {
  BOT_NAME,
  archetypeCompatibility,
  mbtiCompatibility,
} from "./constants";
import { buttons, display, profileValues } from "./strings";
import { callbacks as callbackQueries } from "./callbackQueries";
import { UserProfile } from "../shared/types";
import { MatchUser, SessionData } from "./types";
import { calculateAge } from "../shared/utils";
import { getInterestNames } from "../shared/i18n";
import { buildQuizResultsSection } from "../shared/display";
import { isUserBanned } from "../shared/database";

type DisplayMode = "match" | "liked";

// Helper function to format last_online date in Persian
function formatLastOnline(lastOnline: Date | null): string {
  if (!lastOnline) return display.lastOnlineNever;
  
  const now = new Date();
  const diffMs = now.getTime() - lastOnline.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) {
    return display.lastOnlineJustNow;
  } else if (diffMinutes < 60) {
    return display.lastOnlineMinutesAgo(diffMinutes);
  } else if (diffHours < 24) {
    return display.lastOnlineHoursAgo(diffHours);
  } else if (diffDays < 7) {
    return display.lastOnlineDaysAgo(diffDays);
  } else {
    // Format as date for older entries
    const date = new Date(lastOnline);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }
}

// Helper function to calculate compatibility score between two users
function calculateCompatibilityScore(
  currentUser: UserProfile,
  otherUser: MatchUser
): number {
  let compatibilityScore = 0;
  const currentUserAge = calculateAge(currentUser.birth_date);
  const otherUserAge = otherUser.age || calculateAge(otherUser.birth_date);

  // Check archetype compatibility
  let archetypeMatch = false;
  if (currentUser.archetype_result && otherUser.archetype_result) {
    const userArchetype = currentUser.archetype_result.toLowerCase();
    const targetArchetype = otherUser.archetype_result.toLowerCase();

    if (currentUser.gender === otherUser.gender) {
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
  if (currentUser.mbti_result && otherUser.mbti_result) {
    const userMBTI = currentUser.mbti_result.toUpperCase();
    const targetMBTI = otherUser.mbti_result.toUpperCase();
    const compatible = mbtiCompatibility[userMBTI] || [];
    mbtiMatch = compatible.includes(targetMBTI);
  }

  // Calculate mutual interests
  let mutualInterestsCount = 0;
  if (
    currentUser.interests &&
    otherUser.interests &&
    currentUser.interests.length > 0 &&
    otherUser.interests.length > 0
  ) {
    const userInterestsSet = new Set(currentUser.interests);
    const otherInterestsSet = new Set(otherUser.interests);
    mutualInterestsCount = Array.from(userInterestsSet).filter((interest) =>
      otherInterestsSet.has(interest)
    ).length;
  }

  // Archetype match
  if (archetypeMatch) {
    compatibilityScore += ARCHETYPE_MATCH_SCORE;
  }

  // MBTI match
  if (mbtiMatch) {
    compatibilityScore += MBTI_MATCH_SCORE;
  }

  // Mutual interests: up to MAX_INTERESTS_SCORE (scaled by number of mutual interests, max MAX_INTERESTS)
  if (mutualInterestsCount > 0) {
    const interestsScore = Math.min((mutualInterestsCount / MAX_INTERESTS) * MAX_INTERESTS_SCORE, MAX_INTERESTS_SCORE);
    compatibilityScore += interestsScore;
  }

  // Age difference bonus: up to MAX_AGE_BONUS (smaller difference = higher bonus)
  if (currentUserAge && otherUserAge) {
    const ageDiff = Math.abs(otherUserAge - currentUserAge);
    const ageBonus = Math.max(0, MAX_AGE_BONUS - (ageDiff / MAX_AGE_DIFFERENCE) * MAX_AGE_BONUS);
    compatibilityScore += ageBonus;
  }

  // Completion score bonus: up to MAX_COMPLETION_BONUS (higher score = higher bonus)
  const completionBonus = Math.min((otherUser.completion_score / MAX_COMPLETION_SCORE) * MAX_COMPLETION_BONUS, MAX_COMPLETION_BONUS);
  compatibilityScore += completionBonus;

  // Cap at MAX_COMPATIBILITY_SCORE
  return Math.min(Math.round(compatibilityScore), MAX_COMPATIBILITY_SCORE);
}

// Helper to build ban status text
async function buildBanStatusText(userTelegramId: number | null): Promise<string> {
  if (!userTelegramId) return "";
  
  const banStatus = await isUserBanned(userTelegramId);
  if (!banStatus.banned) {
    return `\n${display.banStatusActive}`;
  }
  
  if (banStatus.bannedUntil === null) {
    return `\n${display.banStatusPermanent}`;
  }
  
  const now = new Date();
  const diffMs = banStatus.bannedUntil.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `\n${display.banStatusTemporary(diffDays)}`;
}

// Helper to calculate mutual interests count
function calculateMutualInterestsCount(
  userInterests: string[] | null | undefined,
  matchInterests: string[] | null | undefined
): number {
  if (!userInterests?.length || !matchInterests?.length) return 0;
  
  const userInterestsSet = new Set(userInterests);
  const matchInterestsSet = new Set(matchInterests);
  return Array.from(userInterestsSet).filter((interest) =>
    matchInterestsSet.has(interest)
  ).length;
}

// Helper to build interests section
async function buildInterestsSection(
  user: MatchUser,
  userInterests: string[] | undefined,
  viewerId: number | undefined
): Promise<string> {
  if (!user.interests?.length) return "";
  
  const [interestNamesMap] = await Promise.all([
    getInterestNames(viewerId, BOT_NAME),
  ]);
  
  const interestNames = user.interests
    .map(
      (interest) =>
        interestNamesMap[interest as keyof typeof interestNamesMap] || interest
    )
    .join(", ");

  const mutualCount = calculateMutualInterestsCount(userInterests, user.interests);
  const mutualInterestsText = mutualCount > 0 ? display.mutualInterests(mutualCount) : "";

  return `\n${display.interestsLabel} ${interestNames}${mutualInterestsText}`;
}

// Helper to build admin info section
async function buildAdminInfoSection(
  user: MatchUser,
  isAdmin: boolean
): Promise<string> {
  if (!isAdmin) return "";
  
  let section = `\n\n${display.adminUsername} ${user.username ? `@${user.username}` : display.usernameNotSet}`;
  const lastOnlineText = formatLastOnline(user.last_online);
  section += `\n${display.adminLastActivity} ${lastOnlineText}`;
  
  if (user.telegram_id) {
    const banStatusText = await buildBanStatusText(user.telegram_id);
    section += banStatusText;
  }
  
  return section;
}

export async function displayUser(
  ctx: Context,
  user: MatchUser,
  mode: DisplayMode = "match",
  showUsername = false,
  session?: SessionData,
  userInterests?: string[],
  currentUserProfile?: UserProfile
) {
  // Check if viewing user is admin
  const isAdmin = ADMIN_USER_ID !== undefined && ctx.from?.id === ADMIN_USER_ID;
  
  // Calculate compatibility score
  const compatibilityScore = user.compatibility_score ?? 
    (currentUserProfile ? calculateCompatibilityScore(currentUserProfile, user) : undefined);
  
  // Build message sections in parallel where possible
  const [quizResultsSection, interestsSection, adminInfoSection] = await Promise.all([
    buildQuizResultsSection(user, BOT_NAME, ctx.from?.id, false),
    buildInterestsSection(user, userInterests, ctx.from?.id),
    showUsername ? buildAdminInfoSection(user, isAdmin) : Promise.resolve(""),
  ]);
  
  // Build main message
  const ageText = user.age ? `${user.age} ${profileValues.year}` : display.unknownAge;
  const nameText = user.display_name || display.noName;
  const bioText = user.biography || display.noBio;
  const compatibilityText = compatibilityScore !== undefined
    ? display.compatibility(compatibilityScore)
    : "";
  
  let message = `${display.namePrefix} ${nameText}\n`;
  message += `${display.agePrefix} ${ageText}${compatibilityText}\n\n`;
  message += `${display.bioPrefix} ${bioText}`;
  
  if (quizResultsSection) {
    message += `\n${quizResultsSection}`;
  }
  
  if (user.mood) {
    message += `\n${display.moodLabel} ${MOODS[user.mood] || user.mood}`;
  }
  
  message += interestsSection;
  message += adminInfoSection;

  const keyboard = new InlineKeyboard();
  if (!showUsername) {
    keyboard.text(buttons.like, callbackQueries.like(user.telegram_id || 0));
    if (mode === "liked") {
      keyboard.text(buttons.delete, callbackQueries.deleteLiked(user.telegram_id || 0));
      if (user.username) {
        keyboard.url(buttons.chat, `https://t.me/${user.username}`);
      }
    } else {
      // match or admin mode
      keyboard.text(buttons.dislike, callbackQueries.dislike(user.telegram_id || 0));
    }
    keyboard.row();
  }
  
  // Add "Next" button if there are more matches
  if (
    mode === "match" &&
    session &&
    session.matchIds &&
    session.currentMatchIndex !== undefined
  ) {
    const currentIndex = session.currentMatchIndex;
    const totalMatches = session.matchIds.length;
    if (currentIndex < totalMatches - 1) {
      keyboard.text(buttons.next, callbackQueries.nextMatch(user.telegram_id || 0));
      keyboard.row();
    }
  }
  
  // Only show report button if not admin
  if (!isAdmin) {
    keyboard.text(buttons.report, callbackQueries.report(user.telegram_id || 0));
  }
  
  // Add ban button if admin
  if (isAdmin) {
    keyboard.row();
    keyboard.text(buttons.ban, callbackQueries.ban(user.telegram_id || 0));
  }

  try {
    // Send photo if available - attach text as caption
    if (user.profile_image) {
      await ctx.replyWithPhoto(user.profile_image, {
        caption: message,
        reply_markup: keyboard,
      });
    } else {
      // No image - send text message only
      await ctx.reply(message, { reply_markup: keyboard });
    }
  } catch (err) {
    const errorContext = mode === "match" ? "match" : "liked user";
    log.error(BOT_NAME + ` > Display ${errorContext} failed`, err);
    // Try to send just the message without image if photo send fails
    try {
      await ctx.reply(message, { reply_markup: keyboard });
    } catch (replyErr) {
      log.error(BOT_NAME + ` > Display ${errorContext} reply failed`, replyErr);
      throw err; // Re-throw original error
    }
  }
}
