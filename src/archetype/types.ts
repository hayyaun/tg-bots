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
  Zeus = "zeus",
  Hades = "hades",
  Apollo = "apollo",
  Ares = "ares",
  Dionysus = "dionysus",
  Hermes = "hermes",
  Hephaestus = "hephaestus",
  Poseidon = "poseidon",
  // female
  Hera = "hera",
  Demeter = "demeter",
  Persephone = "persephone",
  Artemis = "artemis",
  Athena = "athena",
  Aphrodite = "aphrodite",
  Hestia = "hestia",
}
