import { prisma } from "../db";
import {
  MAX_AGE_DIFFERENCE,
  MAX_CANDIDATES_TO_FETCH,
  MAX_INTERESTS,
  MAX_MATCHES_TO_RETURN,
  MIN_COMPLETION_THRESHOLD,
  MIN_INTERESTS,
} from "../shared/constants";
import { getUserProfile, getUserProfileById } from "../shared/database";
import { cacheMatches, getCachedMatches } from "./cache/matchCache";
import { MatchUser } from "./types";
import { calculateMatchInfo, calculateCompatibilityScore } from "./helpers";
export {
  invalidateMatchCache,
  invalidateMatchCacheForUsers,
} from "./cache/matchCache";

export async function findMatches(
  userId: number | bigint
): Promise<MatchUser[]> {
  // userId can be either telegram_id (number) or id (bigint)
  // First, find the user to get their id
  let user;
  let userIdBigInt: bigint;

  if (typeof userId === "bigint") {
    // Already an id
    userIdBigInt = userId;
    user = await getUserProfileById(userId);
  } else {
    // telegram_id - find user first
    user = await getUserProfile(userId);
    if (!user) return [];
    // Get the actual user record to get the id
    const userRecord = await prisma.user.findUnique({
      where: { telegram_id: BigInt(userId) },
      select: { id: true },
    });
    if (!userRecord) return [];
    userIdBigInt = userRecord.id;
  }

  if (!user || !user.gender || !user.looking_for_gender) return [];

  // Check cache first
  const cached = await getCachedMatches(userIdBigInt);
  if (cached) {
    return cached;
  }

  const userAge = user.age;
  if (!userAge) return [];

  // Calculate age range for filtering
  const minAge = Math.max(18, userAge - MAX_AGE_DIFFERENCE); // Ensure minimum age of 18
  const maxAge = userAge + MAX_AGE_DIFFERENCE;

  // Use raw SQL query with NOT EXISTS subqueries for efficient exclusion checking
  // NOT EXISTS is typically faster than LEFT JOINs at scale, especially with proper indexes
  // Build the query conditionally based on gender preference
  let candidates: Array<{
    id: bigint;
    telegram_id: bigint | null;
    google_id: string | null;
    email: string | null;
    username: string | null;
    display_name: string | null;
    biography: string | null;
    age: number | null;
    gender: string | null;
    looking_for_gender: string | null;
    archetype_result: string | null;
    mbti_result: string | null;
    leftright_result: string | null;
    politicalcompass_result: string | null;
    enneagram_result: string | null;
    bigfive_result: string | null;
    profile_image: string | null;
    mood: string | null;
    interests: string[];
    location: string | null;
    language: string | null;
    completion_score: number;
    last_online: Date | null;
    created_at: Date;
    updated_at: Date;
  }>;

  if (user.looking_for_gender === "both") {
    candidates = await prisma.$queryRaw`
      SELECT u.*
      FROM users u
      WHERE u.id != ${userIdBigInt}
        AND u.completion_score >= ${MIN_COMPLETION_THRESHOLD}
        AND u.username IS NOT NULL
        AND u.gender IS NOT NULL
        AND u.age IS NOT NULL
        AND u.age >= ${minAge}
        AND u.age <= ${maxAge}
        AND array_length(u.interests, 1) > 0
        AND u.gender IN ('male', 'female')
        AND NOT EXISTS (
          SELECT 1 FROM likes 
          WHERE user_id = ${userIdBigInt} AND liked_user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM ignored 
          WHERE ignored_user_id = ${userIdBigInt} AND user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM ignored 
          WHERE user_id = ${userIdBigInt} AND ignored_user_id = u.id
        )
      ORDER BY u.completion_score DESC
      LIMIT ${MAX_CANDIDATES_TO_FETCH}
    `;
  } else {
    candidates = await prisma.$queryRaw`
      SELECT u.*
      FROM users u
      WHERE u.id != ${userIdBigInt}
        AND u.completion_score >= ${MIN_COMPLETION_THRESHOLD}
        AND u.username IS NOT NULL
        AND u.gender IS NOT NULL
        AND u.age IS NOT NULL
        AND u.age >= ${minAge}
        AND u.age <= ${maxAge}
        AND array_length(u.interests, 1) > 0
        AND u.gender = ${user.looking_for_gender}
        AND NOT EXISTS (
          SELECT 1 FROM likes 
          WHERE user_id = ${userIdBigInt} AND liked_user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM ignored 
          WHERE ignored_user_id = ${userIdBigInt} AND user_id = u.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM ignored 
          WHERE user_id = ${userIdBigInt} AND ignored_user_id = u.id
        )
      ORDER BY u.completion_score DESC
      LIMIT ${MAX_CANDIDATES_TO_FETCH}
    `;
  }

  // Calculate compatibility for each candidate
  const matches: MatchUser[] = [];

  for (const candidate of candidates) {
    const candidateAge = candidate.age;
    if (!candidateAge) {
      continue;
    }

    // Skip candidates without at least MIN_INTERESTS
    if (!candidate.interests || candidate.interests.length < MIN_INTERESTS) {
      continue;
    }

    // Extract id separately to exclude it (it's BigInt and not needed in MatchUser)
    const { id, ...candidateWithoutId } = candidate;
    const matchUser: MatchUser = {
      ...candidateWithoutId,
      telegram_id: candidate.telegram_id ? Number(candidate.telegram_id) : 0,
      age: candidateAge,
      created_at: candidate.created_at,
      updated_at: candidate.updated_at,
      match_priority: 999,
    } as MatchUser;

    let matchPriority = 999;

    // Calculate match information (archetype, MBTI, mutual interests)
    const { archetypeMatch, mbtiMatch, mutualInterestsCount } = calculateMatchInfo(
      user,
      matchUser
    );

    // Set priority based on archetype, MBTI, and mutual interests
    // Priority levels:
    // 1 = both archetype and MBTI match
    // 2 = archetype only
    // 3 = MBTI only
    // 4 = no archetype/MBTI match but has mutual interests
    // We'll use a decimal system where mutual interests reduce the priority (lower is better)
    // For example: 1.0 = perfect match, 1.5 = perfect match with many mutual interests
    if (archetypeMatch && mbtiMatch) {
      matchPriority = 1;
    } else if (archetypeMatch) {
      matchPriority = 2;
    } else if (mbtiMatch) {
      matchPriority = 3;
    } else if (mutualInterestsCount > 0) {
      matchPriority = 4;
    } else {
      // Skip if no match at all
      continue;
    }

    // Adjust priority based on mutual interests (reduce priority number for more interests)
    // Increased weight: Each mutual interest reduces priority by 0.1 (max reduction for MAX_INTERESTS)
    const interestBonus = Math.min(
      mutualInterestsCount * 0.1,
      MAX_INTERESTS * 0.1
    );
    matchPriority = matchPriority - interestBonus;

    // Calculate compatibility percentage (0-MAX_COMPATIBILITY_SCORE%)
    const compatibilityScore = calculateCompatibilityScore(
      archetypeMatch,
      mbtiMatch,
      mutualInterestsCount,
      userAge,
      matchUser.age,
      matchUser.completion_score
    );
    matchUser.compatibility_score = Math.round(compatibilityScore);

    matchUser.match_priority = matchPriority;
    matchUser.mutual_interests_count = mutualInterestsCount;
    matches.push(matchUser);
  }

  // Sort by priority (lower is better), then by compatibility score (higher is better), then by mutual interests count, then by completion score, then by age difference
  matches.sort((a, b) => {
    if (Math.abs(a.match_priority - b.match_priority) > 0.01) {
      return a.match_priority - b.match_priority;
    }

    // If priorities are very close, prioritize by compatibility score
    const aScore = a.compatibility_score || 0;
    const bScore = b.compatibility_score || 0;
    if (aScore !== bScore) {
      return bScore - aScore; // Higher compatibility = better
    }

    // If compatibility scores are equal, prioritize by mutual interests
    const aMutualCount = a.mutual_interests_count || 0;
    const bMutualCount = b.mutual_interests_count || 0;
    if (aMutualCount !== bMutualCount) {
      return bMutualCount - aMutualCount; // More mutual interests = better
    }

    if (a.completion_score !== b.completion_score) {
      return b.completion_score - a.completion_score;
    }
    const ageDiffA = Math.abs((a.age || 0) - userAge);
    const ageDiffB = Math.abs((b.age || 0) - userAge);
    return ageDiffA - ageDiffB;
  });

  // Limit final results to prevent returning too many matches
  const finalMatches = matches.slice(0, MAX_MATCHES_TO_RETURN);

  // Cache results
  cacheMatches(userIdBigInt, finalMatches).catch(() => {});

  return finalMatches;
}
