// Archetype compatibility matrix (from COMPLEMENTARY_MATRIX.md)
export const archetypeCompatibility: Record<string, string[]> = {
  // Goddesses
  hera: ["zeus", "apollo"],
  demeter: ["zeus", "hades"],
  persephone: ["hades", "hermes"],
  artemis: ["ares", "hermes"],
  athena: ["zeus", "hephaestus"],
  aphrodite: ["ares", "hermes"],
  hestia: ["hephaestus", "poseidon"],
  
  // Gods
  zeus: ["hera", "aphrodite"],
  hades: ["persephone", "hestia"],
  apollo: ["athena", "aphrodite"],
  ares: ["aphrodite", "artemis"],
  dionysus: ["persephone", "aphrodite"],
  hermes: ["athena", "aphrodite"],
  hephaestus: ["hestia", "aphrodite"],
  poseidon: ["persephone", "demeter"],
};

// MBTI compatibility matrix (from COMPLEMENTARY_MATRIX.md)
export const mbtiCompatibility: Record<string, string[]> = {
  ENFP: ["INTJ", "INFJ", "ISFJ"],
  ENTP: ["INFJ", "INTJ", "ISFJ"],
  ENFJ: ["INFP", "INTP", "ISFP"],
  ENTJ: ["INFP", "ISFP", "INTP"],
  INFP: ["ENTJ", "ENFJ", "ESTJ"],
  INTP: ["ENTJ", "ENFJ", "ESFJ"],
  INFJ: ["ENTP", "ENFP", "ESTP"],
  INTJ: ["ENFP", "ENTP", "ESFP"],
  ISFP: ["ENTJ", "ENFJ", "ESTJ"],
  ISFJ: ["ENFP", "ENTP", "ESFP"],
  ISTP: ["ESFJ", "ESTJ", "ENFJ"],
  ISTJ: ["ESFP", "ESTP", "ENFP"],
  ESFP: ["ISTJ", "ISFJ", "INTJ"],
  ESFJ: ["ISTP", "ISFP", "INTP"],
  ESTP: ["ISFJ", "ISTJ", "INFJ"],
  ESTJ: ["ISFP", "INFP", "ISTP"],
};

export const BOT_NAME = "MatchFound";

// Interests limits
export const MIN_INTERESTS = 5;
export const MAX_INTERESTS = 15;
export const MIN_COMPLETION_THRESHOLD = 7;

// Age limits
export const MIN_AGE = 18;
export const MAX_AGE = 120;
export const MAX_AGE_DIFFERENCE = 8; // Maximum age difference for matching

// Compatibility scoring weights (percentages)
export const ARCHETYPE_MATCH_SCORE = 40;
export const MBTI_MATCH_SCORE = 40;
export const MAX_INTERESTS_SCORE = 20;
export const MAX_AGE_BONUS = 10;
export const MAX_COMPLETION_BONUS = 10;
export const MAX_COMPATIBILITY_SCORE = 100;

// Field limits
export const MAX_DISPLAY_NAME_LENGTH = 100;

// Rate limiting
export const FIND_RATE_LIMIT_MS = 3600000; // 1 hour in milliseconds

// Pagination
export const ITEMS_PER_PAGE = 20;
