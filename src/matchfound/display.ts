import { Context, InlineKeyboard } from "grammy";
import { MatchUser, SessionData } from "./types";
import { MOODS, INTEREST_NAMES } from "./constants";
import { buttons, display } from "./strings";
import { getSession } from "./session";
import log from "../log";
import { BOT_NAME } from "./constants";

export async function displayMatch(
  ctx: Context,
  match: MatchUser,
  showUsername = false,
  session?: SessionData,
  userInterests?: string[]
) {
  const ageText = match.age ? `${match.age} سال` : display.unknownAge;
  const nameText = match.display_name || display.noName;
  const bioText = match.biography || display.noBio;
  const archetypeText = match.archetype_result
    ? `کهن الگو: ${match.archetype_result}`
    : display.archetypeNotSet;
  const mbtiText = match.mbti_result
    ? `تست MBTI: ${match.mbti_result.toUpperCase()}`
    : display.mbtiNotSet;

  // Show compatibility score if available
  const compatibilityText = match.compatibility_score !== undefined
    ? `\n💯 سازگاری: ${match.compatibility_score}%`
    : "";

  let message = `👤 ${nameText}\n`;
  message += `🎂 ${ageText}${compatibilityText}\n\n`;
  message += `📝 ${bioText}\n\n`;
  message += `🔮 ${archetypeText}\n`;
  message += `🧠 ${mbtiText}`;
  if (match.mood) {
    message += `\n😊 مود: ${MOODS[match.mood] || match.mood}`;
  }
  if (match.interests && match.interests.length > 0) {
    const interestNames = match.interests
      .map((interest) => INTEREST_NAMES[interest as keyof typeof INTEREST_NAMES] || interest)
      .join(", ");
    
    // Calculate mutual interests count if user interests provided
    let mutualInterestsText = "";
    if (userInterests && userInterests.length > 0) {
      const userInterestsSet = new Set(userInterests);
      const matchInterestsSet = new Set(match.interests);
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
    message += `\n\n👤 Username: ${match.username ? `@${match.username}` : display.usernameNotSet}`;
  }

  const keyboard = new InlineKeyboard();
  if (!showUsername) {
    keyboard.text(buttons.like, `like:${match.telegram_id}`);
    keyboard.text(buttons.dislike, `dislike:${match.telegram_id}`);
    keyboard.row();
    
    // Add "Next" button if there are more matches
    if (session && session.matches && session.currentMatchIndex !== undefined) {
      const currentIndex = session.currentMatchIndex;
      const totalMatches = session.matches.length;
      if (currentIndex < totalMatches - 1) {
        keyboard.text(buttons.next, `next_match:${match.telegram_id}`);
        keyboard.row();
      }
    }
  }
  keyboard.text(buttons.report, `report:${match.telegram_id}`);

  try {
    // Send photo if available - attach text as caption
    if (match.profile_image) {
      await ctx.replyWithPhoto(match.profile_image, {
        caption: message,
        reply_markup: keyboard,
      });
    } else {
      // No images - send text message only
      await ctx.reply(message, { reply_markup: keyboard });
    }
  } catch (err) {
    log.error(BOT_NAME + " > Display match failed", err);
    // Try to send just the message without images if photo send fails
    try {
      await ctx.reply(message, { reply_markup: keyboard });
    } catch (replyErr) {
      log.error(BOT_NAME + " > Display match reply failed", replyErr);
      throw err; // Re-throw original error
    }
  }
}

export async function displayLikedUser(ctx: Context, user: MatchUser, showUsername = false) {
  const ageText = user.age ? `${user.age} سال` : display.unknownAge;
  const nameText = user.display_name || display.noName;
  const bioText = user.biography || display.noBio;
  const archetypeText = user.archetype_result
    ? `کهن الگو: ${user.archetype_result}`
    : display.archetypeNotSet;
  const mbtiText = user.mbti_result
    ? `تست MBTI: ${user.mbti_result.toUpperCase()}`
    : display.mbtiNotSet;

  let message = `👤 ${nameText}\n`;
  message += `🎂 ${ageText}\n\n`;
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
    message += `\n🎯 علایق: ${interestNames}`;
  }

  if (showUsername) {
    message += `\n\n👤 Username: ${user.username ? `@${user.username}` : display.usernameNotSet}`;
  }

  const keyboard = new InlineKeyboard();
  if (!showUsername) {
    // Add chat button if username exists
    if (user.username) {
      keyboard.url(buttons.chat, `https://t.me/${user.username}`);
    }
    keyboard.text(buttons.delete, `delete_liked:${user.telegram_id}`);
    keyboard.row();
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
    log.error(BOT_NAME + " > Display liked user failed", err);
    // Try to send just the message without images if photo send fails
    try {
      await ctx.reply(message, { reply_markup: keyboard });
    } catch (replyErr) {
      log.error(BOT_NAME + " > Display liked user reply failed", replyErr);
      throw err; // Re-throw original error
    }
  }
}

