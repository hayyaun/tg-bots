import { prisma } from "../db";
import { UserProfile, MatchUser } from "./types";
import { archetypeCompatibility, mbtiCompatibility } from "./constants";
import { calculateAge } from "./utils";

export async function findMatches(userId: number): Promise<MatchUser[]> {
  const { getUserProfile } = await import("./database");
  const user = await getUserProfile(userId);
  if (!user || !user.gender || !user.looking_for_gender) return [];

  const userAge = calculateAge(user.birth_date);
  if (!userAge) return [];

  // Get all excluded user IDs
  const excludedIds: bigint[] = [BigInt(userId)];

  // Get users already liked
  const likes = await prisma.like.findMany({
    where: { user_id: BigInt(userId) },
    select: { liked_user_id: true },
  });
  likes.forEach((like) => excludedIds.push(like.liked_user_id));

  // Get users who ignored this user
  const ignoredBy = await prisma.ignored.findMany({
    where: { ignored_user_id: BigInt(userId) },
    select: { user_id: true },
  });
  ignoredBy.forEach((ignored) => excludedIds.push(ignored.user_id));

  // Get users this user has ignored
  const ignoredByUser = await prisma.ignored.findMany({
    where: { user_id: BigInt(userId) },
    select: { ignored_user_id: true },
  });
  ignoredByUser.forEach((ignored) => excludedIds.push(ignored.ignored_user_id));

  // Get all candidates matching criteria
  const whereClause: any = {
    telegram_id: { not: BigInt(userId), notIn: excludedIds },
    completion_score: { gte: 7 },
    username: { not: null },
    gender: { not: null },
    birth_date: { not: null },
  };

  // Build gender filter
  if (user.looking_for_gender === "both") {
    whereClause.gender = { in: ["male", "female"] };
  } else {
    whereClause.gender = user.looking_for_gender;
  }

  const candidates = await prisma.user.findMany({
    where: whereClause,
  });

  // Filter by age (max 8 years difference) and calculate compatibility
  const matches: MatchUser[] = [];
  const minAge = userAge - 8;
  const maxAge = userAge + 8;

  for (const candidate of candidates) {
    const candidateAge = calculateAge(candidate.birth_date);
    if (!candidateAge || candidateAge < minAge || candidateAge > maxAge) {
      continue;
    }

    const matchUser: MatchUser = {
      ...candidate,
      telegram_id: Number(candidate.telegram_id),
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

    // Set priority
    if (archetypeMatch && mbtiMatch) {
      matchPriority = 1;
    } else if (archetypeMatch) {
      matchPriority = 2;
    } else if (mbtiMatch) {
      matchPriority = 3;
    } else {
      continue; // Skip if no match
    }

    matchUser.match_priority = matchPriority;
    matches.push(matchUser);
  }

  // Sort by priority, then by completion score, then by age difference
  matches.sort((a, b) => {
    if (a.match_priority !== b.match_priority) {
      return a.match_priority - b.match_priority;
    }
    if (a.completion_score !== b.completion_score) {
      return b.completion_score - a.completion_score;
    }
    const ageDiffA = Math.abs((a.age || 0) - userAge);
    const ageDiffB = Math.abs((b.age || 0) - userAge);
    return ageDiffA - ageDiffB;
  });

  return matches;
}
