import _ from "lodash";
import { Language } from "../../shared/types";
import { IQuest, IUserData } from "../types";

import * as fa from "./json/fa";
import * as en from "./json/en";
import * as ru from "./json/ru";
import * as ar from "./json/ar";

// Question data by language
const questionsByLanguage: Record<Language, string[]> = {
  [Language.Persian]: fa.default || [],
  [Language.English]: en.default || [],
  [Language.Russian]: ru.default || [],
  [Language.Arabic]: ar.default || [],
};

// Load questions by language
function loadQuestions(language: Language): string[] {
  try {
    return questionsByLanguage[language];
  } catch {
    // Fallback to English if translation not available
    return questionsByLanguage[Language.English];
  }
}

// Combine questions into a flat array
// For mental age, questions don't have categories, so we use a dummy category
const combine = (questions: string[]) =>
  questions.map((text) => ({ belong: "mentalage", text } as IQuest<string>));

const sample = (
  all: IQuest<string>[],
  size: number
) => _.shuffle(_.sampleSize(_.range(all.length), size));

// Get items for a specific language
function getItems(language: Language): string[] {
  return loadQuestions(language);
}

export const getSample = (size: number, language: Language = Language.Persian) => {
  const questions = getItems(language);
  const all = combine(questions);
  return sample(all, size);
};

// Get question by actual question index
export const getQuestionByQuestionIndex = (user: IUserData, questionIndex: number): IQuest<string> => {
  const language = user.language || Language.Persian;
  const questions = getItems(language);
  const all = combine(questions);
  return all[questionIndex];
};
