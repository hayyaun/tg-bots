import _ from "lodash";
import { Gender, IQuest, IUserData } from "../types";
import type1 from "./json/type1.json";
import type2 from "./json/type2.json";
import type3 from "./json/type3.json";
import type4 from "./json/type4.json";
import type5 from "./json/type5.json";
import type6 from "./json/type6.json";
import type7 from "./json/type7.json";
import type8 from "./json/type8.json";
import type9 from "./json/type9.json";
import { EnneagramType } from "./types";

interface IListItem {
  type: EnneagramType;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  items
    .map(({ type: belong, questions }) =>
      questions.map((text) => ({ belong, text }) as IQuest<EnneagramType>)
    )
    .flat();

const sample = (
  items: IListItem[],
  check: IQuest<EnneagramType>[],
  size: number
) =>
  _.shuffle(
    items
      .map(({ type: belong, questions }) =>
        _.sampleSize(questions, size).map((text) =>
          _.findIndex(check, { belong, text } as IQuest<EnneagramType>)
        )
      )
      .flat()
  );

// Enneagram types are gender-neutral
const items = [
  { type: EnneagramType.Type1, questions: type1 },
  { type: EnneagramType.Type2, questions: type2 },
  { type: EnneagramType.Type3, questions: type3 },
  { type: EnneagramType.Type4, questions: type4 },
  { type: EnneagramType.Type5, questions: type5 },
  { type: EnneagramType.Type6, questions: type6 },
  { type: EnneagramType.Type7, questions: type7 },
  { type: EnneagramType.Type8, questions: type8 },
  { type: EnneagramType.Type9, questions: type9 },
];

const all = combine(items);

export const getSample = (gender: Gender, size: number) =>
  sample(items, all, size);

const getQuestionByIndex = (order: number[], index: number) => all[order[index]];

export const getQuestion = (user: IUserData, index: number) =>
  getQuestionByIndex(user.order, index);

