import { SessionData } from "./types";
import { createSessionManager } from "../shared/session";

export const getSession = createSessionManager<SessionData>();

