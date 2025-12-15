import _ from "lodash";
import { Language } from "../../shared/types";
import { IQuest, IUserData } from "../types";
import { PoliticalAxis } from "./types";

// Load questions by language
function loadQuestions(axis: string, language: Language): string[] {
  try {
    if (language === Language.Persian) {
      return require(`./json/fa/${axis}.json`);
    } else if (language === Language.English) {
      return require(`./json/en/${axis}.json`);
    } else if (language === Language.Russian) {
      return require(`./json/ru/${axis}.json`);
    } else {
      return require(`./json/ar/${axis}.json`);
    }
  } catch {
    // Fallback to Persian if translation not available
    return require(`./json/fa/${axis}.json`);
  }
}

interface IListItem {
  axis: PoliticalAxis;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  items
    .map(({ axis: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<PoliticalAxis>)
    )
    .flat();

const sample = (
  items: IListItem[],
  check: IQuest<PoliticalAxis>[],
  size: number
) =>
  _.shuffle(
    items
      .map(({ axis: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<PoliticalAxis>)
        )
      )
      .flat()
  );

// Get items for a specific language
function getItems(language: Language): IListItem[] {
  return [
    { axis: PoliticalAxis.EconomicLeft, questions: loadQuestions("economic_left", language) },
    { axis: PoliticalAxis.EconomicRight, questions: loadQuestions("economic_right", language) },
    { axis: PoliticalAxis.Authoritarian, questions: loadQuestions("authoritarian", language) },
    { axis: PoliticalAxis.Libertarian, questions: loadQuestions("libertarian", language) },
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
