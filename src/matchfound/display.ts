import { Context, InlineKeyboard } from "grammy";
import { MatchUser, SessionData, UserProfile } from "./types";
import { MOODS, INTEREST_NAMES, archetypeCompatibility, mbtiCompatibility } from "./constants";
import { buttons, display } from "./strings";
import { getSession } from "./session";
import log from "../log";
import { BOT_NAME } from "./constants";
import { calculateAge } from "./utils";

type DisplayMode = "match" | "liked";

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

  // Archetype match: 40%
  if (archetypeMatch) {
    compatibilityScore += 40;
  }

  // MBTI match: 40%
  if (mbtiMatch) {
    compatibilityScore += 40;
  }

  // Mutual interests: up to 20% (scaled by number of mutual interests, max 7)
  if (mutualInterestsCount > 0) {
    const interestsScore = Math.min((mutualInterestsCount / 7) * 20, 20);
    compatibilityScore += interestsScore;
  }

  // Age difference bonus: up to 10% (smaller difference = higher bonus)
  if (currentUserAge && otherUserAge) {
    const ageDiff = Math.abs(otherUserAge - currentUserAge);
    const ageBonus = Math.max(0, 10 - (ageDiff / 8) * 10);
    compatibilityScore += ageBonus;
  }

  // Completion score bonus: up to 10% (higher score = higher bonus)
  const completionBonus = Math.min((otherUser.completion_score / 12) * 10, 10);
  compatibilityScore += completionBonus;

  // Cap at 100%
  return Math.min(Math.round(compatibilityScore), 100);
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
  const archetypeText = user.archetype_result
    ? `کهن الگو: ${user.archetype_result}`
    : display.archetypeNotSet;
  const mbtiText = user.mbti_result
    ? `تست MBTI: ${user.mbti_result.toUpperCase()}`
    : display.mbtiNotSet;

  // Calculate or use compatibility score
  let compatibilityScore = user.compatibility_score;
  if (compatibilityScore === undefined && currentUserProfile) {
    compatibilityScore = calculateCompatibilityScore(currentUserProfile, user);
  }

  // Show compatibility score if available
  const compatibilityText = compatibilityScore !== undefined
    ? `\n💯 سازگاری: ${compatibilityScore}%`
    : "";

  let message = `👤 ${nameText}\n`;
  message += `🎂 ${ageText}${compatibilityText}\n\n`;
  message += `📝 ${bioText}\n\n`;
  message += `🔮 ${archetypeText}\n`;
  message += `🧠 ${mbtiText}`;
  if (user.mood) {
    message += `\n😊 مود: ${MOODS[user.mood] || user.mood}`;
  }
  if (user.interests && user.interests.length > 0) {
    const interestNames = user.interests
      .map((interest) => INTEREST_NAMES[interest as keyof typeof INTEREST_NAMES] || interest)
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
      
      // Add "Next" button if there are more matches
      if (session && session.matches && session.currentMatchIndex !== undefined) {
        const currentIndex = session.currentMatchIndex;
        const totalMatches = session.matches.length;
        if (currentIndex < totalMatches - 1) {
          keyboard.text(buttons.next, `next_match:${user.telegram_id}`);
          keyboard.row();
        }
      }
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
  keyboard.text(buttons.report, `report:${user.telegram_id}`);

  try {
    // Send photo if available - attach text as caption
    if (user.profile_image) {
      await ctx.replyWithPhoto(user.profile_image, {
        caption: message,
        reply_markup: keyboard,
      });
    } else {
      // No images - send text message only
      await ctx.reply(message, { reply_markup: keyboard });
    }
  } catch (err) {
    const errorContext = mode === "match" ? "match" : "liked user";
    log.error(BOT_NAME + ` > Display ${errorContext} failed`, err);
    // Try to send just the message without images if photo send fails
    try {
      await ctx.reply(message, { reply_markup: keyboard });
    } catch (replyErr) {
      log.error(BOT_NAME + ` > Display ${errorContext} reply failed`, replyErr);
      throw err; // Re-throw original error
    }
  }
}


