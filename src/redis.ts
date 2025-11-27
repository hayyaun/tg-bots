import Redis from "ioredis";
import log from "./log";

// Shared Redis client instance
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  lazyConnect: true,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

let isConnected = false;

// Connect to Redis (call once at app startup)
export async function connectRedis(): Promise<void> {
  if (isConnected) return;
  
  await redis.connect();
  isConnected = true;
  log.info("Redis > Connected");
}

// Helper to get a value with bot prefix
export async function getWithPrefix(
  botPrefix: string,
  key: string
): Promise<string | null> {
  return await redis.get(`${botPrefix}:${key}`);
}

// Helper to set a value with bot prefix (with optional TTL in seconds)
export async function setWithPrefix(
  botPrefix: string,
  key: string,
  value: string,
  ttl?: number
): Promise<void> {
  const fullKey = `${botPrefix}:${key}`;
  if (ttl) {
    await redis.set(fullKey, value, "EX", ttl);
  } else {
    await redis.set(fullKey, value);
  }
}

// Helper to delete a value with bot prefix
export async function delWithPrefix(
  botPrefix: string,
  key: string
): Promise<void> {
  await redis.del(`${botPrefix}:${key}`);
}

// Export the raw client for advanced usage
export default redis;

