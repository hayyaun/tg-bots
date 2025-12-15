export enum MBTIType {
  INTJ = "intj",
  INTP = "intp",
  ENTJ = "entj",
  ENTP = "entp",
  INFJ = "infj",
  INFP = "infp",
  ENFJ = "enfj",
  ENFP = "enfp",
  ISTJ = "istj",
  ISFJ = "isfj",
  ESTJ = "estj",
  ESFJ = "esfj",
  ISTP = "istp",
  ISFP = "isfp",
  ESTP = "estp",
  ESFP = "esfp",
}

export enum Dimension {
  E = "E", // Extraversion
  I = "I", // Introversion
  S = "S", // Sensing
  N = "N", // Intuition
  T = "T", // Thinking
  F = "F", // Feeling
  J = "J", // Judging
  P = "P", // Perceiving
}

export interface MBTIResult {
  type: MBTIType;
  distribution: { dimension: string; percentage: number }[];
}

