import type { AiCache } from "./runtime.ts";

interface RedisCacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
}
export function redisAiCache(redis: RedisCacheClient): AiCache {
  return {
    get: (key) => redis.get(key),
    set: (key, value, ttlSeconds) => {
      if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0)
        throw new Error("Cache TTL must be positive");
      return redis.set(key, value, "EX", ttlSeconds);
    },
  };
}
