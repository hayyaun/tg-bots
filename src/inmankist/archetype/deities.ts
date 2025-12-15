import { readFileSync } from "fs";
import path from "path";
import { escapeMarkdownV2 } from "../../utils/string";
import { Language } from "../../shared/types";
import { Deity } from "./types";

interface IDeity {
  name: { [key in Language]: string };
  about: { [key in Language]: string };
  image: Buffer<ArrayBufferLike>;
}

// Preload content by language
const getMarkdown = (name: string, language: Language) => {
  const langDir = language === Language.Persian ? "fa" : language === Language.English ? "en" : language === Language.Russian ? "ru" : "ar";
  try {
    return escapeMarkdownV2(
      readFileSync(
        path.join(process.cwd(), `assets/deities-md/${langDir}/${name}.md`),
        "utf-8"
      )
    );
  } catch {
    // Fallback to English if translation not available
    try {
      return escapeMarkdownV2(
        readFileSync(
          path.join(process.cwd(), `assets/deities-md/en/${name}.md`),
          "utf-8"
        )
      );
    } catch {
      // Final fallback to Persian
      return escapeMarkdownV2(
        readFileSync(
          path.join(process.cwd(), `assets/deities-md/fa/${name}.md`),
          "utf-8"
        )
      );
    }
  }
};

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
    name: {
      [Language.Persian]: "زئوس ⚡",
      [Language.English]: "Zeus ⚡",
      [Language.Russian]: "Зевс ⚡",
      [Language.Arabic]: "زيوس ⚡",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Zeus, Language.Persian),
      [Language.English]: getMarkdown(Deity.Zeus, Language.English),
      [Language.Russian]: getMarkdown(Deity.Zeus, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Zeus, Language.Arabic),
    },
    image: getImage(Deity.Zeus),
  },
  [Deity.Hades]: {
    name: {
      [Language.Persian]: "هادس 💀",
      [Language.English]: "Hades 💀",
      [Language.Russian]: "Аид 💀",
      [Language.Arabic]: "هاديس 💀",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Hades, Language.Persian),
      [Language.English]: getMarkdown(Deity.Hades, Language.English),
      [Language.Russian]: getMarkdown(Deity.Hades, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Hades, Language.Arabic),
    },
    image: getImage(Deity.Hades),
  },
  [Deity.Apollo]: {
    name: {
      [Language.Persian]: "آپولو ☀️",
      [Language.English]: "Apollo ☀️",
      [Language.Russian]: "Аполлон ☀️",
      [Language.Arabic]: "أبولو ☀️",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Apollo, Language.Persian),
      [Language.English]: getMarkdown(Deity.Apollo, Language.English),
      [Language.Russian]: getMarkdown(Deity.Apollo, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Apollo, Language.Arabic),
    },
    image: getImage(Deity.Apollo),
  },
  [Deity.Ares]: {
    name: {
      [Language.Persian]: "آرس 🗡️",
      [Language.English]: "Ares 🗡️",
      [Language.Russian]: "Арес 🗡️",
      [Language.Arabic]: "آريس 🗡️",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Ares, Language.Persian),
      [Language.English]: getMarkdown(Deity.Ares, Language.English),
      [Language.Russian]: getMarkdown(Deity.Ares, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Ares, Language.Arabic),
    },
    image: getImage(Deity.Ares),
  },
  [Deity.Dionysus]: {
    name: {
      [Language.Persian]: "دیونوس 🍷",
      [Language.English]: "Dionysus 🍷",
      [Language.Russian]: "Дионис 🍷",
      [Language.Arabic]: "ديونيسوس 🍷",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Dionysus, Language.Persian),
      [Language.English]: getMarkdown(Deity.Dionysus, Language.English),
      [Language.Russian]: getMarkdown(Deity.Dionysus, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Dionysus, Language.Arabic),
    },
    image: getImage(Deity.Dionysus),
  },
  [Deity.Hermes]: {
    name: {
      [Language.Persian]: "هرمس 🏃‍♂️",
      [Language.English]: "Hermes 🏃‍♂️",
      [Language.Russian]: "Гермес 🏃‍♂️",
      [Language.Arabic]: "هيرميس 🏃‍♂️",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Hermes, Language.Persian),
      [Language.English]: getMarkdown(Deity.Hermes, Language.English),
      [Language.Russian]: getMarkdown(Deity.Hermes, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Hermes, Language.Arabic),
    },
    image: getImage(Deity.Hermes),
  },
  [Deity.Hephaestus]: {
    name: {
      [Language.Persian]: "هفائستوس 🔥",
      [Language.English]: "Hephaestus 🔥",
      [Language.Russian]: "Гефест 🔥",
      [Language.Arabic]: "هيفايستوس 🔥",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Hephaestus, Language.Persian),
      [Language.English]: getMarkdown(Deity.Hephaestus, Language.English),
      [Language.Russian]: getMarkdown(Deity.Hephaestus, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Hephaestus, Language.Arabic),
    },
    image: getImage(Deity.Hephaestus),
  },
  [Deity.Poseidon]: {
    name: {
      [Language.Persian]: "پوزایدن 🌊",
      [Language.English]: "Poseidon 🌊",
      [Language.Russian]: "Посейдон 🌊",
      [Language.Arabic]: "بوسيدون 🌊",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Poseidon, Language.Persian),
      [Language.English]: getMarkdown(Deity.Poseidon, Language.English),
      [Language.Russian]: getMarkdown(Deity.Poseidon, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Poseidon, Language.Arabic),
    },
    image: getImage(Deity.Poseidon),
  },
  // female
  [Deity.Hera]: {
    name: {
      [Language.Persian]: "هرا 👑",
      [Language.English]: "Hera 👑",
      [Language.Russian]: "Гера 👑",
      [Language.Arabic]: "هيرا 👑",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Hera, Language.Persian),
      [Language.English]: getMarkdown(Deity.Hera, Language.English),
      [Language.Russian]: getMarkdown(Deity.Hera, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Hera, Language.Arabic),
    },
    image: getImage(Deity.Hera),
  },
  [Deity.Demeter]: {
    name: {
      [Language.Persian]: "دیمیتر 🌾",
      [Language.English]: "Demeter 🌾",
      [Language.Russian]: "Деметра 🌾",
      [Language.Arabic]: "ديميتر 🌾",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Demeter, Language.Persian),
      [Language.English]: getMarkdown(Deity.Demeter, Language.English),
      [Language.Russian]: getMarkdown(Deity.Demeter, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Demeter, Language.Arabic),
    },
    image: getImage(Deity.Demeter),
  },
  [Deity.Persephone]: {
    name: {
      [Language.Persian]: "پرسیفون 🌺",
      [Language.English]: "Persephone 🌺",
      [Language.Russian]: "Персефона 🌺",
      [Language.Arabic]: "بيرسيفوني 🌺",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Persephone, Language.Persian),
      [Language.English]: getMarkdown(Deity.Persephone, Language.English),
      [Language.Russian]: getMarkdown(Deity.Persephone, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Persephone, Language.Arabic),
    },
    image: getImage(Deity.Persephone),
  },
  [Deity.Artemis]: {
    name: {
      [Language.Persian]: "آرتمیس 🌙",
      [Language.English]: "Artemis 🌙",
      [Language.Russian]: "Артемида 🌙",
      [Language.Arabic]: "أرتميس 🌙",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Artemis, Language.Persian),
      [Language.English]: getMarkdown(Deity.Artemis, Language.English),
      [Language.Russian]: getMarkdown(Deity.Artemis, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Artemis, Language.Arabic),
    },
    image: getImage(Deity.Artemis),
  },
  [Deity.Athena]: {
    name: {
      [Language.Persian]: "آتنا 🦉",
      [Language.English]: "Athena 🦉",
      [Language.Russian]: "Афина 🦉",
      [Language.Arabic]: "أثينا 🦉",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Athena, Language.Persian),
      [Language.English]: getMarkdown(Deity.Athena, Language.English),
      [Language.Russian]: getMarkdown(Deity.Athena, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Athena, Language.Arabic),
    },
    image: getImage(Deity.Athena),
  },
  [Deity.Aphrodite]: {
    name: {
      [Language.Persian]: "آفرودیت 💋",
      [Language.English]: "Aphrodite 💋",
      [Language.Russian]: "Афродита 💋",
      [Language.Arabic]: "أفروديت 💋",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Aphrodite, Language.Persian),
      [Language.English]: getMarkdown(Deity.Aphrodite, Language.English),
      [Language.Russian]: getMarkdown(Deity.Aphrodite, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Aphrodite, Language.Arabic),
    },
    image: getImage(Deity.Aphrodite),
  },
  [Deity.Hestia]: {
    name: {
      [Language.Persian]: "هستیا 🏡",
      [Language.English]: "Hestia 🏡",
      [Language.Russian]: "Гестия 🏡",
      [Language.Arabic]: "هيستيا 🏡",
    },
    about: {
      [Language.Persian]: getMarkdown(Deity.Hestia, Language.Persian),
      [Language.English]: getMarkdown(Deity.Hestia, Language.English),
      [Language.Russian]: getMarkdown(Deity.Hestia, Language.Russian),
      [Language.Arabic]: getMarkdown(Deity.Hestia, Language.Arabic),
    },
    image: getImage(Deity.Hestia),
  },
};

export default deities;
