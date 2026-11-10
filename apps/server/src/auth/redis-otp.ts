import type { Redis } from "ioredis";
import type { OtpStore } from "./otp.ts";

export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
// Compare and consume in one Redis operation: two concurrent verifies cannot both succeed.
export const CONSUME_OTP_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return false end
local otp = cjson.decode(raw)
if otp.digest == ARGV[1] then
  redis.call('DEL', KEYS[1])
  return otp.role
end
otp.attempts = otp.attempts + 1
if otp.attempts >= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[1])
else
  redis.call('SET', KEYS[1], cjson.encode(otp), 'KEEPTTL')
end
return false
`;

export function createRedisOtpStore(redis: Pick<Redis, "set" | "eval">): OtpStore {
  return {
    async issue(phone, digest, role) {
      await redis.set(
        `otp:${phone}`,
        JSON.stringify({ digest, role, attempts: 0 }),
        "EX",
        OTP_TTL_SECONDS,
      );
    },
    async consume(phone, digest) {
      const role = await redis.eval(
        CONSUME_OTP_SCRIPT,
        1,
        `otp:${phone}`,
        digest,
        OTP_MAX_ATTEMPTS,
      );
      return role === "worker" || role === "customer" ? role : null;
    },
  };
}
