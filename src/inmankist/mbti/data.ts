import _ from "lodash";
import { Gender, IQuest, IUserData } from "../types";
import E from "./json/E.json";
import F from "./json/F.json";
import I from "./json/I.json";
import J from "./json/J.json";
import N from "./json/N.json";
import P from "./json/P.json";
import S from "./json/S.json";
import T from "./json/T.json";
import { Dimension } from "./types";

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

// MBTI dimensions are gender-neutral, so we use the same questions for all
const items = [
  { dimension: Dimension.E, questions: E },
  { dimension: Dimension.I, questions: I },
  { dimension: Dimension.S, questions: S },
  { dimension: Dimension.N, questions: N },
  { dimension: Dimension.T, questions: T },
  { dimension: Dimension.F, questions: F },
  { dimension: Dimension.J, questions: J },
  { dimension: Dimension.P, questions: P },
];

const all = combine(items);

export const getSample = (gender: Gender, size: number) =>
  sample(items, all, size);

const getQuestionByIndex = (order: number[], index: number) => all[order[index]];

export const getQuestion = (user: IUserData, index: number) =>
  getQuestionByIndex(user.order, index);

