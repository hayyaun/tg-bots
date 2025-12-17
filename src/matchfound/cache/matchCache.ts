import { getWithPrefix, setWithPrefix, delWithPrefix } from "../../redis";
import { BOT_PREFIX } from "../constants";
import { MatchUser } from "../types";

// Cache TTL for match results (5 minutes)
const MATCH_CACHE_TTL = 300;

/**
 * Get cached match results for a user
 */
export async function getCachedMatches(userId: bigint): Promise<MatchUser[] | null> {
  const cached = await getWithPrefix(
    BOT_PREFIX,
    `matches:${userId.toString()}`
  );
  if (!cached) return null;

  try {
    return JSON.parse(cached) as MatchUser[];
  } catch {
    return null;
  }
}

/**
 * Cache match results for a user
 */
export async function cacheMatches(userId: bigint, matches: MatchUser[]): Promise<void> {
  await setWithPrefix(
    BOT_PREFIX,
    `matches:${userId.toString()}`,
    JSON.stringify(matches),
    MATCH_CACHE_TTL
  );
}

/**
 * Invalidate match cache for a user
 * Call this when a user likes or ignores someone, or when their profile changes
 */
export async function invalidateMatchCache(userId: bigint): Promise<void> {
  await delWithPrefix(BOT_PREFIX, `matches:${userId.toString()}`);
}

/**
 * Invalidate match cache for multiple users
 */
export async function invalidateMatchCacheForUsers(userIds: bigint[]): Promise<void> {
  const promises = userIds.map((userId) =>
    delWithPrefix(BOT_PREFIX, `matches:${userId.toString()}`)
  );
  await Promise.all(promises);
}

