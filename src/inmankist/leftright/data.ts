import _ from "lodash";
import { Gender, IQuest, IUserData, Language } from "../types";
import { CognitiveStyle } from "./types";

// Load questions by language
function loadQuestions(style: string, language: Language): string[] {
  try {
    if (language === Language.Persian) {
      return require(`./json/fa/${style}.json`);
    } else if (language === Language.English) {
      return require(`./json/en/${style}.json`);
    } else {
      return require(`./json/ru/${style}.json`);
    }
  } catch {
    // Fallback to Persian if translation not available
    return require(`./json/fa/${style}.json`);
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
