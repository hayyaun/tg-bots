import { prisma } from "../db";
import { UserProfile } from "./types";

export async function getUserProfile(
  userId: number
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(userId) },
  });
  if (!user) return null;
  
  // Convert BigInt to number and Date to Date
  return {
    ...user,
    telegram_id: Number(user.telegram_id),
    birth_date: user.birth_date || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  } as UserProfile;
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
  if (profile.mood) score++;
  if (profile.interests && profile.interests.length > 0) score++;
  if (profile.location) score++;

  return score;
}

export async function updateCompletionScore(userId: number): Promise<void> {
  const score = await calculateCompletionScore(userId);
  await prisma.user.update({
    where: { telegram_id: BigInt(userId) },
    data: { completion_score: score },
  });
}

// Helper function to get display name from Telegram user
function getDisplayName(firstName?: string, lastName?: string): string | null {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  return name || null;
}

export async function ensureUserExists(
  userId: number,
  username?: string,
  onNewUser?: (userId: number, username?: string) => Promise<void>,
  firstName?: string,
  lastName?: string
): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { telegram_id: BigInt(userId) },
  });

  const displayName = getDisplayName(firstName, lastName);

  if (!existing) {
    await prisma.user.upsert({
      where: { telegram_id: BigInt(userId) },
      create: {
        telegram_id: BigInt(userId),
        username: username || null,
        display_name: displayName,
      },
      update: {},
    });
    await updateCompletionScore(userId);

    if (onNewUser) {
      await onNewUser(userId, username);
    }
  } else {
    // Update username if provided and different
    // Only update display_name if user doesn't already have one (don't overwrite manual changes)
    const updates: { username?: string; display_name?: string | null } = {};
    
    if (username && existing.username !== username) {
      updates.username = username;
    }
    
    // Only set display_name if it doesn't exist (preserve manual changes)
    if (displayName !== null && !existing.display_name) {
      updates.display_name = displayName;
    }
    
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { telegram_id: BigInt(userId) },
        data: updates,
      });
      await updateCompletionScore(userId);
    }
  }
}

export async function updateUserField(
  userId: number,
  field: keyof UserProfile,
  value: unknown
): Promise<void> {
  // Map TypeScript field names to Prisma field names (they should match, but handle any differences)
  const data: Record<string, unknown> = { [field]: value };
  
  await prisma.user.update({
    where: { telegram_id: BigInt(userId) },
    data,
  });
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
    await prisma.user.update({
      where: { telegram_id: BigInt(userId) },
      data: { profile_images: newImages },
    });
    await updateCompletionScore(userId);
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
  await prisma.user.update({
    where: { telegram_id: BigInt(userId) },
    data: { profile_images: newImages },
  });
  await updateCompletionScore(userId);
}
