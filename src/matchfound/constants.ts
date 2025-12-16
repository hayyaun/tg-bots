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
export const BOT_PREFIX = "matchfound";

// Rate limiting
export const FIND_RATE_LIMIT_MS = 3600000; // 1 hour in milliseconds
export const FIND_RATE_LIMIT_SECONDS = Math.floor(FIND_RATE_LIMIT_MS / 1000); // Convert to seconds for Redis TTL

