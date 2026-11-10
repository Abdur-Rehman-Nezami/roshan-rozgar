import { SignJWT, jwtVerify } from "jose";
import { IdSchema, RoleSchema } from "@roshan/shared";
import type { Role } from "@roshan/shared";

const ISSUER = "roshan-rozgar";
const AUDIENCE = "roshan-rozgar-web";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export interface SessionUser {
  userId: string;
  role: Role;
}
export class AuthError extends Error {
  readonly code: "UNAUTHORIZED" | "FORBIDDEN";
  readonly statusCode: 401 | 403;
  constructor(forbidden = false) {
    super(forbidden ? "This action is not allowed for your role" : "Sign in to continue");
    this.name = "AuthError";
    this.code = forbidden ? "FORBIDDEN" : "UNAUTHORIZED";
    this.statusCode = forbidden ? 403 : 401;
  }
}

function key(secret: string) {
  if (Buffer.byteLength(secret, "utf8") < 32)
    throw new Error("Session key must contain at least 32 bytes");
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser, secret: string, now = new Date()) {
  const userId = IdSchema.parse(user.userId);
  const role = RoleSchema.parse(user.role);
  const seconds = Math.floor(now.getTime() / 1000);
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(seconds)
    .setExpirationTime(seconds + SESSION_TTL_SECONDS)
    .sign(key(secret));
}

export async function verifySession(
  token: string,
  secret: string,
  now = new Date(),
): Promise<SessionUser> {
  // Invalid deployment configuration should fail before treating a user as signed in.
  const signingKey = key(secret);
  try {
    if (token.length > 4096) throw new AuthError();
    const { payload } = await jwtVerify(token, signingKey, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
      currentDate: now,
      maxTokenAge: SESSION_TTL_SECONDS,
    });
    if (typeof payload.exp !== "number" || typeof payload.iat !== "number") throw new AuthError();
    return { userId: IdSchema.parse(payload.sub), role: RoleSchema.parse(payload.role) };
  } catch {
    throw new AuthError();
  }
}

export function requireRole(user: SessionUser | null, roles: readonly Role[]) {
  if (!user) throw new AuthError();
  if (!roles.includes(user.role)) throw new AuthError(true);
  return user;
}

export function sessionCookieName(secure: boolean) {
  return secure ? "__Host-rr_session" : "rr_session";
}

export function sessionCookie(token: string, secure: boolean, clear = false) {
  if (!clear && !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
    throw new Error("Invalid session cookie value");
  return `${sessionCookieName(secure)}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}

/** Used by the socket handshake too. Duplicate session cookies fail closed. */
export function readSessionCookie(header: string | undefined, secure: boolean) {
  if (!header || header.length > 8192) return undefined;
  const name = `${sessionCookieName(secure)}=`;
  const found = header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(name));
  return found.length === 1 ? found[0]?.slice(name.length) : undefined;
}
