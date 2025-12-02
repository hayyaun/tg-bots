import { query } from "../db";
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
  const excludedIds = [userId];
  
  // Get users already liked
  const likedResult = await query(
    "SELECT liked_user_id FROM likes WHERE user_id = $1",
    [userId]
  );
  likedResult.rows.forEach((row) => excludedIds.push(row.liked_user_id));

  // Get users who ignored this user
  const ignoredResult = await query(
    "SELECT user_id FROM ignored WHERE ignored_user_id = $1",
    [userId]
  );
  ignoredResult.rows.forEach((row) => excludedIds.push(row.user_id));

  // Get users this user has ignored
  const ignoredByUserResult = await query(
    "SELECT ignored_user_id FROM ignored WHERE user_id = $1",
    [userId]
  );
  ignoredByUserResult.rows.forEach((row) => excludedIds.push(row.ignored_user_id));

  // Base query: gender filter + age filter + minimum completion + not excluded
  let baseQuery = `
    SELECT u.*,
           EXTRACT(YEAR FROM AGE(u.birth_date))::INTEGER as age
    FROM users u
    WHERE u.telegram_id != $1
      AND NOT (u.telegram_id = ANY($2::bigint[]))
      AND u.completion_score >= 7
      AND u.username IS NOT NULL
      AND u.gender IS NOT NULL
      AND u.birth_date IS NOT NULL
  `;

  const params: unknown[] = [userId, excludedIds];
  let paramIndex = 3;

  // Gender filter
  if (user.looking_for_gender === "both") {
    baseQuery += ` AND u.gender IN ('male', 'female')`;
  } else {
    baseQuery += ` AND u.gender = $${paramIndex}`;
    params.push(user.looking_for_gender);
    paramIndex++;
  }

  // Age filter (max 8 years difference)
  baseQuery += ` AND ABS(EXTRACT(YEAR FROM AGE(u.birth_date))::INTEGER - $${paramIndex}) <= 8`;
  params.push(userAge);
  paramIndex++;

  const allCandidates = await query(baseQuery, params);
  const matches: MatchUser[] = [];

  for (const candidate of allCandidates.rows) {
    const matchUser = candidate as MatchUser;
    let matchPriority = 999; // Lower is better

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
    matchUser.age = matchUser.age || calculateAge(matchUser.birth_date);
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

