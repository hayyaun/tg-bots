export enum Language {
  Persian = "fa",
  English = "en",
  Russian = "ru",
  Arabic = "ar",
}

export enum QuizType {
  Archetype = "archetype",
  MBTI = "mbti",
  LeftRight = "leftright",
  PoliticalCompass = "politicalcompass",
  Enneagram = "enneagram",
  BigFive = "bigfive",
}

// Re-export ProfileFieldKey from shared constants for backward compatibility
// ProfileEditingField is now just the field keys from UserProfile
export type { ProfileFieldKey as ProfileEditingField } from "./constants";

export interface UserProfile {
  telegram_id: number | null;
  username: string | null;
  display_name: string | null;
  biography: string | null;
  birth_date: Date | null;
  gender: string | null;
  looking_for_gender: string | null;
  archetype_result: string | null;
  mbti_result: string | null;
  leftright_result: string | null;
  politicalcompass_result: string | null;
  enneagram_result: string | null;
  bigfive_result: string | null;
  profile_image: string | null;
  mood: string | null;
  interests: string[] | null;
  location: string | null;
  completion_score: number;
  created_at: Date;
  updated_at: Date;
}

