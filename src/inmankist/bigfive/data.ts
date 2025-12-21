import _ from "lodash";
import { Language } from "../../shared/types";
import { IQuest, IUserData } from "../types";
import { BigFiveAspect } from "./types";

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
function loadQuestions(aspect: string, language: Language): string[] {
  try {
    return questionsByLanguage[language][aspect as keyof typeof fa];
  } catch {
    // Fallback to English if translation not available
    return questionsByLanguage[Language.English][aspect as keyof typeof en];
  }
}

interface IListItem {
  aspect: BigFiveAspect;
  questions: string[];
  reverseScored?: boolean[]; // Array indicating which questions are reverse-scored
}

const combine = (items: IListItem[]) =>
  items
    .map(({ aspect: belong, questions }) => questions.map((text) => ({ belong, text }) as IQuest<BigFiveAspect>))
    .flat();

const sample = (items: IListItem[], check: IQuest<BigFiveAspect>[], size: number) =>
  _.shuffle(
    items
      .map(({ aspect: belong, questions }) =>
        _.sampleSize(questions, size).map((text) => _.findIndex(check, { belong, text } as IQuest<BigFiveAspect>)),
      )
      .flat(),
  );

// Get items for a specific language
function getItems(language: Language): IListItem[] {
  return [
    { aspect: BigFiveAspect.Intellect, questions: loadQuestions("Intellect", language) },
    { aspect: BigFiveAspect.Aesthetics, questions: loadQuestions("Aesthetics", language) },
    { aspect: BigFiveAspect.Industriousness, questions: loadQuestions("Industriousness", language) },
    { aspect: BigFiveAspect.Orderliness, questions: loadQuestions("Orderliness", language) },
    { aspect: BigFiveAspect.Enthusiasm, questions: loadQuestions("Enthusiasm", language) },
    { aspect: BigFiveAspect.Assertiveness, questions: loadQuestions("Assertiveness", language) },
    { aspect: BigFiveAspect.Compassion, questions: loadQuestions("Compassion", language) },
    { aspect: BigFiveAspect.Politeness, questions: loadQuestions("Politeness", language) },
    { aspect: BigFiveAspect.Withdrawal, questions: loadQuestions("Withdrawal", language) },
    { aspect: BigFiveAspect.Volatility, questions: loadQuestions("Volatility", language) },
  ];
}

export const getSample = (size: number, language: Language = Language.Persian) => {
  const items = getItems(language);
  const all = combine(items);
  return sample(items, all, size);
};

// Get question by actual question index
export const getQuestionByQuestionIndex = (user: IUserData, questionIndex: number) => {
  const language = user.language || Language.Persian;
  const items = getItems(language);
  const all = combine(items);
  return all[questionIndex];
};
