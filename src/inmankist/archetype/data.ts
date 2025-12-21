import _ from "lodash";
import { Language } from "../../shared/types";
import { Gender, IQuest, IUserData } from "../types";
import { Deity } from "./types";

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
function loadQuestions(deity: string, language: Language): string[] {
  try {
    return questionsByLanguage[language][deity.toLowerCase() as keyof typeof fa];
  } catch {
    // Fallback to Persian if translation not available
    return questionsByLanguage[Language.Persian][deity.toLowerCase() as keyof typeof fa];
  }
}

interface IListItem {
  deity: Deity;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  items
    .map(({ deity: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<Deity>)
    )
    .flat();

const sample = (items: IListItem[], check: IQuest<Deity>[], size: number) =>
  _.shuffle(
    items
      .map(({ deity: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<Deity>)
        )
      )
      .flat()
  );

// Get items for a specific language
function getItems(gender: Gender, language: Language): IListItem[] {
  const maleItems = [
    { deity: Deity.Zeus, questions: loadQuestions(Deity.Zeus, language) },
    { deity: Deity.Hades, questions: loadQuestions(Deity.Hades, language) },
    { deity: Deity.Apollo, questions: loadQuestions(Deity.Apollo, language) },
    { deity: Deity.Ares, questions: loadQuestions(Deity.Ares, language) },
    {
      deity: Deity.Dionysus,
      questions: loadQuestions(Deity.Dionysus, language),
    },
    { deity: Deity.Hermes, questions: loadQuestions(Deity.Hermes, language) },
    {
      deity: Deity.Hephaestus,
      questions: loadQuestions(Deity.Hephaestus, language),
    },
    {
      deity: Deity.Poseidon,
      questions: loadQuestions(Deity.Poseidon, language),
    },
  ];

  const femaleItems = [
    { deity: Deity.Hera, questions: loadQuestions(Deity.Hera, language) },
    { deity: Deity.Demeter, questions: loadQuestions(Deity.Demeter, language) },
    {
      deity: Deity.Persephone,
      questions: loadQuestions(Deity.Persephone, language),
    },
    { deity: Deity.Artemis, questions: loadQuestions(Deity.Artemis, language) },
    { deity: Deity.Athena, questions: loadQuestions(Deity.Athena, language) },
    {
      deity: Deity.Aphrodite,
      questions: loadQuestions(Deity.Aphrodite, language),
    },
    { deity: Deity.Hestia, questions: loadQuestions(Deity.Hestia, language) },
  ];

  return gender === Gender.male ? maleItems : femaleItems;
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

// Get question by position in order array (for sending questions)
export const getQuestion = (user: IUserData, index: number) => {
  const language = user.language || Language.Persian;
  if (!user.gender) {
    throw new Error("Gender is required for Archetype quiz");
  }
  const items = getItems(user.gender, language);
  const all = combine(items);
  return all[user.order[index]];
};

// Get question by actual question index (for calculating results)
export const getQuestionByQuestionIndex = (user: IUserData, questionIndex: number) => {
  const language = user.language || Language.Persian;
  if (!user.gender) {
    throw new Error("Gender is required for Archetype quiz");
  }
  const items = getItems(user.gender, language);
  const all = combine(items);
  return all[questionIndex];
};
