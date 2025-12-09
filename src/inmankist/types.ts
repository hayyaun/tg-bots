export enum QuizType {
  Archetype = "archetype",
  MBTI = "mbti",
  LeftRight = "leftright",
  PoliticalCompass = "politicalcompass",
  Enneagram = "enneagram",
  Vision = "vision",
  BigFive = "bigfive",
}

export enum QuizMode {
  SM,
  MD,
  LG,
}

export enum Value {
  A = 0,
  B,
  C,
  D,
}

export interface IUserData {
  welcomeId?: number;
  date: number;
  gender: Gender;
  answers: { [i: number]: Value };
  order: number[];
  quiz: QuizType;
  mode: QuizMode;
  language?: Language;
}

export interface IQuest<T> {
  text: string;
  belong: T;
}

export enum Gender {
  male = "male",
  female = "female",
}

export enum Language {
  Persian = "fa",
  English = "en",
  Russian = "ru",
  Arabic = "ar",
}

export interface IScore<T> {
  value: number;
  belog: T;
}
