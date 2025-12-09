import _ from "lodash";
import { getUserLanguage } from "../i18n";
import { Gender, IQuest, IUserData, Language } from "../types";
import { BigFiveAspect } from "./types";

// Load questions by language
function loadQuestions(aspect: string, language: Language): string[] {
  try {
    if (language === Language.Persian) {
      return require(`./json/fa/${aspect}.json`);
    } else if (language === Language.English) {
      return require(`./json/en/${aspect}.json`);
    } else if (language === Language.Russian) {
      return require(`./json/ru/${aspect}.json`);
    } else {
      return require(`./json/ar/${aspect}.json`);
    }
  } catch {
    // Fallback to English if translation not available
    return require(`./json/en/${aspect}.json`);
  }
}

interface IListItem {
  aspect: BigFiveAspect;
  questions: string[];
  reverseScored?: boolean[]; // Array indicating which questions are reverse-scored
}

const combine = (items: IListItem[]) =>
  items
    .map(({ aspect: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<BigFiveAspect>)
    )
    .flat();

const sample = (items: IListItem[], check: IQuest<BigFiveAspect>[], size: number) =>
  _.shuffle(
    items
      .map(({ aspect: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<BigFiveAspect>)
        )
      )
      .flat()
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

export const getSample = (gender: Gender, size: number, language: Language = Language.Persian) => {
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

