// Simple session storage for inmankist bot
// Used for profile editing state

import { BaseSessionData, createSessionManager } from "../shared/session";

export type SessionData = BaseSessionData;

const BOT_PREFIX = "inmankist";
export const getSession = createSessionManager<SessionData>(BOT_PREFIX);

