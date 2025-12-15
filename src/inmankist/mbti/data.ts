import _ from "lodash";
import { getUserLanguage } from "../i18n";
import { Language } from "../../shared/types";
import { IQuest, IUserData } from "../types";
import { Dimension } from "./types";

// Load questions by language
function loadQuestions(dimension: string, language: Language): string[] {
  try {
    if (language === Language.Persian) {
      return require(`./json/fa/${dimension}.json`);
    } else if (language === Language.English) {
      return require(`./json/en/${dimension}.json`);
    } else if (language === Language.Russian) {
      return require(`./json/ru/${dimension}.json`);
    } else {
      return require(`./json/ar/${dimension}.json`);
    }
  } catch {
    // Fallback to English if translation not available
    return require(`./json/en/${dimension}.json`);
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
