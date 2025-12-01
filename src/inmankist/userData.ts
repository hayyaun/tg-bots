import { getWithPrefix, setWithPrefix, delWithPrefix } from "../redis";
import { IUserData } from "./types";

const REDIS_PREFIX = "inmankist";
const USER_DATA_TTL = 24 * 60 * 60; // 24 hours in seconds

// Simple in-memory cache for active quiz sessions
const userDataCache = new Map<number, { data: IUserData; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (for active quiz sessions)

// Get user data
export async function getUserData(userId: number): Promise<IUserData | null> {
  // Check cache first
  const cached = userDataCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // Fetch from Redis
  const data = await getWithPrefix(REDIS_PREFIX, `userdata:${userId}`);
  if (!data) {
    userDataCache.delete(userId); // Clear cache if no data
    return null;
  }
  
  const userData = JSON.parse(data) as IUserData;
  // Cache it
  userDataCache.set(userId, { data: userData, timestamp: Date.now() });
  
  return userData;
}

// Set user data with TTL
export async function setUserData(userId: number, data: IUserData): Promise<void> {
  await setWithPrefix(REDIS_PREFIX, `userdata:${userId}`, JSON.stringify(data), USER_DATA_TTL);
  // Update cache immediately
  userDataCache.set(userId, { data, timestamp: Date.now() });
}

// Update cache without Redis write (for in-memory updates)
export function updateUserDataCache(userId: number, data: IUserData): void {
  userDataCache.set(userId, { data, timestamp: Date.now() });
}

// Update user data (merge with existing)
// Optionally accepts existing data to avoid redundant Redis read
export async function updateUserData(
  userId: number,
  updates: Partial<IUserData>,
  existingData?: IUserData
): Promise<IUserData> {
  const existing = existingData || await getUserData(userId);
  if (!existing) throw new Error("User data not found");
  const updated = { ...existing, ...updates };
  await setUserData(userId, updated);
  return updated;
}

// Delete user data
export async function deleteUserData(userId: number): Promise<void> {
  await delWithPrefix(REDIS_PREFIX, `userdata:${userId}`);
  // Clear cache
  userDataCache.delete(userId);
}

// Note: We don't track active user count to avoid complexity and potential drift issues
// Redis TTL automatically cleans up expired sessions after 24h

