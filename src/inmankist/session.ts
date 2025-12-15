// Simple session storage for inmankist bot
// Used for profile editing state

interface SessionData {
  editingField?: string;
  interestsPage?: number;
  locationPage?: number;
  completingProfile?: boolean;
}

const sessions = new Map<number, SessionData>();

export function getSession(userId: number): SessionData {
  if (!sessions.has(userId)) {
    sessions.set(userId, {});
  }
  return sessions.get(userId)!;
}

