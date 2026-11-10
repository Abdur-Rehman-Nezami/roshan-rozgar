import type { Pool } from "pg";
import type { AiAudit } from "./runtime.ts";

/** Explicit field selection: neither prompts, transcripts, audio nor arbitrary error text is persisted. */
export function postgresAiAudit(database: Pick<Pool, "query">) {
  return async (entry: AiAudit) => {
    await database.query(
      `
      INSERT INTO ai_calls (route, provider, model, effort, latency_ms, ok, error_code, cached)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [
        entry.route,
        entry.provider,
        entry.model,
        entry.effort ?? null,
        entry.latencyMs,
        entry.ok,
        entry.errorCode,
        entry.cached,
      ],
    );
  };
}
