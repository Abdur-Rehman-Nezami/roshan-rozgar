import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { z } from "zod";
import { createHttpHandler } from "../src/http/app.ts";
import { isAllowedOrigin, publicError } from "../src/http/security.ts";
import { AuthError, SESSION_TTL_SECONDS, signSession } from "../src/auth/session.ts";
import { AiError } from "../src/ai/runtime.ts";
import { createSocketAuthorization } from "../src/realtime/authorization.ts";
import { attachSockets } from "../src/realtime/server.ts";
import { createDatabase } from "../src/services.ts";

const secret = Buffer.alloc(32, 8).toString("hex");
const user = { userId: "11111111-1111-4111-8111-111111111111", role: "worker" };
const thread = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-11-10T05:00:00Z");
const config = { SESSION_SECRET: secret, NODE_ENV: "production" };

test("origin policy rejects foreign, null and same-site subdomain origins", () => {
  const allowed = (origin, site) => isAllowedOrigin(origin, site, "https://rr.example/app");
  assert.equal(allowed("https://rr.example"), true);
  assert.equal(allowed("https://rr.example.evil"), false);
  assert.equal(allowed("https://sub.rr.example", "same-site"), false);
  assert.equal(allowed("null"), false);
  assert.equal(allowed(undefined, "cross-site"), false);
  assert.equal(allowed(undefined, "same-site"), false);
  assert.equal(allowed(undefined, "same-origin"), true);
  assert.equal(allowed(undefined), true);
});

test("public errors redact driver details, validation inputs and unavailable AI causes", () => {
  const sensitive = "private-phone-address-password";
  const invalid = z.literal("expected").safeParse(sensitive);
  for (const error of [new Error(sensitive), invalid.error]) {
    const output = publicError(error);
    assert.ok(!JSON.stringify(output).includes(sensitive));
    assert.ok(!JSON.stringify(output).includes("stack"));
  }
  assert.equal(publicError(new AuthError()).status, 401);
  assert.equal(publicError(new AuthError(true)).status, 403);
  assert.equal(publicError(new AiError("AI_OFF")).body.error.code, "AI_UNAVAILABLE");
  assert.equal(publicError(new AiError("RATE_LIMITED")).status, 429);
});

test("HTTP readiness and liveness expose distinct statuses without network binding", async () => {
  const state = { ok: false, database: "ok", redis: "unavailable", aiMode: "off" };
  let checked = 0;
  const handler = createHttpHandler({
    readiness: async () => {
      checked += 1;
      return state;
    },
  });
  const call = async (url, method = "GET") => {
    const headers = {};
    let body;
    const response = {
      statusCode: 200,
      setHeader: (key, value) => (headers[key] = value),
      end: (value) => (body = JSON.parse(value)),
    };
    await handler({ method, url }, response);
    return { status: response.statusCode, headers, body };
  };
  assert.equal((await call("/healthz")).status, 200);
  assert.equal(checked, 0);
  const result = await call("/readyz?ignored=1");
  assert.equal(result.status, 503);
  assert.deepEqual(result.body, state);
  assert.equal(result.headers["Cache-Control"], "no-store");
  state.ok = true;
  state.redis = "ok";
  assert.equal((await call("/readyz")).status, 200);
  assert.equal((await call("/api/unknown")).status, 404);
  assert.equal((await call("/healthz", "POST")).status, 404);
});

test("socket authentication requires signed host cookie plus a current database identity", async () => {
  let present = true;
  const queries = [];
  const auth = createSocketAuthorization(
    {
      query: async (sql, values) => {
        queries.push({ sql, values });
        return { rows: present ? [{ id: user.userId }] : [] };
      },
    },
    config,
  );
  const token = await signSession(user, secret, now);
  const cookie = `__Host-rr_session=${token}`;
  const result = await auth.authenticate(cookie, now);
  assert.deepEqual(result.user, user);
  assert.equal(result.expiresAt, now.getTime() + SESSION_TTL_SECONDS * 1000);
  assert.deepEqual(queries[0].values, [user.userId, user.role]);
  present = false;
  await assert.rejects(auth.authenticate(cookie, now), AuthError);
  const before = queries.length;
  for (const header of [undefined, `rr_session=${token}`, `${cookie}; ${cookie}`])
    await assert.rejects(auth.authenticate(header, now), AuthError);
  await assert.rejects(auth.authenticate(cookie, new Date("2026-11-18")), AuthError);
  assert.equal(queries.length, before);
});

test("thread subscriptions use parameterized party membership and reject malformed IDs/admin bypass", async () => {
  const queries = [];
  const auth = createSocketAuthorization(
    {
      query: async (sql, values) => {
        queries.push({ sql, values });
        return { rows: values[0] === thread ? [{ id: thread }] : [] };
      },
    },
    config,
  );
  assert.equal(await auth.canJoinThread(user, thread), true);
  assert.deepEqual(queries[0].values, [thread, user.userId]);
  assert.match(queries[0].sql, /customer_id = \$2 OR worker_id = \$2/);
  assert.equal(await auth.canJoinThread(user, user.userId), false);
  assert.equal(await auth.canJoinThread(user, "' OR true --"), false);
  assert.equal(await auth.canJoinThread({ ...user, role: "admin" }, thread), false);
  assert.equal(queries.length, 2);
});

test("Socket.IO attachment closes without binding; PostgreSQL pool is lazy and closes", async () => {
  const http = createServer();
  const io = attachSockets(
    http,
    { PUBLIC_URL: "https://rr.example" },
    {
      authenticate: async () => {
        throw new AuthError();
      },
      canJoinThread: async () => false,
    },
  );
  assert.equal(http.listening, false);
  await new Promise((resolve) => io.close(resolve));
  const failures = [];
  const database = createDatabase({ DATABASE_URL: "postgres://rr:rr@127.0.0.1/rr" }, (event) =>
    failures.push(event),
  );
  assert.equal(database.totalCount, 0);
  database.emit("error", new Error("private-url"));
  assert.deepEqual(failures, ["database_error"]);
  await database.end();
});
