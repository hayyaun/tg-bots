export enum Value {
  A = 0,
  B,
  C,
  D,
}

export interface IQuest {
  text: string;
  deity: Deity;
}

export enum Gender {
  male = "male",
  female = "female",
}

export interface IScore {
  value: number;
  deity: Deity;
}

export interface IUserData {
  date: number;
  gender: Gender;
  answers: { [i: number]: Value };
}

export enum Deity {
  // male
  Zeus = "زئوس ⚡",
  Hades = "هادس 💀",
  Apollo = "آپولو ☀️",
  Ares = "آرس 🗡️",
  Dionysus = "دیونوس 🍷",
  Hermes = "هرمس 🏃‍♂️",
  Hephaestus = "هفائستوس 🔥",
  Poseidon = "پوزایدن 🌊",
  // female
  Hera = "هرا 👑",
  Demeter = "دیمیتر 🌾",
  Persephone = "پرسیفون 🌺",
  Artemis = "آرتمیس 🌙",
  Athena = "آتنا 🦉",
  Aphrodite = "آفرودیت 💋",
  Hestia = "هستیا 🏡",
}
