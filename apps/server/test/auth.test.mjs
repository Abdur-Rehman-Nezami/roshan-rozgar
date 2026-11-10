import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { createAuthService } from "../src/auth/otp.ts";
import { createRedisOtpStore, OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "../src/auth/redis-otp.ts";
import { createIdentityRepository } from "../src/db/identities.ts";
import { AuthError, verifySession } from "../src/auth/session.ts";
import { createAuthController } from "../src/auth/controller.ts";
import { createRedisRateLimiter } from "../src/http/rate-limit.ts";
import { createHttpHandler } from "../src/http/app.ts";
import { readJsonBody } from "../src/http/body.ts";

const phone = "+923001234567";
const secret = Buffer.alloc(32, 9).toString("hex");
const worker = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "worker",
  phone,
  name: null,
  lang: "ur",
  areaId: null,
  coordinates: null,
  isSeeded: false,
  createdAt: "2026-11-10T05:00:00Z",
};

function setup() {
  const codes = new Map();
  const issued = [];
  let current = null;
  const service = createAuthService({
    secret,
    secure: false,
    generateCode: () => "123456",
    store: {
      issue: async (number, digest, role) => {
        issued.push({ number, digest, role });
        codes.set(number, { digest, role });
      },
      consume: async (number, digest) => {
        const saved = codes.get(number);
        if (saved?.digest !== digest) return null;
        codes.delete(number);
        return saved.role;
      },
    },
    identities: {
      signIn: async (number, role) => {
        if (current && current.role !== role) throw new AuthError(true);
        current = { ...worker, phone: number, role };
        return current;
      },
      current: async (id, role) =>
        current?.id === id && current?.role === role ? { user: current } : null,
    },
  });
  return { service, issued, codes };
}

test("demo login normalizes numbers, stores a digest, issues a signed session and resolves me", async () => {
  const { service, issued } = setup();
  assert.deepEqual(await service.start({ phone: "۰۳۰۰۱۲۳۴۵۶۷", role: "worker" }), {
    demoCode: "123456",
    demo: true,
  });
  assert.equal(issued[0].number, phone);
  assert.match(issued[0].digest, /^[a-f0-9]{64}$/);
  assert.ok(!issued[0].digest.includes("123456"));
  const { user, token } = await service.verify({ phone, code: "123456" });
  assert.deepEqual(user, worker);
  assert.deepEqual(await verifySession(token, secret), { userId: worker.id, role: "worker" });
  assert.deepEqual(await service.me(`rr_session=${token}`), { user: worker });
});

test("codes cannot be replayed and concurrently consumed codes produce one session", async () => {
  const { service } = setup();
  await service.start({ phone, role: "worker" });
  const results = await Promise.allSettled([
    service.verify({ phone, code: "123456" }),
    service.verify({ phone, code: "123456" }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  await assert.rejects(service.verify({ phone, code: "123456" }), AuthError);
});

test("wrong codes, missing cookies, admin selection and role changes cannot authenticate", async () => {
  const { service, issued } = setup();
  await assert.rejects(service.start({ phone, role: "admin" }));
  assert.equal(issued.length, 0);
  await service.start({ phone, role: "worker" });
  await assert.rejects(service.verify({ phone, code: "654321" }), AuthError);
  await service.verify({ phone, code: "123456" });
  await assert.rejects(service.me(undefined), AuthError);
  await service.start({ phone, role: "customer" });
  await assert.rejects(service.verify({ phone, code: "123456" }), { statusCode: 403 });
});

test("Redis OTP adapter gives codes a five-minute TTL and delegates one-use/attempt checking atomically", async () => {
  const calls = [];
  let result = "worker";
  const store = createRedisOtpStore({
    set: async (...args) => calls.push(args),
    eval: async (...args) => {
      calls.push(args);
      return result;
    },
  });
  await store.issue(phone, "digest-only", "worker");
  assert.equal(calls[0][0], `otp:${phone}`);
  assert.deepEqual(JSON.parse(calls[0][1]), { digest: "digest-only", role: "worker", attempts: 0 });
  assert.deepEqual(calls[0].slice(2), ["EX", OTP_TTL_SECONDS]);
  assert.equal(await store.consume(phone, "digest-only"), "worker");
  assert.deepEqual(calls[1].slice(1), [1, `otp:${phone}`, "digest-only", OTP_MAX_ATTEMPTS]);
  result = "admin";
  assert.equal(await store.consume(phone, "digest-only"), null);
  result = null;
  assert.equal(await store.consume(phone, "digest-only"), null);
});

function databaseFixture({
  role = "worker",
  failure,
  rollbackFails = false,
  conflict = false,
} = {}) {
  const calls = [];
  const releases = [];
  const client = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql === "ROLLBACK" && rollbackFails) throw new Error("private rollback failure");
      if (failure && sql.includes(failure)) throw new Error("private SQL/connection");
      if (sql.startsWith("INSERT INTO users")) return { rows: conflict ? [] : [{ id: worker.id }] };
      if (sql.startsWith("SELECT")) return { rows: [{ user: { ...worker, role } }] };
      return { rows: [] };
    },
    release: (discard) => releases.push(discard),
  };
  return { calls, releases, database: { connect: async () => client, query: client.query } };
}

test("worker identity and profile creation commit together and customer login creates no worker", async () => {
  const fixture = databaseFixture();
  assert.deepEqual(
    await createIdentityRepository(fixture.database).signIn(phone, "worker"),
    worker,
  );
  assert.ok(fixture.calls.some(({ sql }) => sql.startsWith("INSERT INTO workers")));
  assert.deepEqual(fixture.calls[1].values, [phone, "worker"]);
  assert.match(fixture.calls[1].sql, /WHERE users.role = EXCLUDED.role/);
  assert.equal(fixture.calls.at(-1).sql, "COMMIT");
  assert.deepEqual(fixture.releases, [false]);
  const customer = databaseFixture({ role: "customer" });
  await createIdentityRepository(customer.database).signIn(phone, "customer");
  assert.ok(!customer.calls.some(({ sql }) => sql.startsWith("INSERT INTO workers")));
});

test("role conflicts and worker insertion failures roll back and release the client once", async () => {
  for (const options of [{ conflict: true }, { failure: "INSERT INTO workers" }]) {
    const fixture = databaseFixture(options);
    await assert.rejects(createIdentityRepository(fixture.database).signIn(phone, "worker"));
    assert.equal(fixture.calls.at(-1).sql, "ROLLBACK");
    assert.ok(!fixture.calls.some(({ sql }) => sql === "COMMIT"));
    assert.deepEqual(fixture.releases, [false]);
  }
});

test("a failed rollback discards the client without double release", async () => {
  const fixture = databaseFixture({ failure: "INSERT INTO workers", rollbackFails: true });
  await assert.rejects(
    createIdentityRepository(fixture.database).signIn(phone, "worker"),
    /private SQL/,
  );
  assert.deepEqual(fixture.releases, [true]);
});

test("current identity lookup constrains user and role and rejects corrupt stored data as an internal error", async () => {
  const calls = [];
  let rows = [{ user: worker, worker: null }];
  const identities = createIdentityRepository({
    connect: async () => {
      throw new Error("unused");
    },
    query: async (sql, values) => {
      calls.push({ sql, values });
      return { rows };
    },
  });
  assert.deepEqual(await identities.current(worker.id, "worker"), { user: worker });
  assert.deepEqual(calls[0].values, [worker.id, "worker"]);
  assert.match(calls[0].sql, /WHERE u.id = \$1 AND u.role = \$2/);
  rows = [];
  assert.equal(await identities.current(worker.id, "customer"), null);
  rows = [{ user: { ...worker, phone: "private-invalid-data" }, worker: null }];
  await assert.rejects(
    identities.current(worker.id, "worker"),
    (error) => error.message === "Stored identity is invalid" && error.name !== "ZodError",
  );
});

test("Redis rate limits hash caller identities and controller fails closed on outages", async () => {
  const calls = [];
  let count = 1;
  const allow = createRedisRateLimiter(
    {
      eval: async (...args) => {
        calls.push(args);
        return count;
      },
    },
    secret,
  );
  assert.equal(await allow("otp", phone, 3, 60000), true);
  assert.ok(!JSON.stringify(calls).includes(phone));
  count = 4;
  assert.equal(await allow("otp", phone, 3, 60000), false);
  const { service } = setup();
  const controller = createAuthController(
    service,
    async () => {
      throw new Error("private Redis URL");
    },
    false,
  );
  await assert.rejects(
    controller.rateLimit("start", "127.0.0.1"),
    (error) => error.status === 503 && !error.message.includes("private"),
  );
});

function request(body, headers = {}) {
  const input = Readable.from([
    Buffer.from(typeof body === "string" ? body : JSON.stringify(body)),
  ]);
  input.headers = { "content-type": "application/json", ...headers };
  input.socket = { remoteAddress: "127.0.0.1" };
  return input;
}

test("JSON parsing rejects oversized, invalid and non-JSON requests", async () => {
  assert.deepEqual(await readJsonBody(request({ ok: true })), { ok: true });
  await assert.rejects(readJsonBody(request("invalid")), { status: 400 });
  await assert.rejects(readJsonBody(request({}, { "content-type": "text/plain" })), {
    status: 415,
  });
  const oversized = request("x".repeat(100));
  await assert.rejects(readJsonBody(oversized, 10), { status: 413 });
  assert.equal(oversized.destroyed, false);
  oversized.destroy();
  await assert.rejects(readJsonBody(request({}, { "content-length": "99999" })), { status: 413 });
});

test("auth HTTP pipeline validates origin, sets HttpOnly cookie and authenticates me without sockets", async () => {
  const { service } = setup();
  let limits = 0;
  const auth = createAuthController(
    service,
    async () => {
      limits++;
      return true;
    },
    false,
  );
  const handler = createHttpHandler({
    auth,
    publicUrl: "http://localhost:5173",
    readiness: async () => ({
      ok: true,
      database: "ok",
      redis: "ok",
      aiMode: "off",
    }),
  });
  const call = async (path, body, headers = {}) => {
    const input = request(body ?? {}, headers);
    input.method = body === undefined ? "GET" : "POST";
    input.url = path;
    const result = { status: 200, headers: {}, body: null };
    const response = {
      statusCode: 200,
      setHeader: (name, value) => {
        result.headers[name] = value;
      },
      end: (value) => {
        result.body = JSON.parse(value);
      },
    };
    await handler(input, response);
    result.status = response.statusCode;
    return result;
  };
  assert.equal((await call("/api/me")).status, 401);
  const blocked = await call(
    "/api/auth/otp/start",
    { phone, role: "worker" },
    { origin: "https://evil.test" },
  );
  assert.equal(blocked.status, 403);
  assert.equal(limits, 0);
  const start = await call("/api/auth/otp/start", { phone, role: "worker" });
  assert.deepEqual(start.body, { demoCode: "123456", demo: true });
  const signed = await call("/api/auth/otp/verify", { phone, code: "123456" });
  assert.equal(signed.status, 200);
  assert.ok(signed.headers["Set-Cookie"].includes("HttpOnly"));
  assert.ok(!JSON.stringify(signed.body).includes("token"));
  const cookie = signed.headers["Set-Cookie"].split(";", 1)[0];
  const me = await call("/api/me", undefined, { cookie });
  assert.deepEqual(me.body, { user: worker });
  assert.equal(me.headers["Cache-Control"], "no-store");
});
