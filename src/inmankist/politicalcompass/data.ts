import _ from "lodash";
import { Gender, IQuest, IUserData } from "../types";
import authoritarian from "./json/authoritarian.json";
import economicLeft from "./json/economic_left.json";
import economicRight from "./json/economic_right.json";
import libertarian from "./json/libertarian.json";
import { PoliticalAxis } from "./types";

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

// Political views are gender-neutral
const items = [
  { axis: PoliticalAxis.EconomicLeft, questions: economicLeft },
  { axis: PoliticalAxis.EconomicRight, questions: economicRight },
  { axis: PoliticalAxis.Authoritarian, questions: authoritarian },
  { axis: PoliticalAxis.Libertarian, questions: libertarian },
];

const all = combine(items);

export const getSample = (gender: Gender, size: number) =>
  sample(items, all, size);

const getQuestionByIndex = (order: number[], index: number) => all[order[index]];

export const getQuestion = (user: IUserData, index: number) =>
  getQuestionByIndex(user.order, index);

