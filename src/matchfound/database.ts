import { prisma } from "../db";
import { UserProfile } from "./types";

// Get user profile by id (new primary key)
export async function getUserProfileById(
  userId: bigint
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) return null;
  
  // Convert BigInt to number and Date to Date
  return {
    ...user,
    telegram_id: user.telegram_id ? Number(user.telegram_id) : null,
    birth_date: user.birth_date || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  } as UserProfile;
}

// Get user profile by telegram_id (for backward compatibility with bot)
export async function getUserProfile(
  telegramUserId: number
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
  });
  if (!user) return null;
  
  // Convert BigInt to number and Date to Date
  return {
    ...user,
    telegram_id: user.telegram_id ? Number(user.telegram_id) : null,
    birth_date: user.birth_date || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
  } as UserProfile;
}

export async function calculateCompletionScore(
  profile: UserProfile | null
): Promise<number> {
  if (!profile) return 0;

  let score = 0;
  if (profile.username) score++;
  if (profile.profile_image) score++;
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

// Update completion score by id
export async function updateCompletionScoreById(userId: bigint): Promise<void> {
  const profile = await getUserProfileById(userId);
  const score = await calculateCompletionScore(profile);
  await prisma.user.update({
    where: { id: userId },
    data: { completion_score: score },
  });
}

// Update completion score by telegram_id (for backward compatibility)
export async function updateCompletionScore(telegramUserId: number): Promise<void> {
  const profile = await getUserProfile(telegramUserId);
  const score = await calculateCompletionScore(profile);
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
  });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { completion_score: score },
    });
  }
}

// Helper function to get display name from Telegram user
function getDisplayName(firstName?: string, lastName?: string): string | null {
  const name = `${firstName || ""} ${lastName || ""}`.trim();
  return name || null;
}

// Helper function to get user id from telegram_id
export async function getUserIdFromTelegramId(telegramUserId: number): Promise<bigint | null> {
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
    select: { id: true },
  });
  return user?.id || null;
}

export async function ensureUserExists(
  telegramUserId: number,
  username?: string,
  onNewUser?: (userId: number, username?: string) => Promise<void>,
  firstName?: string,
  lastName?: string
): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
  });

  const displayName = getDisplayName(firstName, lastName);

  if (!existing) {
    const newUser = await prisma.user.create({
      data: {
        telegram_id: BigInt(telegramUserId),
        username: username || null,
        display_name: displayName,
      },
    });
    await updateCompletionScoreById(newUser.id);

    if (onNewUser) {
      await onNewUser(telegramUserId, username);
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
        where: { id: existing.id },
        data: updates,
      });
      await updateCompletionScoreById(existing.id);
    }
  }
}

// Update user field by telegram_id (for backward compatibility with bot)
export async function updateUserField(
  telegramUserId: number,
  field: keyof UserProfile,
  value: unknown
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
  });
  if (!user) return;

  // Map TypeScript field names to Prisma field names (they should match, but handle any differences)
  const data: Record<string, unknown> = { [field]: value };
  
  await prisma.user.update({
    where: { id: user.id },
    data,
  });
  await updateCompletionScoreById(user.id);
}

export async function addProfileImage(
  telegramUserId: number,
  fileId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
  });
  if (!user) return;

  // Only allow 1 picture per profile - replace existing image
  await prisma.user.update({
    where: { id: user.id },
    data: { profile_image: fileId },
  });
  await updateCompletionScoreById(user.id);
}

export async function removeProfileImage(
  telegramUserId: number,
  fileId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
    select: { id: true, profile_image: true },
  });
  if (!user) return;

  // Remove image if it matches (though with single image, this just clears it)
  if (user.profile_image === fileId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { profile_image: null },
    });
    await updateCompletionScoreById(user.id);
  }
}

export async function deleteUserData(telegramUserId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { telegram_id: BigInt(telegramUserId) },
  });
  if (!user) return;

  // Delete user and all related data (cascade deletes will handle related records)
  await prisma.user.delete({
    where: { id: user.id },
  });
}
