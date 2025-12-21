import _ from "lodash";
import { Language } from "../../shared/types";
import { IQuest, IUserData } from "../types";
import { EnneagramType } from "./types";

import * as fa from "./json/fa";
import * as en from "./json/en";
import * as ru from "./json/ru";
import * as ar from "./json/ar";

// Question data by language
const questionsByLanguage: Record<Language, Record<string, string[]>> = {
  [Language.Persian]: fa,
  [Language.English]: en,
  [Language.Russian]: ru,
  [Language.Arabic]: ar,
};

// Load questions by language
function loadQuestions(type: string, language: Language): string[] {
  try {
    return questionsByLanguage[language][type as keyof typeof fa];
  } catch {
    // Fallback to English if translation not available
    return questionsByLanguage[Language.English][type as keyof typeof en];
  }
}

interface IListItem {
  type: EnneagramType;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  items
    .map(({ type: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<EnneagramType>)
    )
    .flat();

const sample = (
  items: IListItem[],
  check: IQuest<EnneagramType>[],
  size: number
) =>
  _.shuffle(
    items
      .map(({ type: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<EnneagramType>)
        )
      )
      .flat()
  );

// Get items for a specific language
function getItems(language: Language): IListItem[] {
  return [
    { type: EnneagramType.Type1, questions: loadQuestions("type1", language) },
    { type: EnneagramType.Type2, questions: loadQuestions("type2", language) },
    { type: EnneagramType.Type3, questions: loadQuestions("type3", language) },
    { type: EnneagramType.Type4, questions: loadQuestions("type4", language) },
    { type: EnneagramType.Type5, questions: loadQuestions("type5", language) },
    { type: EnneagramType.Type6, questions: loadQuestions("type6", language) },
    { type: EnneagramType.Type7, questions: loadQuestions("type7", language) },
    { type: EnneagramType.Type8, questions: loadQuestions("type8", language) },
    { type: EnneagramType.Type9, questions: loadQuestions("type9", language) },
  ];
}

export const getSample = (size: number, language: Language = Language.Persian) => {
  const items = getItems(language);
  const all = combine(items);
  return sample(items, all, size);
};

const getQuestionByIndex = (order: number[], index: number, language: Language) => {
  const items = getItems(language);
  const all = combine(items);
  return all[order[index]];
};

export const getQuestion = (user: IUserData, index: number) => {
  const language = user.language || Language.Persian;
  return getQuestionByIndex(user.order, index, language);
};
