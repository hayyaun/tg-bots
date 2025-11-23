import _ from "lodash";
import { Gender, IQuest, IUserData, Language } from "../types";
import { Deity } from "./types";

// Load questions by language
function loadQuestions(deity: string, language: Language): string[] {
  try {
    if (language === Language.Persian) {
      return require(`./json/fa/${deity}.json`);
    } else if (language === Language.English) {
      return require(`./json/en/${deity}.json`);
    } else {
      return require(`./json/ru/${deity}.json`);
    }
  } catch {
    // Fallback to Persian if translation not available
    return require(`./json/fa/${deity}.json`);
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
    { deity: Deity.Zeus, questions: loadQuestions("zeus", language) },
    { deity: Deity.Hades, questions: loadQuestions("hades", language) },
    { deity: Deity.Apollo, questions: loadQuestions("apollo", language) },
    { deity: Deity.Ares, questions: loadQuestions("ares", language) },
    { deity: Deity.Dionysus, questions: loadQuestions("dionysus", language) },
    { deity: Deity.Hermes, questions: loadQuestions("hermes", language) },
    { deity: Deity.Hephaestus, questions: loadQuestions("hephaestus", language) },
    { deity: Deity.Poseidon, questions: loadQuestions("poseidon", language) },
  ];

  const femaleItems = [
    { deity: Deity.Hera, questions: loadQuestions("hera", language) },
    { deity: Deity.Demeter, questions: loadQuestions("demeter", language) },
    { deity: Deity.Persephone, questions: loadQuestions("persephone", language) },
    { deity: Deity.Artemis, questions: loadQuestions("artemis", language) },
    { deity: Deity.Athena, questions: loadQuestions("athena", language) },
    { deity: Deity.Aphrodite, questions: loadQuestions("aphrodite", language) },
    { deity: Deity.Hestia, questions: loadQuestions("hestia", language) },
  ];

  return gender === Gender.male ? maleItems : femaleItems;
}

export const getSample = (gender: Gender, size: number, language: Language = Language.Persian) => {
  const items = getItems(gender, language);
  const all = combine(items);
  return sample(items, all, size);
};

const getQuestionByIndex = (order: number[], index: number, gender: Gender, language: Language) => {
  const items = getItems(gender, language);
  const all = combine(items);
  return all[order[index]];
};

export const getQuestion = (user: IUserData, index: number) => {
  const language = user.language || Language.Persian;
  return getQuestionByIndex(user.order, index, user.gender, language);
};
