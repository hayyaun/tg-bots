import { Context, InlineKeyboard } from "grammy";
import { MatchUser } from "./types";
import { MOODS, INTEREST_NAMES } from "./constants";

export async function displayMatch(ctx: Context, match: MatchUser, showUsername = false) {
  const ageText = match.age ? `${match.age} سال` : "نامشخص";
  const nameText = match.display_name || "بدون نام";
  const bioText = match.biography || "بیوگرافی ثبت نشده";
  const archetypeText = match.archetype_result
    ? `کهن الگو: ${match.archetype_result}`
    : "کهن الگو: ثبت نشده";
  const mbtiText = match.mbti_result
    ? `تست MBTI: ${match.mbti_result.toUpperCase()}`
    : "تست MBTI: ثبت نشده";

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
    message += `\n\n👤 Username: ${match.username ? `@${match.username}` : "نام کاربری ثبت نشده"}`;
  }

  const keyboard = new InlineKeyboard();
  if (!showUsername) {
    keyboard.text("❤️ لایک", `like:${match.telegram_id}`);
    keyboard.text("❌ رد", `dislike:${match.telegram_id}`);
    keyboard.row();
  }
  keyboard.text("🚫 گزارش", `report:${match.telegram_id}`);

  // Send photos if available
  if (match.profile_images && Array.isArray(match.profile_images) && match.profile_images.length > 0) {
    const mediaGroup = match.profile_images.slice(0, 10).map((fileId) => ({
      type: "photo" as const,
      media: fileId,
    }));
    await ctx.replyWithMediaGroup(mediaGroup);
  }

  await ctx.reply(message, { reply_markup: keyboard });
}

export async function displayLikedUser(ctx: Context, user: MatchUser, showUsername = false) {
  const ageText = user.age ? `${user.age} سال` : "نامشخص";
  const nameText = user.display_name || "بدون نام";
  const bioText = user.biography || "بیوگرافی ثبت نشده";
  const archetypeText = user.archetype_result
    ? `کهن الگو: ${user.archetype_result}`
    : "کهن الگو: ثبت نشده";
  const mbtiText = user.mbti_result
    ? `تست MBTI: ${user.mbti_result.toUpperCase()}`
    : "تست MBTI: ثبت نشده";

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
    message += `\n\n👤 Username: ${user.username ? `@${user.username}` : "نام کاربری ثبت نشده"}`;
  }

  const keyboard = new InlineKeyboard();
  if (!showUsername) {
    keyboard.text("👁️ نمایش", `show_liked:${user.telegram_id}`);
    keyboard.text("🗑️ حذف", `delete_liked:${user.telegram_id}`);
    keyboard.row();
  }
  keyboard.text("🚫 گزارش", `report:${user.telegram_id}`);

  // Send photos if available
  if (user.profile_images && Array.isArray(user.profile_images) && user.profile_images.length > 0) {
    const mediaGroup = user.profile_images.slice(0, 10).map((fileId) => ({
      type: "photo" as const,
      media: fileId,
    }));
    await ctx.replyWithMediaGroup(mediaGroup);
  }

  await ctx.reply(message, { reply_markup: keyboard });
}

