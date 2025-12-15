import { Context, InlineKeyboard } from "grammy";
import log from "../log";
import {
  MOODS,
  MAX_COMPLETION_SCORE,
} from "../shared/constants";
import {
  BOT_NAME,
  MAX_INTERESTS,
  ARCHETYPE_MATCH_SCORE,
  MBTI_MATCH_SCORE,
  MAX_INTERESTS_SCORE,
  MAX_AGE_BONUS,
  MAX_COMPLETION_BONUS,
  MAX_COMPATIBILITY_SCORE,
  MAX_AGE_DIFFERENCE,
  archetypeCompatibility,
  mbtiCompatibility,
} from "./constants";
import { buttons, display } from "./strings";
import { UserProfile } from "../shared/types";
import { MatchUser, SessionData } from "./types";
import { calculateAge } from "../shared/utils";
import { getInterestNames } from "../shared/i18n";
import { getQuizTypeFromFieldName, getQuizTypeEmoji } from "../shared/quizUtils";

type DisplayMode = "match" | "liked";

// Helper function to format BigFive result
function formatBigFiveResult(bigfiveResult: string | null): string | null {
  if (!bigfiveResult) return null;
  try {
    const data = JSON.parse(bigfiveResult);
    const topTrait = Object.entries(data.traits || {})
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];
    return topTrait ? `${topTrait[0]}: ${topTrait[1]}%` : "ثبت شده";
  } catch {
    return "ثبت شده";
  }
}

// Helper function to format quiz result text for displayUser
function formatQuizResultText(
  result: string | null,
  label: string,
  formatter?: (value: string) => string
): string | null {
  if (!result) return null;
  const formatted = formatter ? formatter(result) : result;
  return `${label}: ${formatted}`;
}

// Helper function to build quiz results section for displayUser
function buildQuizResultsSection(user: MatchUser): string {
  const sections: string[] = [];
  
  if (user.archetype_result) {
    const quizType = getQuizTypeFromFieldName("archetype_result");
    const emoji = quizType ? getQuizTypeEmoji(quizType) : "❓";
    sections.push(`${emoji} ${formatQuizResultText(user.archetype_result, "کهن الگو")}`);
  }
  if (user.mbti_result) {
    const quizType = getQuizTypeFromFieldName("mbti_result");
    const emoji = quizType ? getQuizTypeEmoji(quizType) : "❓";
    sections.push(`${emoji} ${formatQuizResultText(user.mbti_result, "تست MBTI", (v) => v.toUpperCase())}`);
  }
  if (user.leftright_result) {
    const quizType = getQuizTypeFromFieldName("leftright_result");
    const emoji = quizType ? getQuizTypeEmoji(quizType) : "❓";
    sections.push(`${emoji} ${formatQuizResultText(user.leftright_result, "سبک شناختی")}`);
  }
  if (user.politicalcompass_result) {
    const quizType = getQuizTypeFromFieldName("politicalcompass_result");
    const emoji = quizType ? getQuizTypeEmoji(quizType) : "❓";
    sections.push(`${emoji} ${formatQuizResultText(user.politicalcompass_result, "قطب‌نمای سیاسی")}`);
  }
  if (user.enneagram_result) {
    const quizType = getQuizTypeFromFieldName("enneagram_result");
    const emoji = quizType ? getQuizTypeEmoji(quizType) : "❓";
    sections.push(`${emoji} ${formatQuizResultText(user.enneagram_result, "انیاگرام", (v) => v.replace("type", "تیپ "))}`);
  }
  if (user.bigfive_result) {
    const formatted = formatBigFiveResult(user.bigfive_result);
    if (formatted) {
      const quizType = getQuizTypeFromFieldName("bigfive_result");
      const emoji = quizType ? getQuizTypeEmoji(quizType) : "❓";
      sections.push(`${emoji} پنج عامل بزرگ: ${formatted}`);
    }
  }
  
  return sections.length > 0 ? sections.join("\n") : "";
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

export async function displayUser(
  ctx: Context,
  user: MatchUser,
  mode: DisplayMode = "match",
  showUsername = false,
  session?: SessionData,
  userInterests?: string[],
  currentUserProfile?: UserProfile
) {
  const ageText = user.age ? `${user.age} سال` : display.unknownAge;
  const nameText = user.display_name || display.noName;
  const bioText = user.biography || display.noBio;

  // Calculate or use compatibility score
  let compatibilityScore = user.compatibility_score;
  if (compatibilityScore === undefined && currentUserProfile) {
    compatibilityScore = calculateCompatibilityScore(currentUserProfile, user);
  }

  // Show compatibility score if available
  const compatibilityText =
    compatibilityScore !== undefined
      ? `\n💯 سازگاری: ${compatibilityScore}%`
      : "";

  const quizResultsSection = buildQuizResultsSection(user);
  
  let message = `👤 ${nameText}\n`;
  message += `🎂 ${ageText}${compatibilityText}\n\n`;
  message += `📝 ${bioText}\n`;
  if (quizResultsSection) {
    message += `\n${quizResultsSection}`;
  }
  if (user.mood) {
    message += `\n😊 مود: ${MOODS[user.mood] || user.mood}`;
  }
  if (user.interests && user.interests.length > 0) {
    const interestNamesMap = await getInterestNames(ctx.from?.id, BOT_NAME);
    const interestNames = user.interests
      .map(
        (interest) =>
          interestNamesMap[interest as keyof typeof interestNamesMap] || interest
      )
      .join(", ");

    // Calculate mutual interests count if user interests provided
    let mutualInterestsText = "";
    if (userInterests && userInterests.length > 0) {
      const userInterestsSet = new Set(userInterests);
      const matchInterestsSet = new Set(user.interests);
      const mutualCount = Array.from(userInterestsSet).filter((interest) =>
        matchInterestsSet.has(interest)
      ).length;
      if (mutualCount > 0) {
        mutualInterestsText = ` (${mutualCount} مورد مشترک)`;
      }
    }

    message += `\n🎯 علایق: ${interestNames}${mutualInterestsText}`;
  }

  if (showUsername) {
    message += `\n\n👤 Username: ${user.username ? `@${user.username}` : display.usernameNotSet}`;
  }

  const keyboard = new InlineKeyboard();
  if (!showUsername) {
    if (mode === "match") {
      keyboard.text(buttons.like, `like:${user.telegram_id}`);
      keyboard.text(buttons.dislike, `dislike:${user.telegram_id}`);
      keyboard.row();
    } else if (mode === "liked") {
      keyboard.text(buttons.like, `like:${user.telegram_id}`);
      keyboard.text(buttons.delete, `delete_liked:${user.telegram_id}`);
      keyboard.row();
      // Add chat button if username exists
      if (user.username) {
        keyboard.url(buttons.chat, `https://t.me/${user.username}`);
      }
    }
  }
  
  // Add "Next" button if there are more matches (works for both regular and admin view)
  if (
    mode === "match" &&
    session &&
    session.matches &&
    session.currentMatchIndex !== undefined
  ) {
    const currentIndex = session.currentMatchIndex;
    const totalMatches = session.matches.length;
    if (currentIndex < totalMatches - 1) {
      keyboard.text(buttons.next, `next_match:${user.telegram_id}`);
      keyboard.row();
    }
  }
  
  keyboard.text(buttons.report, `report:${user.telegram_id}`);

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
