import { query } from "../db";
import { UserProfile } from "./types";

export async function getUserProfile(
  userId: number
): Promise<UserProfile | null> {
  const result = await query("SELECT * FROM users WHERE telegram_id = $1", [
    userId,
  ]);
  if (result.rows.length === 0) return null;
  return result.rows[0] as UserProfile;
}

export async function calculateCompletionScore(
  userId: number
): Promise<number> {
  const profile = await getUserProfile(userId);
  if (!profile) return 0;

  let score = 0;
  if (profile.username) score++;
  if (profile.profile_images && profile.profile_images.length > 0) score++;
  if (profile.display_name) score++;
  if (profile.biography) score++;
  if (profile.birth_date) score++;
  if (profile.gender) score++;
  if (profile.looking_for_gender) score++;
  if (profile.archetype_result) score++;
  if (profile.mbti_result) score++;

  return score;
}

export async function updateCompletionScore(userId: number): Promise<void> {
  const score = await calculateCompletionScore(userId);
  await query(
    "UPDATE users SET completion_score = $1, updated_at = NOW() WHERE telegram_id = $2",
    [score, userId]
  );
}

export async function ensureUserExists(
  userId: number,
  username?: string,
  onNewUser?: (userId: number, username?: string) => Promise<void>
): Promise<void> {
  const result = await query(
    "SELECT telegram_id FROM users WHERE telegram_id = $1",
    [userId]
  );
  if (result.rows.length === 0) {
    await query(
      `INSERT INTO users (telegram_id, username, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (telegram_id) DO NOTHING`,
      [userId, username || null]
    );
    await updateCompletionScore(userId);

    if (onNewUser) {
      await onNewUser(userId, username);
    }
  } else if (username) {
    // Update username if provided
    await query(
      "UPDATE users SET username = $1, updated_at = NOW() WHERE telegram_id = $2",
      [username, userId]
    );
    await updateCompletionScore(userId);
  }
}

export async function updateUserField(
  userId: number,
  field: string,
  value: unknown
): Promise<void> {
  await query(
    `UPDATE users SET ${field} = $1, updated_at = NOW() WHERE telegram_id = $2`,
    [value, userId]
  );
  await updateCompletionScore(userId);
}

export async function addProfileImage(
  userId: number,
  fileId: string
): Promise<void> {
  const profile = await getUserProfile(userId);
  if (!profile) return;

  const currentImages = profile.profile_images || [];
  if (!currentImages.includes(fileId)) {
    const newImages = [...currentImages, fileId];
    await updateUserField(userId, "profile_images", newImages);
  }
}

export async function removeProfileImage(
  userId: number,
  fileId: string
): Promise<void> {
  const profile = await getUserProfile(userId);
  if (!profile) return;

  const currentImages = profile.profile_images || [];
  const newImages = currentImages.filter((id) => id !== fileId);
  await updateUserField(userId, "profile_images", newImages);
}
