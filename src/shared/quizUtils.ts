import { QuizType, UserProfile } from "./types";

// Quiz type emojis - reusable across the codebase
export const QUIZ_TYPE_EMOJIS: Record<QuizType, string> = {
  [QuizType.Archetype]: "🔮",
  [QuizType.MBTI]: "🧠",
  [QuizType.LeftRight]: "⚖️",
  [QuizType.PoliticalCompass]: "🧭",
  [QuizType.Enneagram]: "🎯",
  [QuizType.BigFive]: "📊",
  [QuizType.MentalAge]: "🧠",
};

// Mapping from QuizType to UserProfile field name
export const QUIZ_TYPE_TO_FIELD: Record<QuizType, keyof UserProfile> = {
  [QuizType.Archetype]: "archetype_result",
  [QuizType.MBTI]: "mbti_result",
  [QuizType.LeftRight]: "leftright_result",
  [QuizType.PoliticalCompass]: "politicalcompass_result",
  [QuizType.Enneagram]: "enneagram_result",
  [QuizType.BigFive]: "bigfive_result",
  [QuizType.MentalAge]: "mentalage_result",
};

// Helper function to get quiz emoji by type
export function getQuizTypeEmoji(quizType: QuizType): string {
  return QUIZ_TYPE_EMOJIS[quizType] || "❓";
}

// Helper function to get quiz result value from profile by quiz type
export function getQuizResult(profile: UserProfile, quizType: QuizType): string | null {
  const fieldName = QUIZ_TYPE_TO_FIELD[quizType];
  const value = profile[fieldName];
  return typeof value === "string" ? value : null;
}

