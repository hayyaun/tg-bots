import apollo from "./deities/apollo.json";
import ares from "./deities/ares.json";
import dionysus from "./deities/dionysus.json";
import hades from "./deities/hades.json";
import hephaestus from "./deities/hephaestus.json";
import hermes from "./deities/hermes.json";
import poseidon from "./deities/poseidon.json";
import zeus from "./deities/zeus.json";
import { Deity, IQuest } from "./types";

export const male: IQuest[] = [
  { deity: Deity.Zeus, questions: zeus },
  { deity: Deity.Hades, questions: hades },
  { deity: Deity.Apollo, questions: apollo },
  { deity: Deity.Ares, questions: ares },
  { deity: Deity.Dionysus, questions: dionysus },
  { deity: Deity.Hermes, questions: hermes },
  { deity: Deity.Hephaestus, questions: hephaestus },
  { deity: Deity.Poseidon, questions: poseidon },
]
  .map(({ deity, questions }) =>
    questions.map((q) => ({ deity, text: q }) as IQuest)
  )
  .flat();

export const female: IQuest[] = [];
