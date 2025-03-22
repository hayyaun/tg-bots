import { Deity } from "./types";

export default {
  welcome: [
    "به ربات تلگرام «این من کیست؟» خوش آمدید!",
    "",
    "برای شروع آزمون کهن الگو ها",
    "لطفا جنسیت خود را مشخص کنید",
  ].join("\n"),
  start_btn: "شروع آزمون",
  help_btn: "راهنما",
  help: ["لطفا برای شروع روی دکمه آغاز آزمون بزنید"].join("\n"),
  got_it: "متوجه شدم!",
  values: ["اصلا", "نه زیاد", "حدودا", "کاملا"],
  done: "🎉 خسته نباشید!",
  man0: "مرد بی حوصله",
  man1: "مرد با حوصله",
  female0: "زن بی حوصله",
  female1: "زن با حوصله",
};

export const deities: { [k: string]: string } = {
  // male
  [Deity.Zeus]: "زئوس ⚡",
  [Deity.Hades]: "هادس 💀",
  [Deity.Apollo]: "آپولو ☀️",
  [Deity.Ares]: "آرس 🗡️",
  [Deity.Dionysus]: "دیونوس 🍷",
  [Deity.Hermes]: "هرمس 🏃‍♂️",
  [Deity.Hephaestus]: "هفائستوس 🔥",
  [Deity.Poseidon]: "پوزایدن 🌊",
  // female
  [Deity.Hera]: "هرا 👑",
  [Deity.Demeter]: "دیمیتر 🌾",
  [Deity.Persephone]: "پرسیفون 🌺",
  [Deity.Artemis]: "آرتمیس 🌙",
  [Deity.Athena]: "آتنا 🦉",
  [Deity.Aphrodite]: "آفرودیت 💋",
  [Deity.Hestia]: "هستیا 🏡",
};
