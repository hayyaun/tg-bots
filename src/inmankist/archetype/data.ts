import _ from "lodash";
import { Gender, IQuest, IUserData, Language } from "../types";
import { Deity } from "./types";

// Import all JSON files statically
import * as faJson from "./json/fa";
import * as enJson from "./json/en";
import * as ruJson from "./json/ru";

// Build a mapping
const questions: Record<Deity, Record<Language, string[]>> = Object.values(
  Deity
).reduce(
  (acc, deity) => {
    acc[deity] = {
      [Language.Persian]: (faJson as any)[deity],
      [Language.English]: (enJson as any)[deity],
      [Language.Russian]: (ruJson as any)[deity],
    };
    return acc;
  },
  {} as Record<Deity, Record<Language, string[]>>
);

export function loadQuestions(deity: Deity, language: Language): string[] {
  return questions[deity]?.[language] || questions[deity][Language.Persian];
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
