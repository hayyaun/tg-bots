import { SessionData } from "./types";
import { createSessionManager } from "../shared/session";

const BOT_PREFIX = "matchfound";
export const getSession = createSessionManager<SessionData>(BOT_PREFIX);

