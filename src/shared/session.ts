import { ProfileEditingField } from "./types";

/**
 * Base session data shared between all bots
 * Contains common profile editing state
 */
export interface BaseSessionData {
  editingField?: ProfileEditingField;
  interestsPage?: number;
  locationPage?: number;
  completingProfile?: boolean;
}

/**
 * Creates a session manager with in-memory storage
 * Returns a getSession function that can be used by bots
 */
export function createSessionManager<T extends BaseSessionData>(): (userId: number) => T {
  const sessions = new Map<number, T>();

  return (userId: number): T => {
    if (!sessions.has(userId)) {
      sessions.set(userId, {} as T);
    }
    return sessions.get(userId)!;
  };
}

