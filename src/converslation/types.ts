export interface IUserLanguage {
  userId: number;
  chatId?: number;
  targetLanguage: string; // Language to translate to
  sourceLanguage?: string; // Optional: language to translate from
}

export interface ITranslationCache {
  text: string;
  sourceLang?: string;
  targetLang: string;
  translated: string;
  timestamp: number;
}

