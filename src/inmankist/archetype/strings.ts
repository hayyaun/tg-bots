import { readFileSync } from "fs";
import { resolve } from "path";
import { escapeMarkdownV2 } from "../../utils/string";
import { Deity } from "./types";

interface IDeity {
  name: string;
  about: string;
}

const get = (name: string) =>
  escapeMarkdownV2(
    readFileSync(resolve(__dirname, `./md/${name}.md`), "utf-8")
  );

export const deities: { [k: string]: IDeity } = {
  // male
  [Deity.Zeus]: { name: "زئوس ⚡", about: get(Deity.Zeus) },
  [Deity.Hades]: { name: "هادس 💀", about: get(Deity.Hades) },
  [Deity.Apollo]: { name: "آپولو ☀️", about: get(Deity.Apollo) },
  [Deity.Ares]: { name: "آرس 🗡️", about: get(Deity.Ares) },
  [Deity.Dionysus]: { name: "دیونوس 🍷", about: get(Deity.Dionysus) },
  [Deity.Hermes]: { name: "هرمس 🏃‍♂️", about: get(Deity.Hermes) },
  [Deity.Hephaestus]: { name: "هفائستوس 🔥", about: get(Deity.Hephaestus) },
  [Deity.Poseidon]: { name: "پوزایدن 🌊", about: get(Deity.Poseidon) },
  // female
  [Deity.Hera]: { name: "هرا 👑", about: get(Deity.Hera) },
  [Deity.Demeter]: { name: "دیمیتر 🌾", about: get(Deity.Demeter) },
  [Deity.Persephone]: { name: "پرسیفون 🌺", about: get(Deity.Persephone) },
  [Deity.Artemis]: { name: "آرتمیس 🌙", about: get(Deity.Artemis) },
  [Deity.Athena]: { name: "آتنا 🦉", about: get(Deity.Athena) },
  [Deity.Aphrodite]: { name: "آفرودیت 💋", about: get(Deity.Aphrodite) },
  [Deity.Hestia]: { name: "هستیا 🏡", about: get(Deity.Hestia) },
};
