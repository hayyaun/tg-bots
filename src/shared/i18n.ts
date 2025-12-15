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
}

// Translations for shared strings
const translations: { [key in Language]: ISharedStrings } = {
  [Language.Persian]: {
    profileError: "❌ خطا در نمایش پروفایل. لطفا دوباره تلاش کنید.",
    startFirst: "لطفا ابتدا با دستور /start شروع کنید.",
    registered: "ثبت شده",
  },
  [Language.English]: {
    profileError: "❌ Error displaying profile. Please try again.",
    startFirst: "Please start with the /start command first.",
    registered: "Registered",
  },
  [Language.Russian]: {
    profileError:
      "❌ Ошибка отображения профиля. Пожалуйста, попробуйте снова.",
    startFirst: "Пожалуйста, сначала начните с команды /start.",
    registered: "Зарегистрировано",
  },
  [Language.Arabic]: {
    profileError: "❌ خطأ في عرض الملف الشخصي. يرجى المحاولة مرة أخرى.",
    startFirst: "يرجى البدء بأمر /start أولاً.",
    registered: "مسجل",
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
