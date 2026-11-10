import type { Pool } from "pg";
import { decodeJwt } from "jose";
import { IdSchema } from "@roshan/shared";
import type { ServerConfig } from "../config.ts";
import { AuthError, readSessionCookie, verifySession } from "../auth/session.ts";
import type { SessionUser } from "../auth/session.ts";

export function createSocketAuthorization(
  database: Pick<Pool, "query">,
  config: Pick<ServerConfig, "NODE_ENV" | "SESSION_SECRET">,
) {
  return {
    async authenticate(cookie: string | undefined, now = new Date()) {
      const token = readSessionCookie(cookie, config.NODE_ENV === "production");
      if (!token) throw new AuthError();
      const user = await verifySession(token, config.SESSION_SECRET, now);
      const existing = await database.query("SELECT id FROM users WHERE id = $1 AND role = $2", [
        user.userId,
        user.role,
      ]);
      if (existing.rows.length !== 1) throw new AuthError();
      // Decode only after signature, issuer, audience and expiry verification above.
      return { user, expiresAt: decodeJwt(token).exp! * 1000 };
    },
    async canJoinThread(user: SessionUser, input: unknown) {
      const parsed = IdSchema.safeParse(input);
      if (!parsed.success || user.role === "admin") return false;
      const result = await database.query(
        `SELECT id FROM threads WHERE id = $1
         AND (customer_id = $2 OR worker_id = $2)`,
        [parsed.data, user.userId],
      );
      return result.rows.length === 1;
    },
  };
}
