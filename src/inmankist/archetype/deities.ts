import { readFileSync } from "fs";
import path from "path";
import { escapeMarkdownV2 } from "../../utils/string";
import { Deity } from "./types";

interface IDeity {
  name: string;
  about: string;
  image: Buffer<ArrayBufferLike>;
}

// Preload content
const getMarkdown = (name: string) =>
  escapeMarkdownV2(
    readFileSync(
      path.join(process.cwd(), `assets/deities-md/${name}.md`),
      "utf-8"
    )
  );

// Preloading images help decrease fs load
const getImage = (name: string) => {
  const filename = `${name}.jpg`;
  const imageBuffer = readFileSync(
    path.join(process.cwd(), `assets/deities/${filename}`)
  );
  return imageBuffer;
};

const deities: { [k: string]: IDeity } = {
  // male
  [Deity.Zeus]: {
    name: "زئوس ⚡",
    about: getMarkdown(Deity.Zeus),
    image: getImage(Deity.Zeus),
  },
  [Deity.Hades]: {
    name: "هادس 💀",
    about: getMarkdown(Deity.Hades),
    image: getImage(Deity.Hades),
  },
  [Deity.Apollo]: {
    name: "آپولو ☀️",
    about: getMarkdown(Deity.Apollo),
    image: getImage(Deity.Apollo),
  },
  [Deity.Ares]: {
    name: "آرس 🗡️",
    about: getMarkdown(Deity.Ares),
    image: getImage(Deity.Ares),
  },
  [Deity.Dionysus]: {
    name: "دیونوس 🍷",
    about: getMarkdown(Deity.Dionysus),
    image: getImage(Deity.Dionysus),
  },
  [Deity.Hermes]: {
    name: "هرمس 🏃‍♂️",
    about: getMarkdown(Deity.Hermes),
    image: getImage(Deity.Hermes),
  },
  [Deity.Hephaestus]: {
    name: "هفائستوس 🔥",
    about: getMarkdown(Deity.Hephaestus),
    image: getImage(Deity.Hephaestus),
  },
  [Deity.Poseidon]: {
    name: "پوزایدن 🌊",
    about: getMarkdown(Deity.Poseidon),
    image: getImage(Deity.Poseidon),
  },
  // female
  [Deity.Hera]: {
    name: "هرا 👑",
    about: getMarkdown(Deity.Hera),
    image: getImage(Deity.Hera),
  },
  [Deity.Demeter]: {
    name: "دیمیتر 🌾",
    about: getMarkdown(Deity.Demeter),
    image: getImage(Deity.Demeter),
  },
  [Deity.Persephone]: {
    name: "پرسیفون 🌺",
    about: getMarkdown(Deity.Persephone),
    image: getImage(Deity.Persephone),
  },
  [Deity.Artemis]: {
    name: "آرتمیس 🌙",
    about: getMarkdown(Deity.Artemis),
    image: getImage(Deity.Artemis),
  },
  [Deity.Athena]: {
    name: "آتنا 🦉",
    about: getMarkdown(Deity.Athena),
    image: getImage(Deity.Athena),
  },
  [Deity.Aphrodite]: {
    name: "آفرودیت 💋",
    about: getMarkdown(Deity.Aphrodite),
    image: getImage(Deity.Aphrodite),
  },
  [Deity.Hestia]: {
    name: "هستیا 🏡",
    about: getMarkdown(Deity.Hestia),
    image: getImage(Deity.Hestia),
  },
};

export default deities;
