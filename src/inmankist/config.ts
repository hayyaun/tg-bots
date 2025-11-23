import { Language, QuizMode, QuizType } from "./types";

export const quizTypes: { [k: string]: { [key in Language]: string } } = {
  [QuizType.Archetype]: {
    [Language.Persian]: "آزمون کهن الگوها",
    [Language.English]: "Archetype Test",
    [Language.Russian]: "Тест архетипов",
  },
  [QuizType.MBTI]: {
    [Language.Persian]: "آزمون شخصیت MBTI",
    [Language.English]: "MBTI Personality Test",
    [Language.Russian]: "Тест личности MBTI",
  },
  [QuizType.LeftRight]: {
    [Language.Persian]: "آزمون سبک شناختی",
    [Language.English]: "Cognitive Style Test",
    [Language.Russian]: "Тест когнитивного стиля",
  },
  [QuizType.PoliticalCompass]: {
    [Language.Persian]: "قطب‌نمای سیاسی",
    [Language.English]: "Political Compass",
    [Language.Russian]: "Политический компас",
  },
  [QuizType.Enneagram]: {
    [Language.Persian]: "آزمون انیاگرام",
    [Language.English]: "Enneagram Test",
    [Language.Russian]: "Тест эннеаграммы",
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
    },
    size: SAMPLE_SIZE_SM,
  },
  [QuizMode.MD]: {
    name: {
      [Language.Persian]: "عادی",
      [Language.English]: "Normal",
      [Language.Russian]: "Обычный",
    },
    size: SAMPLE_SIZE_MD,
  },
  [QuizMode.LG]: {
    name: {
      [Language.Persian]: "کامل",
      [Language.English]: "Complete",
      [Language.Russian]: "Полный",
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
