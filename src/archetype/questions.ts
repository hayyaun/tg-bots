import _ from "lodash";
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
import { Deity, IQuest } from "./types";

const SAMPLE_SIZE = 5;

interface IListItem {
  deity: Deity;
  questions: string[];
}

const combine = (items: IListItem[]) =>
  _.shuffle(
    items
      .map(({ deity, questions }) =>
        _.sampleSize(questions, SAMPLE_SIZE).map(
          (q) => ({ deity, text: q }) as IQuest
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

export const maleSize = maleItems.length * SAMPLE_SIZE;

export const male = combine(maleItems);

const femaleItems = [
  { deity: Deity.Hera, questions: hera },
  { deity: Deity.Demeter, questions: demeter },
  { deity: Deity.Persephone, questions: persephone },
  { deity: Deity.Artemis, questions: artemis },
  { deity: Deity.Athena, questions: athena },
  { deity: Deity.Aphrodite, questions: aphrodite },
  { deity: Deity.Hestia, questions: hestia },
];

export const femaleSize = femaleItems.length * SAMPLE_SIZE;

export const female = combine(femaleItems);
