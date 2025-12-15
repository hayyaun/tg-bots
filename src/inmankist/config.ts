import { Language } from "../shared/types";
import { QuizMode, QuizType } from "./types";

export const quizTypes: { [k: string]: { [key in Language]: string } } = {
  [QuizType.Archetype]: {
    [Language.Persian]: "آزمون کهن الگوها",
    [Language.English]: "Archetype Quiz",
    [Language.Russian]: "Тест архетипов",
    [Language.Arabic]: "اختبار الأنماط الأصلية",
  },
  [QuizType.MBTI]: {
    [Language.Persian]: "آزمون شخصیت MBTI",
    [Language.English]: "MBTI Personality",
    [Language.Russian]: "Тест личности MBTI",
    [Language.Arabic]: "اختبار شخصية MBTI",
  },
  [QuizType.LeftRight]: {
    [Language.Persian]: "آزمون سبک شناختی",
    [Language.English]: "Cognitive Style",
    [Language.Russian]: "Тест когнитивного стиля",
    [Language.Arabic]: "اختبار الأسلوب المعرفي",
  },
  [QuizType.PoliticalCompass]: {
    [Language.Persian]: "قطب‌نمای سیاسی",
    [Language.English]: "Political Compass",
    [Language.Russian]: "Политический компас",
    [Language.Arabic]: "البوصلة السياسية",
  },
  [QuizType.Enneagram]: {
    [Language.Persian]: "آزمون انیاگرام",
    [Language.English]: "Enneagram",
    [Language.Russian]: "Тест эннеаграммы",
    [Language.Arabic]: "اختبار الإنياجرام",
  },
  [QuizType.BigFive]: {
    [Language.Persian]: "آزمون پنج عامل بزرگ شخصیت",
    [Language.English]: "Big Five Aspects Scale",
    [Language.Russian]: "Шкала Большой Пятерки",
    [Language.Arabic]: "مقياس العوامل الخمسة الكبرى",
  },
};

const SAMPLE_SIZE_SM = process.env.DEV ? 1 : 5;
const SAMPLE_SIZE_MD = 15;
const SAMPLE_SIZE_LG = 25;

export const quizModes: { [k: number]: { name: { [key in Language]: string }; size: number } } = {
  [QuizMode.SM]: {
    name: {
      [Language.Persian]: "سریع",
      [Language.English]: "Quick",
      [Language.Russian]: "Быстрый",
      [Language.Arabic]: "سريع",
    },
    size: SAMPLE_SIZE_SM,
  },
  [QuizMode.MD]: {
    name: {
      [Language.Persian]: "عادی",
      [Language.English]: "Normal",
      [Language.Russian]: "Обычный",
      [Language.Arabic]: "عادي",
    },
    size: SAMPLE_SIZE_MD,
  },
  [QuizMode.LG]: {
    name: {
      [Language.Persian]: "کامل",
      [Language.English]: "Complete",
      [Language.Russian]: "Полный",
      [Language.Arabic]: "كامل",
    },
    size: SAMPLE_SIZE_LG,
  },
};

// Helper functions
export function getQuizTypeName(type: QuizType, language: Language): string {
  return quizTypes[type]?.[language] || quizTypes[type][Language.Persian];
}

export function getQuizModeName(mode: QuizMode, language: Language): string {
  return quizModes[mode]?.name[language] || quizModes[mode].name[Language.Persian];
}

export function quizNeedsGender(quizType: QuizType): boolean {
  return quizType === QuizType.Archetype;
}

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

// Helper function to get quiz emoji by result field name (for matchfound compatibility)
export function getQuizEmojiByFieldName(fieldName: string): string {
  const fieldToQuizType: Record<string, QuizType> = {
    archetype_result: QuizType.Archetype,
    mbti_result: QuizType.MBTI,
    leftright_result: QuizType.LeftRight,
    politicalcompass_result: QuizType.PoliticalCompass,
    enneagram_result: QuizType.Enneagram,
    bigfive_result: QuizType.BigFive,
  };
  const quizType = fieldToQuizType[fieldName];
  return quizType ? getQuizTypeEmoji(quizType) : "❓";
}

// Matchfound bot username (for redirect after quiz completion)
export const MATCHFOUND_BOT_USERNAME = process.env.MATCHFOUND_BOT_USERNAME || "match_found_bot";
