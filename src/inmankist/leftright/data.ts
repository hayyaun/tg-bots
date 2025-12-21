import _ from "lodash";
import { Language } from "../../shared/types";
import { IQuest, IUserData } from "../types";
import { CognitiveStyle } from "./types";

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
function loadQuestions(style: string, language: Language): string[] {
  try {
    return questionsByLanguage[language][style as keyof typeof fa];
  } catch {
    // Fallback to English if translation not available
    return questionsByLanguage[Language.English][style as keyof typeof en];
  }
}

interface IListItem {
  style: CognitiveStyle;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  items
    .map(({ style: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<CognitiveStyle>)
    )
    .flat();

const sample = (
  items: IListItem[],
  check: IQuest<CognitiveStyle>[],
  size: number
) =>
  _.shuffle(
    items
      .map(({ style: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<CognitiveStyle>)
        )
      )
      .flat()
  );

// Get items for a specific language
function getItems(language: Language): IListItem[] {
  return [
    { style: CognitiveStyle.Left, questions: loadQuestions("left", language) },
    { style: CognitiveStyle.Right, questions: loadQuestions("right", language) },
  ];
}

export const getSample = (size: number, language: Language = Language.Persian) => {
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
