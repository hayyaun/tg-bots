import { getWithPrefix, setWithPrefix } from "../redis";
import { QuizType } from "./types";

const REDIS_PREFIX = "inmankist";
const QUIZ_RESULT_TTL = 48 * 60 * 60; // 48 hours in seconds

// Store quiz result in Redis
export async function storeQuizResult(
  userId: number,
  quizType: QuizType,
  result: unknown
): Promise<void> {
  const key = `quizresult:${userId}:${quizType}`;
  await setWithPrefix(REDIS_PREFIX, key, JSON.stringify(result), QUIZ_RESULT_TTL);
}

// Get quiz result from Redis
export async function getQuizResult<T>(
  userId: number,
  quizType: QuizType
): Promise<T | null> {
  const key = `quizresult:${userId}:${quizType}`;
  const data = await getWithPrefix(REDIS_PREFIX, key);
  if (!data) {
    return null;
  }
  return JSON.parse(data) as T;
}

