import { getWithPrefix, setWithPrefix, delWithPrefix } from "../../redis";

const CACHE_PREFIX = "matchfound";
const EXCLUSION_CACHE_TTL = 3600; // 1 hour cache TTL

interface ExclusionCounts {
  likesGiven: number;
  ignoredBy: number;
  ignoredByUser: number;
  total: number;
}

/**
 * Get cached exclusion counts for a user
 * Returns null if not cached or cache expired
 */
export async function getCachedExclusionCounts(
  userId: bigint
): Promise<ExclusionCounts | null> {
  const cached = await getWithPrefix(
    CACHE_PREFIX,
    `exclusions:${userId.toString()}`
  );
  if (!cached) return null;

  try {
    return JSON.parse(cached) as ExclusionCounts;
  } catch {
    return null;
  }
}

/**
 * Cache exclusion counts for a user
 */
export async function cacheExclusionCounts(
  userId: bigint,
  counts: ExclusionCounts
): Promise<void> {
  await setWithPrefix(
    CACHE_PREFIX,
    `exclusions:${userId.toString()}`,
    JSON.stringify(counts),
    EXCLUSION_CACHE_TTL
  );
}

/**
 * Invalidate exclusion cache for a user
 * Call this when a user likes or ignores someone, or when someone ignores them
 */
export async function invalidateExclusionCache(userId: bigint): Promise<void> {
  await delWithPrefix(CACHE_PREFIX, `exclusions:${userId.toString()}`);
}

/**
 * Invalidate exclusion cache for multiple users
 * Useful when a like/ignore affects multiple users' exclusion lists
 */
export async function invalidateExclusionCacheForUsers(
  userIds: bigint[]
): Promise<void> {
  const promises = userIds.map((userId) =>
    delWithPrefix(CACHE_PREFIX, `exclusions:${userId.toString()}`)
  );
  await Promise.all(promises);
}

