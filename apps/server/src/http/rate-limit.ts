import { createHmac } from "node:crypto";
import type { Redis } from "ioredis";

export const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 or redis.call('PTTL', KEYS[1]) < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count
`;

/** Hash identities so rate-limit keys contain neither phone numbers nor IP addresses. */
export function createRedisRateLimiter(redis: Pick<Redis, "eval">, secret: string) {
  return async (scope: string, identity: string, limit: number, windowMs: number) => {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      !Number.isSafeInteger(windowMs) ||
      windowMs < 1
    )
      throw new Error("Invalid rate limit");
    const digest = createHmac("sha256", secret).update(identity).digest("hex");
    const count = await redis.eval(RATE_LIMIT_SCRIPT, 1, `limit:${scope}:${digest}`, windowMs);
    return typeof count === "number" && count > 0 && count <= limit;
  };
}
