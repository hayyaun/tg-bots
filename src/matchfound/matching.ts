import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { MAX_COMPLETION_SCORE, MIN_INTERESTS, MAX_INTERESTS, MIN_COMPLETION_THRESHOLD, MAX_AGE_DIFFERENCE, ARCHETYPE_MATCH_SCORE, MBTI_MATCH_SCORE, MAX_INTERESTS_SCORE, MAX_AGE_BONUS, MAX_COMPLETION_BONUS, MAX_COMPATIBILITY_SCORE, MAX_CANDIDATES_TO_FETCH, MAX_MATCHES_TO_RETURN } from "../shared/constants";
import {
  archetypeCompatibility,
  mbtiCompatibility,
} from "./constants";
import { MatchUser } from "./types";
import { calculateAge } from "../shared/utils";
import { getUserProfile, getUserProfileById } from "../shared/database";

export async function findMatches(userId: number | bigint, isAdmin: boolean = false): Promise<MatchUser[]> {
  
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

  const userAge = calculateAge(user.birth_date);
  if (!userAge || !user.birth_date) return [];

  // Get all excluded user IDs - run queries in parallel for better performance
  const excludedIds: bigint[] = [userIdBigInt];

  // Fetch all exclusion data in parallel
  const [likes, ignoredBy, ignoredByUser] = await Promise.all([
    // Get users already liked
    prisma.like.findMany({
      where: { user_id: userIdBigInt },
      select: { liked_user_id: true },
    }),
    // Get users who ignored this user
    prisma.ignored.findMany({
      where: { ignored_user_id: userIdBigInt },
      select: { user_id: true },
    }),
    // Get users this user has ignored
    prisma.ignored.findMany({
      where: { user_id: userIdBigInt },
      select: { ignored_user_id: true },
    }),
  ]);

  // Build exclusion list from parallel results
  likes.forEach((like: { liked_user_id: bigint }) =>
    excludedIds.push(like.liked_user_id)
  );
  ignoredBy.forEach((ignored: { user_id: bigint }) =>
    excludedIds.push(ignored.user_id)
  );
  ignoredByUser.forEach((ignored: { ignored_user_id: bigint }) =>
    excludedIds.push(ignored.ignored_user_id)
  );

  // Calculate birth_date range for age filtering (done in database)
  const today = new Date();
  const minAge = Math.max(18, userAge - MAX_AGE_DIFFERENCE); // Ensure minimum age of 18
  const maxAge = userAge + MAX_AGE_DIFFERENCE;
  
  // Calculate max birth_date (youngest person: to be at least minAge today)
  // Someone who is minAge today was born on or before: today - minAge years
  const maxBirthDate = new Date(today);
  maxBirthDate.setFullYear(today.getFullYear() - minAge);
  
  // Calculate min birth_date (oldest person: to be at most maxAge today)
  // Someone who is maxAge today was born on or after: (today - maxAge years) - 1 year + 1 day
  // This ensures we include people who are exactly maxAge (haven't had birthday yet this year)
  const minBirthDate = new Date(today);
  minBirthDate.setFullYear(today.getFullYear() - maxAge - 1);
  minBirthDate.setMonth(0); // January
  minBirthDate.setDate(1); // First day of year

  // Get all candidates matching criteria
  const whereClause: Prisma.UserWhereInput = {
    id: { not: userIdBigInt, notIn: excludedIds },
    completion_score: { gte: MIN_COMPLETION_THRESHOLD },
    username: { not: null },
    gender: { not: null },
    birth_date: { 
      not: null,
      gte: minBirthDate,
      lte: maxBirthDate,
    },
    interests: { isEmpty: false },
  };

  // Build gender filter
  if (user.looking_for_gender === "both") {
    whereClause.gender = { in: ["male", "female"] };
  } else {
    whereClause.gender = user.looking_for_gender;
  }

  // Limit candidates fetched to prevent memory issues with large user bases
  const candidates = await prisma.user.findMany({
    where: whereClause,
    take: MAX_CANDIDATES_TO_FETCH,
    orderBy: {
      completion_score: 'desc', // Prioritize users with higher completion scores first
    },
  });

  // Calculate compatibility for each candidate
  const matches: MatchUser[] = [];

  for (const candidate of candidates) {
    const candidateAge = calculateAge(candidate.birth_date);
    if (!candidateAge) {
      continue;
    }

    // Skip candidates without at least MIN_INTERESTS
    if (!candidate.interests || candidate.interests.length < MIN_INTERESTS) {
      continue;
    }

    const matchUser: MatchUser = {
      ...candidate,
      telegram_id: candidate.telegram_id ? Number(candidate.telegram_id) : 0,
      birth_date: candidate.birth_date || null,
      created_at: candidate.created_at,
      updated_at: candidate.updated_at,
      age: candidateAge,
      match_priority: 999,
    } as MatchUser;

    let matchPriority = 999;

    // Check archetype compatibility
    let archetypeMatch = false;
    if (user.archetype_result && matchUser.archetype_result) {
      const userArchetype = user.archetype_result.toLowerCase();
      const targetArchetype = matchUser.archetype_result.toLowerCase();

      if (user.gender === matchUser.gender) {
        // Same-gender matching: same archetype
        archetypeMatch = userArchetype === targetArchetype;
      } else {
        // Opposite-gender matching: use compatibility matrix
        const compatible = archetypeCompatibility[userArchetype] || [];
        archetypeMatch = compatible.includes(targetArchetype);
      }
    }

    // Check MBTI compatibility
    let mbtiMatch = false;
    if (user.mbti_result && matchUser.mbti_result) {
      const userMBTI = user.mbti_result.toUpperCase();
      const targetMBTI = matchUser.mbti_result.toUpperCase();
      const compatible = mbtiCompatibility[userMBTI] || [];
      mbtiMatch = compatible.includes(targetMBTI);
    }

    // Calculate mutual interests
    let mutualInterestsCount = 0;
    if (
      user.interests &&
      matchUser.interests &&
      user.interests.length > 0 &&
      matchUser.interests.length > 0
    ) {
      const userInterestsSet = new Set(user.interests);
      const candidateInterestsSet = new Set(matchUser.interests);
      mutualInterestsCount = Array.from(userInterestsSet).filter((interest) =>
        candidateInterestsSet.has(interest)
      ).length;
    }

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
      // Skip if no match at all, unless admin (admins see everyone)
      if (!isAdmin) {
        continue;
      }
      // For admin, set a default priority so they see everyone
      matchPriority = 999;
    }

    // Adjust priority based on mutual interests (reduce priority number for more interests)
    // Increased weight: Each mutual interest reduces priority by 0.1 (max reduction for MAX_INTERESTS)
    const interestBonus = Math.min(mutualInterestsCount * 0.1, MAX_INTERESTS * 0.1);
    matchPriority = matchPriority - interestBonus;

    // Calculate compatibility percentage (0-MAX_COMPATIBILITY_SCORE%)
    let compatibilityScore = 0;
    
    // Archetype match
    if (archetypeMatch) {
      compatibilityScore += ARCHETYPE_MATCH_SCORE;
    }
    
    // MBTI match
    if (mbtiMatch) {
      compatibilityScore += MBTI_MATCH_SCORE;
    }
    
    // Mutual interests: up to MAX_INTERESTS_SCORE (scaled by number of mutual interests, max MAX_INTERESTS)
    // Formula: (mutualInterestsCount / MAX_INTERESTS) * MAX_INTERESTS_SCORE
    if (mutualInterestsCount > 0) {
      const interestsScore = Math.min((mutualInterestsCount / MAX_INTERESTS) * MAX_INTERESTS_SCORE, MAX_INTERESTS_SCORE);
      compatibilityScore += interestsScore;
    }
    
    // Age difference bonus: up to MAX_AGE_BONUS (smaller difference = higher bonus)
    // Max age difference is MAX_AGE_DIFFERENCE years
    const ageDiff = Math.abs((matchUser.age || 0) - userAge);
    const ageBonus = Math.max(0, MAX_AGE_BONUS - (ageDiff / MAX_AGE_DIFFERENCE) * MAX_AGE_BONUS);
    compatibilityScore += ageBonus;
    
    // Completion score bonus: up to MAX_COMPLETION_BONUS (higher score = higher bonus)
    const completionBonus = Math.min((matchUser.completion_score / MAX_COMPLETION_SCORE) * MAX_COMPLETION_BONUS, MAX_COMPLETION_BONUS);
    compatibilityScore += completionBonus;
    
    // Cap at MAX_COMPATIBILITY_SCORE
    compatibilityScore = Math.min(compatibilityScore, MAX_COMPATIBILITY_SCORE);
    matchUser.compatibility_score = Math.round(compatibilityScore);

    matchUser.match_priority = matchPriority;
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
    const aInterests = a.interests || [];
    const bInterests = b.interests || [];
    const userInterestsSet = new Set(user.interests || []);
    const aMutualCount = aInterests.filter((i) =>
      userInterestsSet.has(i)
    ).length;
    const bMutualCount = bInterests.filter((i) =>
      userInterestsSet.has(i)
    ).length;
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
  return matches.slice(0, MAX_MATCHES_TO_RETURN);
}
