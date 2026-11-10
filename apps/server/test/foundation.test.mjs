import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT } from "jose";
import { loadConfig } from "../src/config.ts";
import {
  AuthError,
  readSessionCookie,
  requireRole,
  sessionCookie,
  signSession,
  verifySession,
} from "../src/auth/session.ts";
import { startSweeper } from "../src/db/sweeper.ts";
import { checkReadiness } from "../src/readiness.ts";

const secret = Buffer.alloc(32, 7).toString("hex");
const user = { userId: "11111111-1111-4111-8111-111111111111", role: "worker" };
const now = new Date("2026-11-10T05:00:00Z");
const env = {
  DATABASE_URL: "postgres://rr:rr@localhost/rr",
  REDIS_URL: "redis://localhost",
  SESSION_SECRET: secret,
  DEMO_KEY: Buffer.alloc(20, 3).toString("hex"),
};

test("server environment validates defaults and never reveals invalid secret values", () => {
  assert.equal(loadConfig(env).AI_MODE, "fake");
  assert.equal(loadConfig(env).PORT, 8080);
  assert.throws(() => loadConfig({ ...env, PORT: "70000" }), /PORT/);
  assert.throws(() => loadConfig({ ...env, NODE_ENV: "production" }), /PUBLIC_URL/);
  assert.throws(
    () => loadConfig({ ...env, SESSION_SECRET: "private-invalid-value" }),
    (error) =>
      error.message.includes("SESSION_SECRET") && !error.message.includes("private-invalid-value"),
  );
  assert.throws(
    () => loadConfig({ ...env, SESSION_SECRET: "change-me-".repeat(10) }),
    /SESSION_SECRET/,
  );
});

test("signed session round-trips and expired/tampered/wrong-key tokens are rejected", async () => {
  const token = await signSession(user, secret, now);
  assert.deepEqual(await verifySession(token, secret, now), user);
  await assert.rejects(verifySession(token, secret, new Date("2026-11-18T05:00:00Z")), AuthError);
  const [header, payload, signature] = token.split(".");
  await assert.rejects(
    verifySession(`${header}.${payload}.${signature.slice(0, -4)}AAAA`, secret, now),
    AuthError,
  );
  await assert.rejects(verifySession(token, Buffer.alloc(32, 4).toString("hex"), now), AuthError);
});

test("sessions reject wrong issuer, missing expiry and unrecognized role", async () => {
  const make = (role, issuer = "roshan-rozgar", exp = true) => {
    let jwt = new SignJWT({ role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.userId)
      .setIssuer(issuer)
      .setAudience("roshan-rozgar-web")
      .setIssuedAt(Math.floor(now.getTime() / 1000));
    if (exp) jwt = jwt.setExpirationTime(Math.floor(now.getTime() / 1000) + 600);
    return jwt.sign(new TextEncoder().encode(secret));
  };
  await assert.rejects(verifySession(await make("worker", "other-app"), secret, now), AuthError);
  await assert.rejects(
    verifySession(await make("worker", "roshan-rozgar", false), secret, now),
    AuthError,
  );
  await assert.rejects(verifySession(await make("superuser"), secret, now), AuthError);
});

test("role guard distinguishes missing authentication and a forbidden role", () => {
  assert.throws(() => requireRole(null, ["worker"]), { statusCode: 401 });
  assert.throws(() => requireRole(user, ["customer"]), { statusCode: 403 });
  assert.equal(requireRole(user, ["worker"]), user);
});

test("production cookies require Secure/HttpOnly and reject duplicate-cookie ambiguity", async () => {
  const token = await signSession(user, secret, now);
  const cookie = sessionCookie(token, true);
  assert.ok(cookie.startsWith("__Host-rr_session="));
  for (const flag of ["Path=/", "Secure", "HttpOnly", "SameSite=Lax"])
    assert.ok(cookie.includes(flag));
  assert.equal(readSessionCookie(`other=a; __Host-rr_session=${token}`, true), token);
  assert.equal(
    readSessionCookie(`__Host-rr_session=${token}; __Host-rr_session=bad`, true),
    undefined,
  );
  assert.equal(readSessionCookie(`rr_session=${token}`, true), undefined);
  assert.ok(sessionCookie("", true, true).includes("Max-Age=0"));
  assert.throws(() => sessionCookie("bad\r\nX-Test: injected", true));
});

test("readiness reports partial outages without leaking driver errors", async () => {
  assert.deepEqual(
    await checkReadiness(
      {
        database: async () => 1,
        redis: async () => {
          throw new Error("private-connection-url");
        },
      },
      "off",
    ),
    { ok: false, database: "ok", redis: "unavailable", aiMode: "off" },
  );
  assert.equal(
    (await checkReadiness({ database: async () => 1, redis: async () => "PONG" }, "fake")).ok,
    true,
  );
});

test("stopping the sweeper waits for its active pass", async () => {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const stop = startSweeper(
    () => pending,
    () => {},
  );
  await Promise.resolve();
  let stopped = false;
  const closing = stop().then(() => {
    stopped = true;
  });
  await Promise.resolve();
  assert.equal(stopped, false);
  finish();
  await closing;
  assert.equal(stopped, true);
});

test("a slow sweep cannot overlap subsequent timer ticks", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  let finish;
  let calls = 0;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const stop = startSweeper(
    () => {
      calls += 1;
      return pending;
    },
    () => {},
  );
  try {
    await Promise.resolve();
    context.mock.timers.tick(45_000);
    assert.equal(calls, 1);
    finish();
    await new Promise(setImmediate);
    context.mock.timers.tick(15_000);
    await Promise.resolve();
    assert.equal(calls, 2);
  } finally {
    finish();
    await stop();
    context.mock.timers.reset();
  }
});

test("a failed sweep reports failure and the next scheduled pass recovers", async (context) => {
  context.mock.timers.enable({ apis: ["setInterval"] });
  const errors = [];
  let calls = 0;
  const stop = startSweeper(
    async () => {
      calls += 1;
      if (calls === 1) throw new Error("database unavailable");
    },
    (error) => errors.push(error),
  );
  try {
    await new Promise(setImmediate);
    assert.equal(errors.length, 1);
    context.mock.timers.tick(15_000);
    await new Promise(setImmediate);
    assert.equal(calls, 2);
    assert.equal(errors.length, 1);
  } finally {
    await stop();
    context.mock.timers.reset();
  }
});
