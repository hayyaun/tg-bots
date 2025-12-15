import { QuizType } from "./types";

// Quiz type emojis - reusable across the codebase
export const QUIZ_TYPE_EMOJIS: Record<QuizType, string> = {
  [QuizType.Archetype]: "🔮",
  [QuizType.MBTI]: "🧠",
  [QuizType.LeftRight]: "⚖️",
  [QuizType.PoliticalCompass]: "🧭",
  [QuizType.Enneagram]: "🎯",
  [QuizType.BigFive]: "📊",
};

// Helper function to get quiz emoji by type
export function getQuizTypeEmoji(quizType: QuizType): string {
  return QUIZ_TYPE_EMOJIS[quizType] || "❓";
}

// Helper function to get quiz type from result field name
export function getQuizTypeFromFieldName(fieldName: string): QuizType | null {
  const fieldToQuizType: Record<string, QuizType> = {
    archetype_result: QuizType.Archetype,
    mbti_result: QuizType.MBTI,
    leftright_result: QuizType.LeftRight,
    politicalcompass_result: QuizType.PoliticalCompass,
    enneagram_result: QuizType.Enneagram,
    bigfive_result: QuizType.BigFive,
  };
  return fieldToQuizType[fieldName] || null;
}

// Helper function to get quiz emoji by result field name (for matchfound compatibility)
export function getQuizEmojiByFieldName(fieldName: string): string {
  const quizType = getQuizTypeFromFieldName(fieldName);
  return quizType ? getQuizTypeEmoji(quizType) : "❓";
}

