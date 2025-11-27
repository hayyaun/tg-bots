import { getWithPrefix, setWithPrefix } from "../redis";
import { Language } from "./types";

// Default language
export const DEFAULT_LANGUAGE = Language.Persian;
const REDIS_PREFIX = "inmankist";
const USER_LANG_TTL = 14 * 24 * 60 * 60; // 2 weeks in seconds

// Get user language or default
export async function getUserLanguage(userId?: number): Promise<Language> {
  if (!userId) return DEFAULT_LANGUAGE;
  const lang = await getWithPrefix(REDIS_PREFIX, `user:${userId}:lang`);
  return (lang as Language) || DEFAULT_LANGUAGE;
}

// Set user language
export async function setUserLanguage(userId: number, language: Language): Promise<void> {
  await setWithPrefix(REDIS_PREFIX, `user:${userId}:lang`, language, USER_LANG_TTL);
}

// Check if user has set a language (vs using default)
export async function hasUserLanguage(userId: number): Promise<boolean> {
  const lang = await getWithPrefix(REDIS_PREFIX, `user:${userId}:lang`);
  return lang !== null;
}

// Refresh language TTL (call when user interacts with bot)
export async function refreshUserLanguageTTL(userId: number): Promise<void> {
  const lang = await getUserLanguage(userId);
  if (lang !== DEFAULT_LANGUAGE) {
    await setWithPrefix(REDIS_PREFIX, `user:${userId}:lang`, lang, USER_LANG_TTL);
  }
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
  [Language.Arabic]: {
    welcome: [
      "👋 مرحبا بك في بوت تلغرام «من أنا؟»! 🎭",
      "",
      "🔮 هل أنت مستعد لاكتشاف أسرار شخصيتك؟",
      "👇 اختر أحد الخيارات أدناه للبدء!",
    ].join("\n"),
    mode: "كيف يجب طرح الأسئلة؟ \n👇",
    gender: "الرجاء تحديد جنسك \n👇",
    start_btn: "🚀 ابدأ الاختبار",
    help_btn: "❓ مساعدة",
    help: ["📌 الرجاء الضغط على زر «ابدأ الاختبار» للبدء!"].join("\n"),
    got_it: "فهمت!",
    values: ["إطلاقا", "ليس كثيرا", "نوعا ما", "تماما"],
    done: "🎉 أحسنت!",
    male: "ذكر",
    female: "أنثى",
    show_about: (s: string) => `حول ${s}`,
    language: "اللغة",
    select_language: "الرجاء اختيار لغتك:",
    quick: "سريع",
    normal: "عادي",
    complete: "كامل",
  },
};

// Get strings for a language
export function getStrings(language: Language = DEFAULT_LANGUAGE): IStrings {
  return translations[language] || translations[DEFAULT_LANGUAGE];
}

// Get strings for a user
export async function getStringsForUser(userId?: number): Promise<IStrings> {
  const lang = await getUserLanguage(userId);
  return getStrings(lang);
}

