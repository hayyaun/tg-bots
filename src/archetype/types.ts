export enum Value {
  A,
  B,
  C,
  D,
}

export interface IQuest {
  text: string;
  deity: Deity;
}

export enum Gender {
  male,
  female,
}

export interface IScore {
  value: number;
  deity: Deity;
}

export interface IUserData {
  date: number;
  gender: Gender;
  answers: { [i: number]: Value };
  // current: number;
}

export enum Deity {
  // male
  Zeus = "Zeus ⚡",
  Hades = "Hades 💀",
  Apollo = "Apollo ☀️",
  Ares = "Ares 🗡️",
  Dionysus = "Dionysus 🍷",
  Hermes = "Hermes 🏃‍♂️",
  Hephaestus = "Hephaestus 🔥",
  Poseidon = "Poseidon 🌊",
  // female
  Hera = "Hera 👑",
  Demeter = "Demeter 🌾",
  Persephone = "Persephone 🌺",
  Artemis = "Artemis 🌙",
  Athena = "Athena 🦉",
  Aphrodite = "Aphrodite 💋",
  Hestia = "Hestia 🏡",
}
