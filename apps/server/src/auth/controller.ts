import { API_CONTRACT } from "@roshan/shared";
import { HttpError } from "../http/security.ts";
import { sessionCookie } from "./session.ts";
import type { createAuthService } from "./otp.ts";
import type { createRedisRateLimiter } from "../http/rate-limit.ts";

export function createAuthController(
  service: ReturnType<typeof createAuthService>,
  allow: ReturnType<typeof createRedisRateLimiter>,
  secure: boolean,
) {
  return {
    async rateLimit(operation: "start" | "verify", ip: string) {
      let permitted: boolean;
      try {
        permitted = await allow(`otp-${operation}`, ip, operation === "start" ? 10 : 30, 60_000);
      } catch {
        throw new HttpError(503, "INTERNAL", "Sign-in is temporarily unavailable", true);
      }
      if (!permitted) throw new HttpError(429, "RATE_LIMITED", "Please try again shortly", true);
    },
    async start(body: unknown) {
      return API_CONTRACT.otpStart.response.parse(await service.start(body));
    },
    async verify(body: unknown) {
      const { user, token } = await service.verify(body);
      return {
        body: API_CONTRACT.otpVerify.response.parse({ user }),
        cookie: sessionCookie(token, secure),
      };
    },
    async me(cookie: string | undefined) {
      return API_CONTRACT.me.response.parse(await service.me(cookie));
    },
  };
}
