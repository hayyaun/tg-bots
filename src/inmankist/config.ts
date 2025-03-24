import { QuizMode, QuizType } from "./types";

export const quizTypes: { [k: string]: string } = {
  [QuizType.Archetype]: "آزمون کهن الگوها",
};

const SAMPLE_SIZE_SM = process.env.DEV ? 1 : 5;
const SAMPLE_SIZE_MD = 15;
const SAMPLE_SIZE_LG = 25;

export const quizModes: { [k: number]: { name: string; size: number } } = {
  [QuizMode.SM]: { name: "سریع", size: SAMPLE_SIZE_SM },
  [QuizMode.MD]: { name: "عادی", size: SAMPLE_SIZE_MD },
  [QuizMode.LG]: { name: "کامل", size: SAMPLE_SIZE_LG },
};
