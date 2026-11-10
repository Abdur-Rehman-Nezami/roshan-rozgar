import { createHmac, randomInt } from "node:crypto";
import { OtpStartSchema, OtpVerifySchema } from "@roshan/shared";
import type { User, Worker } from "@roshan/shared";
import { AuthError, readSessionCookie, signSession, verifySession } from "./session.ts";

export type LoginRole = "worker" | "customer";
export interface OtpStore {
  issue(phone: string, digest: string, role: LoginRole): Promise<void>;
  consume(phone: string, digest: string): Promise<LoginRole | null>;
}
export interface IdentityRepository {
  signIn(phone: string, role: LoginRole): Promise<User>;
  current(userId: string, role: string): Promise<{ user: User; worker?: Worker } | null>;
}

export function createAuthService(options: {
  store: OtpStore;
  identities: IdentityRepository;
  secret: string;
  secure: boolean;
  generateCode?: () => string;
}) {
  if (Buffer.byteLength(options.secret) < 32) throw new Error("Session key is too short");
  const digest = (phone: string, code: string) =>
    createHmac("sha256", options.secret).update(`${phone}\0${code}`).digest("hex");
  return {
    async start(input: unknown) {
      const { phone, role } = OtpStartSchema.parse(input);
      const code = options.generateCode?.() ?? String(randomInt(0, 1_000_000)).padStart(6, "0");
      const checked = OtpVerifySchema.parse({ phone, code });
      await options.store.issue(phone, digest(phone, checked.code), role);
      // Intentionally public: this is mocked authentication and never sends SMS.
      return { demoCode: checked.code, demo: true as const };
    },
    async verify(input: unknown) {
      const { phone, code } = OtpVerifySchema.parse(input);
      const role = await options.store.consume(phone, digest(phone, code));
      if (!role) throw new AuthError();
      const user = await options.identities.signIn(phone, role);
      if (user.phone !== phone || user.role !== role) throw new AuthError();
      const token = await signSession({ userId: user.id, role: user.role }, options.secret);
      return { user, token };
    },
    async me(cookie: string | undefined) {
      const token = readSessionCookie(cookie, options.secure);
      if (!token) throw new AuthError();
      const session = await verifySession(token, options.secret);
      const current = await options.identities.current(session.userId, session.role);
      if (!current || current.user.id !== session.userId || current.user.role !== session.role)
        throw new AuthError();
      return current;
    },
  };
}
