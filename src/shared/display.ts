import { Context, InlineKeyboard } from "grammy";
import {
  INMANKIST_BOT_USERNAME,
  INTEREST_NAMES,
  MOODS,
  PROVINCE_NAMES,
  MAX_COMPLETION_SCORE,
} from "../matchfound/constants";
import { buttons, fields, profileValues } from "../matchfound/strings";
import { UserProfile } from "../matchfound/types";
import { calculateAge } from "../matchfound/utils";

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

// Helper function to build quiz results section for displayProfile
function buildProfileQuizResultsSection(profile: UserProfile): string {
  const sections: string[] = [];
  
  // Required quizzes - always show with instructions if missing
  if (profile.archetype_result) {
    sections.push(`${fields.archetype}: ${profile.archetype_result}`);
  } else {
    sections.push(`${fields.archetype}: ${profileValues.archetypeNotSet(INMANKIST_BOT_USERNAME)}`);
  }
  
  if (profile.mbti_result) {
    sections.push(`${fields.mbti}: ${profile.mbti_result.toUpperCase()}`);
  } else {
    sections.push(`${fields.mbti}: ${profileValues.mbtiNotSet(INMANKIST_BOT_USERNAME)}`);
  }
  
  // Optional quizzes - only show if present
  if (profile.leftright_result) {
    sections.push(`${fields.leftright}: ${profile.leftright_result}`);
  }
  if (profile.politicalcompass_result) {
    sections.push(`${fields.politicalcompass}: ${profile.politicalcompass_result}`);
  }
  if (profile.enneagram_result) {
    sections.push(`${fields.enneagram}: ${profile.enneagram_result.replace("type", "تیپ ")}`);
  }
  if (profile.bigfive_result) {
    const formatted = formatBigFiveResult(profile.bigfive_result);
    if (formatted) {
      sections.push(`${fields.bigfive}: ${formatted}`);
    }
  }
  
  return sections.join("\n");
}

// Reusable function to format and display user profile
export async function displayProfile(ctx: Context, profile: UserProfile) {
  const ageText = profile.birth_date
    ? `${calculateAge(profile.birth_date)} ${profileValues.year}`
    : fields.notSet;
  const genderText = profile.gender === "male" ? profileValues.male : profile.gender === "female" ? profileValues.female : fields.notSet;
  const lookingForText =
    profile.looking_for_gender === "male"
      ? profileValues.male
      : profile.looking_for_gender === "female"
      ? profileValues.female
      : profile.looking_for_gender === "both"
      ? profileValues.both
      : fields.notSet;

  let message = `${fields.profileTitle}\n\n`;
  // Show mood emoji after display name if available
  const moodEmoji = profile.mood ? " " + (MOODS[profile.mood] || profile.mood) : "";
  message += `${fields.name}: ${profile.display_name || fields.notSet}${moodEmoji}\n`;
  message += `${fields.age}: ${ageText}\n`;
  message += `${fields.genderLabel}: ${genderText}\n`;
  message += `${fields.lookingFor}: ${lookingForText}\n`;
  message += `${fields.biography}: ${profile.biography || fields.notSet}\n`;
  
  // Show interests and location before quiz results
  
  if (profile.interests && profile.interests.length > 0) {
    const interestNames = profile.interests
      .map((interest) => INTEREST_NAMES[interest as keyof typeof INTEREST_NAMES] || interest)
      .join(", ");
    message += `${fields.interests}: ${interestNames}\n`;
  } else {
    message += `${fields.interests}: ${fields.notSet}\n`;
  }
  
  if (profile.location) {
    message += `${fields.location}: ${PROVINCE_NAMES[profile.location as keyof typeof PROVINCE_NAMES] || profile.location}\n`;
  } else {
    message += `${fields.location}: ${fields.notSet}\n`;
  }
  
  // Show quiz results with instructions if missing
  const quizResultsSection = buildProfileQuizResultsSection(profile);
  if (quizResultsSection) {
    message += `\n${quizResultsSection}\n`;
  }
  
  message += `\n${fields.completion}: ${profile.completion_score}/${MAX_COMPLETION_SCORE}`;

  const keyboard = new InlineKeyboard()
    .text(buttons.editName, "profile:edit:name")
    .text(buttons.editBio, "profile:edit:bio")
    .row()
    .text(buttons.editBirthdate, "profile:edit:birthdate")
    .text(buttons.editGender, "profile:edit:gender")
    .row()
    .text(buttons.editLookingFor, "profile:edit:looking_for")
    .text(buttons.editImages, "profile:edit:images")
    .row()
    .text(buttons.editUsername, "profile:edit:username")
    .text(buttons.editMood, "profile:edit:mood")
    .row()
    .text(buttons.editInterests, "profile:edit:interests")
    .text(buttons.editLocation, "profile:edit:location");
  
  // Always show quiz button to allow users to take/retake quizzes
  keyboard.row().url(buttons.takeQuizzes, `https://t.me/${INMANKIST_BOT_USERNAME}?start=archetype`);

  // Send photo if available - attach text as caption
  if (profile.profile_image) {
    await ctx.replyWithPhoto(profile.profile_image, {
      caption: message,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  } else {
    // No images - send text message only
    await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
  }
}

