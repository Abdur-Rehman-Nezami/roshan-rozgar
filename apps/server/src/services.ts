import { Pool } from "pg";
import { Redis } from "ioredis";
import type { ServerConfig } from "./config.ts";

export type ServiceFailure = "database_error" | "redis_error";

export function createDatabase(
  config: Pick<ServerConfig, "DATABASE_URL">,
  onFailure: (event: ServiceFailure) => void,
) {
  const database = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30_000,
    query_timeout: 5000,
    statement_timeout: 5000,
    application_name: "roshan-rozgar",
  });
  database.on("error", () => onFailure("database_error"));
  return database;
}

export function createRedis(
  config: Pick<ServerConfig, "REDIS_URL">,
  onFailure: (event: ServiceFailure) => void,
) {
  const redis = new Redis(config.REDIS_URL, {
    connectTimeout: 3000,
    commandTimeout: 3000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 250, 5000),
  });
  redis.on("error", () => onFailure("redis_error"));
  return redis;
}

export function createServices(config: ServerConfig, onFailure: (event: ServiceFailure) => void) {
  const database = createDatabase(config, onFailure);
  const redis = createRedis(config, onFailure);
  let closing: Promise<void> | undefined;
  return {
    database,
    redis,
    close() {
      closing ??= (async () => {
        redis.disconnect();
        await database.end();
      })();
      return closing;
    },
  };
}
