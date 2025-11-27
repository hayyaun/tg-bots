import redis, { getWithPrefix, setWithPrefix, delWithPrefix } from "../redis";
import { IUserData } from "./types";

const REDIS_PREFIX = "inmankist";
const USER_DATA_TTL = 24 * 60 * 60; // 24 hours in seconds

// Get user data
export async function getUserData(userId: number): Promise<IUserData | null> {
  const data = await getWithPrefix(REDIS_PREFIX, `userdata:${userId}`);
  if (!data) return null;
  return JSON.parse(data) as IUserData;
}

// Set user data with TTL
export async function setUserData(userId: number, data: IUserData): Promise<void> {
  await setWithPrefix(REDIS_PREFIX, `userdata:${userId}`, JSON.stringify(data), USER_DATA_TTL);
}

// Update user data (merge with existing)
export async function updateUserData(userId: number, updates: Partial<IUserData>): Promise<void> {
  const existing = await getUserData(userId);
  if (!existing) throw new Error("User data not found");
  const updated = { ...existing, ...updates };
  await setUserData(userId, updated);
}

// Delete user data
export async function deleteUserData(userId: number): Promise<void> {
  await delWithPrefix(REDIS_PREFIX, `userdata:${userId}`);
}

// Note: We don't track active user count to avoid complexity and potential drift issues
// Redis TTL automatically cleans up expired sessions after 24h

