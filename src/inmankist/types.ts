export enum QuizType {
  Archetype = "archetype",
  MBTI = "mbti",
  LeftRight = "leftright",
  PoliticalCompass = "politicalcompass",
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
}

export interface IQuest<T> {
  text: string;
  belong: T;
}

export enum Gender {
  male = "male",
  female = "female",
}

export interface IScore<T> {
  value: number;
  belog: T;
}
