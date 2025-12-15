// Simple session storage for inmankist bot
// Used for profile editing state

import { ProfileEditingField } from "../shared/types";

interface SessionData {
  editingField?: ProfileEditingField;
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

