import _ from "lodash";
import { Gender, IQuest, IUserData } from "../types";
import left from "./json/left.json";
import right from "./json/right.json";
import { CognitiveStyle } from "./types";

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

// Cognitive styles are gender-neutral
const items = [
  { style: CognitiveStyle.Left, questions: left },
  { style: CognitiveStyle.Right, questions: right },
];

const all = combine(items);

export const getSample = (gender: Gender, size: number) =>
  sample(items, all, size);

const getQuestionByIndex = (order: number[], index: number) => all[order[index]];

export const getQuestion = (user: IUserData, index: number) =>
  getQuestionByIndex(user.order, index);

