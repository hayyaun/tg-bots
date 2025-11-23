import { Language } from "./types";

// Language storage - persists user language preference
export const userLanguages = new Map<number, Language>();

// Default language
export const DEFAULT_LANGUAGE = Language.Persian;

// Get user language or default
export function getUserLanguage(userId?: number): Language {
  if (!userId) return DEFAULT_LANGUAGE;
  return userLanguages.get(userId) || DEFAULT_LANGUAGE;
}

// Set user language
export function setUserLanguage(userId: number, language: Language): void {
  userLanguages.set(userId, language);
}

// Translation strings
export interface IStrings {
  welcome: string;
  mode: string;
  gender: string;
  start_btn: string;
  help_btn: string;
  help: string;
  got_it: string;
  values: string[];
  done: string;
  male: string;
  female: string;
  show_about: (s: string) => string;
  language: string;
  select_language: string;
  quick: string;
  normal: string;
  complete: string;
}

const translations: { [key in Language]: IStrings } = {
  [Language.Persian]: {
    welcome: [
      "👋 به ربات تلگرام «این من کیست؟» خوش آمدید! 🎭",
      "",
      "🔮 آماده‌اید که رازهای شخصیت خود را کشف کنید؟",
      "👇 برای شروع یکی از گزینه‌های زیر را انتخاب کنید!",
    ].join("\n"),
    mode: "نحوه پرسش سوالات چگونه باشد؟ \n👇",
    gender: "لطفا جنسیت خود را مشخص کنید \n👇",
    start_btn: "🚀 شروع آزمون",
    help_btn: "❓ راهنما",
    help: ["📌 لطفا برای شروع روی دکمه «شروع آزمون» بزنید!"].join("\n"),
    got_it: "متوجه شدم!",
    values: ["اصلا", "نه زیاد", "حدودا", "کاملا"],
    done: "🎉 خسته نباشید!",
    male: "مرد",
    female: "زن",
    show_about: (s: string) => `درباره ${s}`,
    language: "زبان",
    select_language: "لطفا زبان خود را انتخاب کنید:",
    quick: "سریع",
    normal: "عادی",
    complete: "کامل",
  },
  [Language.English]: {
    welcome: [
      "👋 Welcome to the «Who Am I?» Telegram bot! 🎭",
      "",
      "🔮 Ready to discover the secrets of your personality?",
      "👇 Choose one of the options below to get started!",
    ].join("\n"),
    mode: "How should questions be asked? \n👇",
    gender: "Please specify your gender \n👇",
    start_btn: "🚀 Start Quiz",
    help_btn: "❓ Help",
    help: ["📌 Please click the «Start Quiz» button to begin!"].join("\n"),
    got_it: "Got it!",
    values: ["Not at all", "Not much", "Somewhat", "Completely"],
    done: "🎉 Well done!",
    male: "Male",
    female: "Female",
    show_about: (s: string) => `About ${s}`,
    language: "Language",
    select_language: "Please select your language:",
    quick: "Quick",
    normal: "Normal",
    complete: "Complete",
  },
  [Language.Russian]: {
    welcome: [
      "👋 Добро пожаловать в телеграм-бота «Кто я?»! 🎭",
      "",
      "🔮 Готовы раскрыть секреты своей личности?",
      "👇 Выберите один из вариантов ниже, чтобы начать!",
    ].join("\n"),
    mode: "Как должны задаваться вопросы? \n👇",
    gender: "Пожалуйста, укажите ваш пол \n👇",
    start_btn: "🚀 Начать тест",
    help_btn: "❓ Помощь",
    help: ["📌 Пожалуйста, нажмите кнопку «Начать тест», чтобы начать!"].join("\n"),
    got_it: "Понятно!",
    values: ["Совсем нет", "Не очень", "Отчасти", "Полностью"],
    done: "🎉 Молодец!",
    male: "Мужской",
    female: "Женский",
    show_about: (s: string) => `О ${s}`,
    language: "Язык",
    select_language: "Пожалуйста, выберите ваш язык:",
    quick: "Быстрый",
    normal: "Обычный",
    complete: "Полный",
  },
};

// Get strings for a language
export function getStrings(language: Language = DEFAULT_LANGUAGE): IStrings {
  return translations[language] || translations[DEFAULT_LANGUAGE];
}

// Get strings for a user
export function getStringsForUser(userId?: number): IStrings {
  return getStrings(getUserLanguage(userId));
}

