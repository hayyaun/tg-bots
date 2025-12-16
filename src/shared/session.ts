import { ProfileEditingField } from "./types";
import { getWithPrefix, setWithPrefix } from "../redis";

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

// Session TTL: 1 hour (3600 seconds) - sessions expire after inactivity
const SESSION_TTL = 3600;

/**
 * Creates a session manager with Redis storage and TTL
 * Returns a getSession function that can be used by bots
 * Sessions automatically expire after 1 hour of inactivity
 */
export function createSessionManager<T extends BaseSessionData>(
  botPrefix: string = "shared"
): (userId: number) => Promise<T> {
  // In-memory cache for active sessions (reduces Redis calls)
  const sessionCache = new Map<number, { data: T; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  // Pending save operations (for debouncing)
  const pendingSaves = new Map<number, NodeJS.Timeout>();

  const saveSession = async (userId: number, session: T): Promise<void> => {
    await setWithPrefix(
      botPrefix,
      `session:${userId}`,
      JSON.stringify(session),
      SESSION_TTL
    );
    // Update cache
    sessionCache.set(userId, { data: session, timestamp: Date.now() });
  };

  return async (userId: number): Promise<T> => {
    // Check cache first
    const cached = sessionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch from Redis
    const data = await getWithPrefix(botPrefix, `session:${userId}`);
    let session: T;
    
    if (data) {
      try {
        session = JSON.parse(data) as T;
      } catch {
        // Invalid JSON, create new session
        session = {} as T;
      }
    } else {
      session = {} as T;
    }

    // Update cache
    sessionCache.set(userId, { data: session, timestamp: Date.now() });

    // Create proxy to auto-save on changes
    return new Proxy(session, {
      set(target: T, prop: string | symbol, value: unknown): boolean {
        (target as Record<string | symbol, unknown>)[prop] = value;
        // Debounce Redis writes (save after 100ms of no changes)
        const existingTimeout = pendingSaves.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        const timeout = setTimeout(async () => {
          await saveSession(userId, target);
          pendingSaves.delete(userId);
        }, 100);
        pendingSaves.set(userId, timeout);
        return true;
      },
      deleteProperty(target: T, prop: string | symbol): boolean {
        delete (target as Record<string | symbol, unknown>)[prop];
        // Save immediately on delete
        const existingTimeout = pendingSaves.get(userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        saveSession(userId, target).catch(() => {});
        return true;
      },
    });
  };
}

