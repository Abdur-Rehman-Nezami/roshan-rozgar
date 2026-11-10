import type { AiMode } from "@roshan/shared";

export async function checkReadiness(
  dependencies: { database: () => Promise<unknown>; redis: () => Promise<unknown> },
  aiMode: AiMode,
) {
  const [database, redis] = await Promise.allSettled([
    Promise.resolve().then(dependencies.database),
    Promise.resolve().then(dependencies.redis),
  ]);
  return {
    ok: database.status === "fulfilled" && redis.status === "fulfilled",
    database: database.status === "fulfilled" ? ("ok" as const) : ("unavailable" as const),
    redis: redis.status === "fulfilled" ? ("ok" as const) : ("unavailable" as const),
    aiMode,
  };
}
