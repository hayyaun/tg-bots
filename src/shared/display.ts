import { Context, InlineKeyboard } from "grammy";
import {
  INMANKIST_BOT_USERNAME,
  MOODS,
  MAX_COMPLETION_SCORE,
} from "./constants";
import { UserProfile } from "./types";
import { calculateAge } from "./utils";
import { getSharedStrings, getInterestNames, getProvinceNames } from "./i18n";

// Helper function to format BigFive result
async function formatBigFiveResult(
  bigfiveResult: string | null,
  botName: string,
  userId: number | undefined
): Promise<string | null> {
  if (!bigfiveResult) return null;
  try {
    const data = JSON.parse(bigfiveResult);
    const topTrait = Object.entries(data.traits || {}).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0];
    const strings = await getSharedStrings(userId, botName);
    return topTrait ? `${topTrait[0]}: ${topTrait[1]}%` : strings.registered;
  } catch {
    const strings = await getSharedStrings(userId, botName);
    return strings.registered;
  }
}

// Helper function to build quiz results section for displayProfile
async function buildProfileQuizResultsSection(
  profile: UserProfile,
  botName: string,
  userId: number | undefined
): Promise<string> {
  const strings = await getSharedStrings(userId, botName);
  const sections: string[] = [];

  // Required quizzes - always show with instructions if missing
  if (profile.archetype_result) {
    sections.push(`${strings.archetype}: ${profile.archetype_result}`);
  } else {
    sections.push(
      `${strings.archetype}: ${strings.archetypeNotSet}`
    );
  }

  if (profile.mbti_result) {
    sections.push(`${strings.mbti}: ${profile.mbti_result.toUpperCase()}`);
  } else {
    sections.push(
      `${strings.mbti}: ${strings.mbtiNotSet}`
    );
  }

  // Optional quizzes - only show if present
  if (profile.leftright_result) {
    sections.push(`${strings.leftright}: ${profile.leftright_result}`);
  }
  if (profile.politicalcompass_result) {
    sections.push(
      `${strings.politicalcompass}: ${profile.politicalcompass_result}`
    );
  }
  if (profile.enneagram_result) {
    // Keep Persian formatting for enneagram type (type -> تیپ)
    const enneagramText = profile.enneagram_result.replace("type", "تیپ ");
    sections.push(`${strings.enneagram}: ${enneagramText}`);
  }
  if (profile.bigfive_result) {
    const formatted = await formatBigFiveResult(
      profile.bigfive_result,
      botName,
      userId
    );
    if (formatted) {
      sections.push(`${strings.bigfive}: ${formatted}`);
    }
  }

  return sections.join("\n");
}

// Reusable function to format and display user profile
export async function displayProfile(
  ctx: Context,
  profile: UserProfile,
  botName: string,
  userId?: number
) {
  const strings = await getSharedStrings(userId, botName);

  const ageText = profile.birth_date
    ? `${calculateAge(profile.birth_date)} ${strings.year}`
    : strings.notSet;
  const genderText =
    profile.gender === "male"
      ? strings.male
      : profile.gender === "female"
        ? strings.female
        : strings.notSet;
  const lookingForText =
    profile.looking_for_gender === "male"
      ? strings.male
      : profile.looking_for_gender === "female"
        ? strings.female
        : profile.looking_for_gender === "both"
          ? strings.both
          : strings.notSet;

  let message = `${strings.profileTitle}\n\n`;
  // Show mood emoji after display name if available
  const moodEmoji = profile.mood
    ? " " + (MOODS[profile.mood] || profile.mood)
    : "";
  message += `${strings.name}: ${profile.display_name || strings.notSet}${moodEmoji}\n`;
  message += `${strings.age}: ${ageText}\n`;
  message += `${strings.genderLabel}: ${genderText}\n`;
  // Only show "Looking for" for matchfound bot
  if (botName !== "Inmankist") {
    message += `${strings.lookingFor}: ${lookingForText}\n`;
  }
  message += `${strings.biography}: ${profile.biography || strings.notSet}\n`;

  // Show interests and location before quiz results

  if (profile.interests && profile.interests.length > 0) {
    const interestNamesMap = await getInterestNames(userId, botName);
    const interestNames = profile.interests
      .map(
        (interest) =>
          interestNamesMap[interest as keyof typeof interestNamesMap] ||
          interest
      )
      .join(", ");
    message += `${strings.interests}: ${interestNames}\n`;
  } else {
    message += `${strings.interests}: ${strings.notSet}\n`;
  }

  if (profile.location) {
    const provinceNamesMap = await getProvinceNames(userId, botName);
    message += `${strings.location}: ${provinceNamesMap[profile.location as keyof typeof provinceNamesMap] || profile.location}\n`;
  } else {
    message += `${strings.location}: ${strings.notSet}\n`;
  }

  // Show quiz results with instructions if missing
  const quizResultsSection = await buildProfileQuizResultsSection(
    profile,
    botName,
    userId
  );
  if (quizResultsSection) {
    message += `\n${quizResultsSection}\n`;
  }

  message += `\n${strings.completion}: ${profile.completion_score}/${MAX_COMPLETION_SCORE}`;

  const keyboard = new InlineKeyboard()
    .text(strings.editName, "profile:edit:name")
    .text(strings.editBio, "profile:edit:bio")
    .row()
    .text(strings.editBirthdate, "profile:edit:birthdate")
    .text(strings.editGender, "profile:edit:gender");

  // Only show "Looking for" button for matchfound bot
  if (botName !== "Inmankist") {
    keyboard
      .row()
      .text(strings.editLookingFor, "profile:edit:looking_for")
      .text(strings.editImage, "profile:edit:image");
  }

  keyboard
    .row()
    .text(strings.editUsername, "profile:edit:username")
    .text(strings.editMood, "profile:edit:mood")
    .row()
    .text(strings.editInterests, "profile:edit:interests")
    .text(strings.editLocation, "profile:edit:location");

  // Only show quiz button for matchfound bot
  if (botName !== "Inmankist") {
    keyboard
      .row()
      .url(
        strings.takeQuizzes,
        `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`
      );
  }

  // Send photo if available - attach text as caption
  if (profile.profile_image) {
    await ctx.replyWithPhoto(profile.profile_image, {
      caption: message,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    // No image - send text message only
    await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
  }
}
