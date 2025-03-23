export enum QuizType {
  Archetype = "archetype",
}

export enum Value {
  A = 0,
  B,
  C,
  D,
}

export interface IUserData {
  date: number;
  gender: Gender;
  answers: { [i: number]: Value };
  order: number[];
  quiz: QuizType;
  sampleSize: number;
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
