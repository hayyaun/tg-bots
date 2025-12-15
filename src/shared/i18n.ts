import { getWithPrefix, setWithPrefix } from "../redis";
import { MATCHFOUND_BOT_NAME } from "./constants";
import { Language } from "./types";

// Default language
export const DEFAULT_LANGUAGE = Language.Persian;

// Shared Redis prefix for user language (shared across all bots)
const SHARED_PREFIX = "shared";
const USER_LANG_TTL = 14 * 24 * 60 * 60; // 2 weeks in seconds

/**
 * Get user language (shared across all bots)
 */
export async function getUserLanguage(userId?: number): Promise<Language> {
  if (!userId) return DEFAULT_LANGUAGE;
  const lang = await getWithPrefix(SHARED_PREFIX, `user:${userId}:lang`);
  return (lang as Language) || DEFAULT_LANGUAGE;
}

/**
 * Set user language (shared across all bots)
 */
export async function setUserLanguage(
  userId: number,
  language: Language
): Promise<void> {
  await setWithPrefix(
    SHARED_PREFIX,
    `user:${userId}:lang`,
    language,
    USER_LANG_TTL
  );
}

/**
 * Check if user has set a language (vs using default)
 */
export async function hasUserLanguage(userId: number): Promise<boolean> {
  const lang = await getWithPrefix(SHARED_PREFIX, `user:${userId}:lang`);
  return lang !== null;
}

/**
 * Refresh language TTL (call when user interacts with bot)
 */
export async function refreshUserLanguageTTL(userId: number): Promise<void> {
  const lang = await getUserLanguage(userId);
  if (lang !== DEFAULT_LANGUAGE) {
    await setWithPrefix(
      SHARED_PREFIX,
      `user:${userId}:lang`,
      lang,
      USER_LANG_TTL
    );
  }
}

// Shared strings interface
export interface ISharedStrings {
  profileError: string;
  startFirst: string;
  registered: string; // "ثبت شده"
  // Profile fields
  profileTitle: string;
  name: string;
  age: string;
  genderLabel: string;
  lookingFor: string;
  biography: string;
  archetype: string;
  mbti: string;
  leftright: string;
  politicalcompass: string;
  enneagram: string;
  bigfive: string;
  interests: string;
  location: string;
  completion: string;
  notSet: string;
  // Profile values
  male: string;
  female: string;
  both: string;
  year: string;
  archetypeNotSet: (botUsername: string) => string;
  mbtiNotSet: (botUsername: string) => string;
  // Buttons
  editName: string;
  editBio: string;
  editBirthdate: string;
  editGender: string;
  editLookingFor: string;
  editImages: string;
  editUsername: string;
  editMood: string;
  editInterests: string;
  editLocation: string;
  takeQuizzes: string;
}

// Translations for shared strings
const translations: { [key in Language]: ISharedStrings } = {
  [Language.Persian]: {
    profileError: "❌ خطا در نمایش پروفایل. لطفا دوباره تلاش کنید.",
    startFirst: "لطفا ابتدا با دستور /start شروع کنید.",
    registered: "ثبت شده",
    // Profile fields
    profileTitle: "📋 <b>پروفایل شما</b>",
    name: "👤 نام",
    age: "🎂 سن",
    genderLabel: "⚧️ جنسیت",
    lookingFor: "💝 پیشنهاد",
    biography: "📝 بیوگرافی",
    archetype: "🔮 کهن الگو",
    mbti: "🧠 تست MBTI",
    leftright: "⚖️ سبک شناختی",
    politicalcompass: "🧭 قطب‌نمای سیاسی",
    enneagram: "🎯 انیاگرام",
    bigfive: "📊 پنج عامل بزرگ",
    interests: "🎯 علایق",
    location: "📍 استان",
    completion: "📊 تکمیل",
    notSet: "ثبت نشده",
    // Profile values
    male: "مرد",
    female: "زن",
    both: "هر دو",
    year: "سال",
    archetypeNotSet: (botUsername: string) => `ثبت نشده (در @${botUsername} انجام دهید)`,
    mbtiNotSet: (botUsername: string) => `ثبت نشده (در @${botUsername} انجام دهید)`,
    // Buttons
    editName: "✏️ ویرایش نام",
    editBio: "📝 ویرایش بیوگرافی",
    editBirthdate: "🎂 تاریخ تولد",
    editGender: "⚧️ جنسیت",
    editLookingFor: "💝 پیشنهاد",
    editImages: "📷 تصاویر",
    editUsername: "🔗 نام کاربری",
    editMood: "😊 مود",
    editInterests: "🎯 علایق",
    editLocation: "📍 استان",
    takeQuizzes: "🧪 انجام تست‌ها",
  },
  [Language.English]: {
    profileError: "❌ Error displaying profile. Please try again.",
    startFirst: "Please start with the /start command first.",
    registered: "Registered",
    // Profile fields
    profileTitle: "📋 <b>Your Profile</b>",
    name: "👤 Name",
    age: "🎂 Age",
    genderLabel: "⚧️ Gender",
    lookingFor: "💝 Looking For",
    biography: "📝 Biography",
    archetype: "🔮 Archetype",
    mbti: "🧠 MBTI Test",
    leftright: "⚖️ Cognitive Style",
    politicalcompass: "🧭 Political Compass",
    enneagram: "🎯 Enneagram",
    bigfive: "📊 Big Five",
    interests: "🎯 Interests",
    location: "📍 Province",
    completion: "📊 Completion",
    notSet: "Not set",
    // Profile values
    male: "Male",
    female: "Female",
    both: "Both",
    year: "years",
    archetypeNotSet: (botUsername: string) => `Not set (take quiz at @${botUsername})`,
    mbtiNotSet: (botUsername: string) => `Not set (take quiz at @${botUsername})`,
    // Buttons
    editName: "✏️ Edit Name",
    editBio: "📝 Edit Biography",
    editBirthdate: "🎂 Birth Date",
    editGender: "⚧️ Gender",
    editLookingFor: "💝 Looking For",
    editImages: "📷 Images",
    editUsername: "🔗 Username",
    editMood: "😊 Mood",
    editInterests: "🎯 Interests",
    editLocation: "📍 Province",
    takeQuizzes: "🧪 Take Quizzes",
  },
  [Language.Russian]: {
    profileError:
      "❌ Ошибка отображения профиля. Пожалуйста, попробуйте снова.",
    startFirst: "Пожалуйста, сначала начните с команды /start.",
    registered: "Зарегистрировано",
    // Profile fields
    profileTitle: "📋 <b>Ваш профиль</b>",
    name: "👤 Имя",
    age: "🎂 Возраст",
    genderLabel: "⚧️ Пол",
    lookingFor: "💝 Ищу",
    biography: "📝 Биография",
    archetype: "🔮 Архетип",
    mbti: "🧠 Тест MBTI",
    leftright: "⚖️ Когнитивный стиль",
    politicalcompass: "🧭 Политический компас",
    enneagram: "🎯 Эннеаграмма",
    bigfive: "📊 Большая пятерка",
    interests: "🎯 Интересы",
    location: "📍 Провинция",
    completion: "📊 Заполнение",
    notSet: "Не установлено",
    // Profile values
    male: "Мужской",
    female: "Женский",
    both: "Оба",
    year: "лет",
    archetypeNotSet: (botUsername: string) => `Не установлено (пройдите тест в @${botUsername})`,
    mbtiNotSet: (botUsername: string) => `Не установлено (пройдите тест в @${botUsername})`,
    // Buttons
    editName: "✏️ Редактировать имя",
    editBio: "📝 Редактировать биографию",
    editBirthdate: "🎂 Дата рождения",
    editGender: "⚧️ Пол",
    editLookingFor: "💝 Ищу",
    editImages: "📷 Изображения",
    editUsername: "🔗 Имя пользователя",
    editMood: "😊 Настроение",
    editInterests: "🎯 Интересы",
    editLocation: "📍 Провинция",
    takeQuizzes: "🧪 Пройти тесты",
  },
  [Language.Arabic]: {
    profileError: "❌ خطأ في عرض الملف الشخصي. يرجى المحاولة مرة أخرى.",
    startFirst: "يرجى البدء بأمر /start أولاً.",
    registered: "مسجل",
    // Profile fields
    profileTitle: "📋 <b>ملفك الشخصي</b>",
    name: "👤 الاسم",
    age: "🎂 العمر",
    genderLabel: "⚧️ الجنس",
    lookingFor: "💝 أبحث عن",
    biography: "📝 السيرة الذاتية",
    archetype: "🔮 النمط الأصلي",
    mbti: "🧠 اختبار MBTI",
    leftright: "⚖️ الأسلوب المعرفي",
    politicalcompass: "🧭 البوصلة السياسية",
    enneagram: "🎯 الإنياجرام",
    bigfive: "📊 العوامل الخمسة الكبرى",
    interests: "🎯 الاهتمامات",
    location: "📍 المحافظة",
    completion: "📊 الإكمال",
    notSet: "غير محدد",
    // Profile values
    male: "ذكر",
    female: "أنثى",
    both: "كلاهما",
    year: "سنة",
    archetypeNotSet: (botUsername: string) => `غير محدد (قم بإجراء الاختبار في @${botUsername})`,
    mbtiNotSet: (botUsername: string) => `غير محدد (قم بإجراء الاختبار في @${botUsername})`,
    // Buttons
    editName: "✏️ تعديل الاسم",
    editBio: "📝 تعديل السيرة الذاتية",
    editBirthdate: "🎂 تاريخ الميلاد",
    editGender: "⚧️ الجنس",
    editLookingFor: "💝 أبحث عن",
    editImages: "📷 الصور",
    editUsername: "🔗 اسم المستخدم",
    editMood: "😊 المزاج",
    editInterests: "🎯 الاهتمامات",
    editLocation: "📍 المحافظة",
    takeQuizzes: "🧪 إجراء الاختبارات",
  },
};

/**
 * Get language for a user based on bot name
 * - MatchFound: Always returns Persian
 * - Inmankist: Gets language from shared user language
 */
export async function getLanguageForUser(
  userId: number | undefined,
  botName: string
): Promise<Language> {
  // MatchFound is Persian only
  if (botName === MATCHFOUND_BOT_NAME) {
    return Language.Persian;
  }

  // For Inmankist and other bots, get language from shared user language
  return await getUserLanguage(userId);
}

/**
 * Get shared strings for a user based on bot name
 */
export async function getSharedStrings(
  userId: number | undefined,
  botName: string
): Promise<ISharedStrings> {
  const language = await getLanguageForUser(userId, botName);
  return translations[language] || translations[Language.Persian];
}

/**
 * Get shared strings for a specific language
 */
export function getSharedStringsForLanguage(
  language: Language = Language.Persian
): ISharedStrings {
  return translations[language] || translations[Language.Persian];
}
