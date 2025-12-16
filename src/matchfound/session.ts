import { SessionData } from "./types";
import { createSessionManager } from "../shared/session";
import { BOT_PREFIX } from "./constants";

export const getSession = createSessionManager<SessionData>(BOT_PREFIX);

