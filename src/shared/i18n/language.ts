import { BOT_NAME as MATCHFOUND_BOT_NAME } from "../../matchfound/constants";
import { getWithPrefix, setWithPrefix } from "../../redis";
import { Language } from "../types";

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

