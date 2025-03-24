import _ from "lodash";
import { Gender, IQuest, IUserData } from "../types";
import aphrodite from "./json/aphrodite.json";
import apollo from "./json/apollo.json";
import ares from "./json/ares.json";
import artemis from "./json/artemis.json";
import athena from "./json/athena.json";
import demeter from "./json/demeter.json";
import dionysus from "./json/dionysus.json";
import hades from "./json/hades.json";
import hephaestus from "./json/hephaestus.json";
import hera from "./json/hera.json";
import hermes from "./json/hermes.json";
import hestia from "./json/hestia.json";
import persephone from "./json/persephone.json";
import poseidon from "./json/poseidon.json";
import zeus from "./json/zeus.json";
import { Deity } from "./types";

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

const maleItems = [
  { deity: Deity.Zeus, questions: zeus },
  { deity: Deity.Hades, questions: hades },
  { deity: Deity.Apollo, questions: apollo },
  { deity: Deity.Ares, questions: ares },
  { deity: Deity.Dionysus, questions: dionysus },
  { deity: Deity.Hermes, questions: hermes },
  { deity: Deity.Hephaestus, questions: hephaestus },
  { deity: Deity.Poseidon, questions: poseidon },
];

const femaleItems = [
  { deity: Deity.Hera, questions: hera },
  { deity: Deity.Demeter, questions: demeter },
  { deity: Deity.Persephone, questions: persephone },
  { deity: Deity.Artemis, questions: artemis },
  { deity: Deity.Athena, questions: athena },
  { deity: Deity.Aphrodite, questions: aphrodite },
  { deity: Deity.Hestia, questions: hestia },
];

const male = combine(maleItems);
const female = combine(femaleItems);

export const getSample = (gender: Gender, size: number) =>
  sample(
    gender === Gender.male ? maleItems : femaleItems,
    gender === Gender.male ? male : female,
    size
  );

const getQuestionByIndex = (order: number[], index: number, gender: Gender) =>
  (gender === Gender.male ? male : female)[order[index]];

export const getQuestion = (user: IUserData, index: number) =>
  getQuestionByIndex(user.order, index, user.gender);
