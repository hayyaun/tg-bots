// Simple session storage for inmankist bot
// Used for profile editing state

import { BaseSessionData, createSessionManager } from "../shared/session";

export type SessionData = BaseSessionData;

export const getSession = createSessionManager<SessionData>();

