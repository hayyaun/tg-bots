import { Context, InlineKeyboard } from "grammy";
import { MatchUser } from "./types";
import { MOODS, INTEREST_NAMES } from "./constants";
import { buttons, display } from "./strings";
import log from "../log";
import { BOT_NAME } from "./constants";

export async function displayMatch(ctx: Context, match: MatchUser, showUsername = false) {
  const ageText = match.age ? `${match.age} سال` : display.unknownAge;
  const nameText = match.display_name || display.noName;
  const bioText = match.biography || display.noBio;
  const archetypeText = match.archetype_result
    ? `کهن الگو: ${match.archetype_result}`
    : display.archetypeNotSet;
  const mbtiText = match.mbti_result
    ? `تست MBTI: ${match.mbti_result.toUpperCase()}`
    : display.mbtiNotSet;

  let message = `👤 ${nameText}\n`;
  message += `🎂 ${ageText}\n\n`;
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
    message += `\n🎯 علایق: ${interestNames}`;
  }

  if (showUsername) {
    message += `\n\n👤 Username: ${match.username ? `@${match.username}` : display.usernameNotSet}`;
  }

  const keyboard = new InlineKeyboard();
  if (!showUsername) {
    keyboard.text(buttons.like, `like:${match.telegram_id}`);
    keyboard.text(buttons.dislike, `dislike:${match.telegram_id}`);
    keyboard.row();
  }
  keyboard.text(buttons.report, `report:${match.telegram_id}`);

  try {
    // Send photos if available
    if (match.profile_images && Array.isArray(match.profile_images) && match.profile_images.length > 0) {
      const mediaGroup = match.profile_images.slice(0, 10).map((fileId) => ({
        type: "photo" as const,
        media: fileId,
      }));
      await ctx.replyWithMediaGroup(mediaGroup);
    }

    await ctx.reply(message, { reply_markup: keyboard });
  } catch (err) {
    log.error(BOT_NAME + " > Display match failed", err);
    // Try to send just the message without images if media group fails
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
    keyboard.text(buttons.show, `show_liked:${user.telegram_id}`);
    keyboard.text(buttons.delete, `delete_liked:${user.telegram_id}`);
    keyboard.row();
  }
  keyboard.text(buttons.report, `report:${user.telegram_id}`);

  try {
    // Send photos if available
    if (user.profile_images && Array.isArray(user.profile_images) && user.profile_images.length > 0) {
      const mediaGroup = user.profile_images.slice(0, 10).map((fileId) => ({
        type: "photo" as const,
        media: fileId,
      }));
      await ctx.replyWithMediaGroup(mediaGroup);
    }

    await ctx.reply(message, { reply_markup: keyboard });
  } catch (err) {
    log.error(BOT_NAME + " > Display liked user failed", err);
    // Try to send just the message without images if media group fails
    try {
      await ctx.reply(message, { reply_markup: keyboard });
    } catch (replyErr) {
      log.error(BOT_NAME + " > Display liked user reply failed", replyErr);
      throw err; // Re-throw original error
    }
  }
}

