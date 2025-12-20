import { Context, InlineKeyboard } from "grammy";
import log from "../log";
import { MAX_COMPATIBILITY_SCORE, MOODS } from "../shared/constants";
import { isUserBanned } from "../shared/database";
import { buildQuizResultsSection } from "../shared/display";
import { getInterestNames } from "../shared/i18n";
import { UserProfile } from "../shared/types";
import { calculateAge } from "../shared/utils";
import { callbacks as callbackQueries } from "./callbackQueries";
import { BOT_NAME } from "./constants";
import {
  calculateCompatibilityScore as calculateCompatibilityScoreCore,
  calculateMatchInfo,
  calculateMutualInterestsCount,
  isAdminContext,
} from "./helpers";
import { buttons, display, profileValues } from "./strings";
import { DisplayMode, MatchUser, SessionData } from "./types";

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
  const currentUserAge = calculateAge(currentUser.birth_date);
  const otherUserAge = otherUser.age || calculateAge(otherUser.birth_date);

  // Calculate match information (archetype, MBTI, mutual interests)
  const { archetypeMatch, mbtiMatch, mutualInterestsCount } =
    calculateMatchInfo(currentUser, otherUser);

  // Use shared compatibility score calculation
  const compatibilityScore = calculateCompatibilityScoreCore(
    archetypeMatch,
    mbtiMatch,
    mutualInterestsCount,
    currentUserAge || 0,
    otherUserAge,
    otherUser.completion_score
  );

  // Round and cap at MAX_COMPATIBILITY_SCORE
  return Math.min(Math.round(compatibilityScore), MAX_COMPATIBILITY_SCORE);
}

// Helper to build ban status text
async function buildBanStatusText(
  userTelegramId: number | null
): Promise<string> {
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

  const mutualCount = calculateMutualInterestsCount(
    userInterests,
    user.interests
  );
  const mutualInterestsText =
    mutualCount > 0 ? display.mutualInterests(mutualCount) : "";

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
  session?: SessionData,
  currentUserProfile?: UserProfile
) {
  // Check if viewing user is admin
  const isAdmin = isAdminContext(ctx);
  const showUsername = isAdmin; // Admins always see usernames

  // Calculate compatibility score
  const compatibilityScore =
    user.compatibility_score ??
    (currentUserProfile
      ? calculateCompatibilityScore(currentUserProfile, user)
      : undefined);

  // Derive user interests from currentUserProfile
  const userInterests = currentUserProfile?.interests ?? undefined;

  // Build message sections in parallel where possible
  const [quizResultsSection, interestsSection, adminInfoSection] =
    await Promise.all([
      buildQuizResultsSection(user, BOT_NAME, ctx.from?.id, false),
      buildInterestsSection(user, userInterests, ctx.from?.id),
      isAdmin ? buildAdminInfoSection(user, isAdmin) : Promise.resolve(""),
    ]);

  // Build main message
  const ageText = user.age
    ? `${user.age} ${profileValues.year}`
    : display.unknownAge;
  const nameText = user.display_name || display.noName;
  const bioText = user.biography || display.noBio;
  const compatibilityText =
    compatibilityScore !== undefined
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
      keyboard.text(
        buttons.delete,
        callbackQueries.deleteLiked(user.telegram_id || 0)
      );
      if (user.username) {
        keyboard.url(buttons.chat, `https://t.me/${user.username}`);
      }
    } else {
      // match or admin mode
      keyboard.text(
        buttons.dislike,
        callbackQueries.dislike(user.telegram_id || 0)
      );
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
      keyboard.text(
        buttons.next,
        callbackQueries.nextMatch(user.telegram_id || 0)
      );
      keyboard.row();
    }
  }

  // Only show report button if not admin
  if (!isAdmin) {
    keyboard.text(
      buttons.report,
      callbackQueries.report(user.telegram_id || 0)
    );
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
