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
    const parsed = JSON.parse(cached) as MatchUser[];
    // Convert Date strings back to Date objects
    return parsed.map((match) => ({
      ...match,
      birth_date: match.birth_date ? new Date(match.birth_date) : null,
      last_online: match.last_online ? new Date(match.last_online) : null,
      created_at: new Date(match.created_at),
      updated_at: new Date(match.updated_at),
    }));
  } catch {
    return null;
  }
}

/**
 * Cache match results for a user
 */
export async function cacheMatches(userId: bigint, matches: MatchUser[]): Promise<void> {
  // Convert BigInt values to strings and handle Date serialization
  const serializable = matches.map((match) => {
    const serialized: any = { ...match };
    // Remove any BigInt fields (like id) that might be present
    if ('id' in serialized && typeof serialized.id === 'bigint') {
      delete serialized.id;
    }
    // Dates are automatically serialized by JSON.stringify, but we ensure they're Date objects
    return serialized;
  });

  await setWithPrefix(
    BOT_PREFIX,
    `matches:${userId.toString()}`,
    JSON.stringify(serializable, (key, value) => {
      // Convert BigInt to string if encountered
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }),
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

