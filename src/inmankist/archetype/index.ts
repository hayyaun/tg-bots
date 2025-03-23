import { configDotenv } from "dotenv";
import _ from "lodash";
import { Gender, IQuest } from "../types";
import aphrodite from "./female/aphrodite.json";
import artemis from "./female/artemis.json";
import athena from "./female/athena.json";
import demeter from "./female/demeter.json";
import hera from "./female/hera.json";
import hestia from "./female/hestia.json";
import persephone from "./female/persephone.json";
import apollo from "./male/apollo.json";
import ares from "./male/ares.json";
import dionysus from "./male/dionysus.json";
import hades from "./male/hades.json";
import hephaestus from "./male/hephaestus.json";
import hermes from "./male/hermes.json";
import poseidon from "./male/poseidon.json";
import zeus from "./male/zeus.json";
import { Deity } from "./types";

configDotenv();

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

export const getQuestion = (order: number[], index: number, gender: Gender) =>
  (gender === Gender.male ? male : female)[order[index]];
