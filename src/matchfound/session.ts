import { SessionData } from "./types";

const sessions = new Map<number, SessionData>();

export function getSession(userId: number): SessionData {
  if (!sessions.has(userId)) {
    sessions.set(userId, {});
  }
  return sessions.get(userId)!;
}

