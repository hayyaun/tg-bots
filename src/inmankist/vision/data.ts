import _ from "lodash";
import { Gender, IQuest, IUserData, Language } from "../types";
import { Vision } from "./types";

// Load questions by language
function loadQuestions(vision: string, language: Language): string[] {
  try {
    if (language === Language.Persian) {
      return require(`./json/fa/${vision}.json`);
    } else if (language === Language.English) {
      return require(`./json/en/${vision}.json`);
    } else if (language === Language.Russian) {
      return require(`./json/ru/${vision}.json`);
    } else {
      return require(`./json/ar/${vision}.json`);
    }
  } catch {
    // Fallback to Persian if translation not available
    return require(`./json/fa/${vision}.json`);
  }
}

interface IListItem {
  vision: Vision;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  items
    .map(({ vision: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<Vision>)
    )
    .flat();

const sample = (items: IListItem[], check: IQuest<Vision>[], size: number) =>
  _.shuffle(
    items
      .map(({ vision: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<Vision>)
        )
      )
      .flat()
  );

// Get items for a specific language (gender doesn't matter for visions)
function getItems(gender: Gender, language: Language): IListItem[] {
  return [
    { vision: Vision.Anemo, questions: loadQuestions(Vision.Anemo, language) },
    { vision: Vision.Geo, questions: loadQuestions(Vision.Geo, language) },
    { vision: Vision.Electro, questions: loadQuestions(Vision.Electro, language) },
    { vision: Vision.Dendro, questions: loadQuestions(Vision.Dendro, language) },
    { vision: Vision.Hydro, questions: loadQuestions(Vision.Hydro, language) },
    { vision: Vision.Pyro, questions: loadQuestions(Vision.Pyro, language) },
    { vision: Vision.Cryo, questions: loadQuestions(Vision.Cryo, language) },
  ];
}

export const getSample = (
  gender: Gender,
  size: number,
  language: Language = Language.Persian
) => {
  const items = getItems(gender, language);
  const all = combine(items);
  return sample(items, all, size);
};

const getQuestionByIndex = (
  order: number[],
  index: number,
  gender: Gender,
  language: Language
) => {
  const items = getItems(gender, language);
  const all = combine(items);
  return all[order[index]];
};

export const getQuestion = (user: IUserData, index: number) => {
  const language = user.language || Language.Persian;
  return getQuestionByIndex(user.order, index, user.gender, language);
};

