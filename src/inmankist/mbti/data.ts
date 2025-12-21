import _ from "lodash";
import { Language } from "../../shared/types";
import { IQuest, IUserData } from "../types";
import { Dimension } from "./types";

import * as ar from "./json/ar";
import * as en from "./json/en";
import * as fa from "./json/fa";
import * as ru from "./json/ru";

// Question data by language
const questionsByLanguage: Record<Language, Record<string, string[]>> = {
  [Language.Persian]: fa,
  [Language.English]: en,
  [Language.Russian]: ru,
  [Language.Arabic]: ar,
};

// Load questions by language
function loadQuestions(dimension: string, language: Language): string[] {
  try {
    return questionsByLanguage[language][dimension as keyof typeof fa];
  } catch {
    // Fallback to English if translation not available
    return questionsByLanguage[Language.English][dimension as keyof typeof en];
  }
}

interface IListItem {
  dimension: Dimension;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  items
    .map(({ dimension: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<Dimension>)
    )
    .flat();

const sample = (items: IListItem[], check: IQuest<Dimension>[], size: number) =>
  _.shuffle(
    items
      .map(({ dimension: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<Dimension>)
        )
      )
      .flat()
  );

// Get items for a specific language
function getItems(language: Language): IListItem[] {
  return [
    { dimension: Dimension.E, questions: loadQuestions("E", language) },
    { dimension: Dimension.I, questions: loadQuestions("I", language) },
    { dimension: Dimension.S, questions: loadQuestions("S", language) },
    { dimension: Dimension.N, questions: loadQuestions("N", language) },
    { dimension: Dimension.T, questions: loadQuestions("T", language) },
    { dimension: Dimension.F, questions: loadQuestions("F", language) },
    { dimension: Dimension.J, questions: loadQuestions("J", language) },
    { dimension: Dimension.P, questions: loadQuestions("P", language) },
  ];
}

export const getSample = (
  size: number,
  language: Language = Language.Persian
) => {
  const items = getItems(language);
  const all = combine(items);
  return sample(items, all, size);
};

// Get question by position in order array (for sending questions)
export const getQuestion = (user: IUserData, index: number) => {
  const language = user.language || Language.Persian;
  const items = getItems(language);
  const all = combine(items);
  return all[user.order[index]];
};

// Get question by actual question index (for calculating results)
export const getQuestionByQuestionIndex = (user: IUserData, questionIndex: number) => {
  const language = user.language || Language.Persian;
  const items = getItems(language);
  const all = combine(items);
  return all[questionIndex];
};
