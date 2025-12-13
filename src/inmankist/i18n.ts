import { getWithPrefix, setWithPrefix } from "../redis";
import { Language, QuizType } from "./types";
import { getQuizTypeName } from "./config";

// Default language
export const DEFAULT_LANGUAGE = Language.Persian;
const REDIS_PREFIX = "inmankist";
const USER_LANG_TTL = 14 * 24 * 60 * 60; // 2 weeks in seconds

// Get user language or default (no cache here - userData cache handles active sessions)
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
  language_btn: string;
  history_btn: string;
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
  matchfound_message: string;
  matchfound_button: string;
  compass_left: string;
  compass_right: string;
  compass_authoritarian: string;
  compass_libertarian: string;
  compass_libLeft: string;
  compass_libRight: string;
  compass_authLeft: string;
  compass_authRight: string;
  history_title: string;
  history_empty: string;
  history_no_results: string;
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
    language_btn: "🌐 زبان",
    history_btn: "📚 تاریخچه",
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
    matchfound_message: "🎯 آیا مایلید با افرادی هم تایپ خودتون آشنا بشید؟",
    matchfound_button: "✅ بله",
    compass_left: "چپ",
    compass_right: "راست",
    compass_authoritarian: "اقتدارگرا",
    compass_libertarian: "آزادی‌خواه",
    compass_libLeft: "چپ آزادی‌خواه",
    compass_libRight: "راست آزادی‌خواه",
    compass_authLeft: "چپ اقتدارگرا",
    compass_authRight: "راست اقتدارگرا",
    history_title: "📚 *تاریخچه نتایج آزمون‌های شما:*",
    history_empty: "📭 شما هنوز هیچ آزمونی انجام نداده‌اید.",
    history_no_results: "هیچ نتیجه‌ای ثبت نشده",
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
    language_btn: "🌐 Language",
    history_btn: "📚 History",
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
    matchfound_message: "🎯 Would you like to meet people of your type?",
    matchfound_button: "✅ Yes",
    compass_left: "Left",
    compass_right: "Right",
    compass_authoritarian: "Authoritarian",
    compass_libertarian: "Libertarian",
    compass_libLeft: "Lib Left",
    compass_libRight: "Lib Right",
    compass_authLeft: "Auth Left",
    compass_authRight: "Auth Right",
    history_title: "📚 *Your Quiz Results History:*",
    history_empty: "📭 You haven't taken any quizzes yet.",
    history_no_results: "No result recorded",
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
    language_btn: "🌐 Язык",
    history_btn: "📚 История",
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
    matchfound_message: "🎯 Хотите ли вы познакомиться с людьми вашего типа?",
    matchfound_button: "✅ Да",
    compass_left: "Левые",
    compass_right: "Правые",
    compass_authoritarian: "Авторитарный",
    compass_libertarian: "Либертарианский",
    compass_libLeft: "Либ. Левые",
    compass_libRight: "Либ. Правые",
    compass_authLeft: "Авт. Левые",
    compass_authRight: "Авт. Правые",
    history_title: "📚 *История ваших результатов тестов:*",
    history_empty: "📭 Вы еще не прошли ни одного теста.",
    history_no_results: "Результат не записан",
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
    language_btn: "🌐 اللغة",
    history_btn: "📚 التاريخ",
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
    matchfound_message: "🎯 هل تريد التعرف على أشخاص من نوعك؟",
    matchfound_button: "✅ نعم",
    compass_left: "يسار",
    compass_right: "يمين",
    compass_authoritarian: "استبدادي",
    compass_libertarian: "ليبرتاري",
    compass_libLeft: "يسار ليبرتاري",
    compass_libRight: "يمين ليبرتاري",
    compass_authLeft: "يسار استبدادي",
    compass_authRight: "يمين استبدادي",
    history_title: "📚 *تاريخ نتائج الاختبارات الخاصة بك:*",
    history_empty: "📭 لم تقم بإجراء أي اختبارات بعد.",
    history_no_results: "لم يتم تسجيل النتيجة",
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

// Get a string in all languages joined with "/"
export function getStringAllLanguages(
  key: keyof IStrings
): string {
  const values = Object.values(Language).map((lang) => {
    const strings = getStrings(lang);
    return strings[key];
  });
  return values.join(" / ");
}

// Get "show_about" string for a quiz type in all languages joined with "/"
export function getShowAboutAllLanguages(type: QuizType): string {
  const values = Object.values(Language).map((lang) => {
    const strings = getStrings(lang);
    const quizTypeName = getQuizTypeName(type, lang);
    return strings.show_about(quizTypeName);
  });
  return values.join(" / ");
}

