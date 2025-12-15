import { Language } from "../inmankist/types";
import { getUserLanguage as getInmankistUserLanguage } from "../inmankist/i18n";
import { MATCHFOUND_BOT_NAME, INMANKIST_BOT_NAME } from "./constants";

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
    profileError: "❌ Ошибка отображения профиля. Пожалуйста, попробуйте снова.",
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
 * - Inmankist: Gets language from inmankist i18n
 */
export async function getLanguageForUser(
  userId: number | undefined,
  botName: string
): Promise<Language> {
  // MatchFound is Persian only
  if (botName === MATCHFOUND_BOT_NAME) {
    return Language.Persian;
  }
  
  // For Inmankist, get language from inmankist i18n
  if (botName === INMANKIST_BOT_NAME) {
    return await getInmankistUserLanguage(userId);
  }
  
  // Default to Persian
  return Language.Persian;
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

