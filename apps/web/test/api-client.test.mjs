import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient, ApiError } from "../src/api/client.ts";

test("API requests normalize phone input, validate output, and use same-origin cookies", async () => {
  const requests = [];
  const client = new ApiClient("https://rr.test", async (url, init) => {
    requests.push({ url, init });
    return Response.json({ demo: true, demoCode: "123456" });
  });
  assert.equal(
    (await client.request("otpStart", { body: { phone: "0300 1234567", role: "worker" } })).demo,
    true,
  );
  assert.equal(requests[0].init.credentials, "same-origin");
  assert.equal(JSON.parse(requests[0].init.body).phone, "+923001234567");
  assert.equal(requests[0].url.pathname, "/api/auth/otp/start");
});

test("invalid client input is rejected before a network request", async () => {
  let calls = 0;
  const client = new ApiClient("https://rr.test", async () => {
    calls += 1;
    throw new Error("unexpected fetch");
  });
  await assert.rejects(
    client.request("createBooking", {
      body: { threadId: "not-a-uuid", agreement: { priceRs: 1 } },
    }),
  );
  assert.equal(calls, 0);
});

test("malformed success payload never reaches the UI as valid data", async () => {
  const client = new ApiClient("https://rr.test", async () =>
    Response.json({ demoCode: "123456" }),
  );
  await assert.rejects(
    client.request("otpStart", { body: { phone: "03001234567", role: "worker" } }),
    { code: "BAD_RESPONSE", retryable: false },
  );
});

test("booking conflict errors preserve machine code for next-worker fallback", async () => {
  const client = new ApiClient("https://rr.test", async () =>
    Response.json(
      { error: { code: "WORKER_ENGAGED", message: "Worker engaged", retryable: false } },
      { status: 409 },
    ),
  );
  await assert.rejects(client.request("confirmBooking", { params: { id: "123" } }), {
    code: "WORKER_ENGAGED",
    status: 409,
    retryable: false,
  });
});

test("non-JSON gateway failures produce a safe retryable error", async () => {
  const client = new ApiClient(
    "https://rr.test",
    async () => new Response("<html>internal diagnostics</html>", { status: 502 }),
  );
  await assert.rejects(
    client.request("health"),
    (error) => error instanceof ApiError && error.retryable && error.message === "Request failed",
  );
});

test("network failures are retryable but intentional aborts remain aborts", async () => {
  const offline = new ApiClient("https://rr.test", async () => {
    throw new Error("private network diagnostics");
  });
  await assert.rejects(offline.request("health"), {
    code: "NETWORK",
    message: "Unable to reach the server",
    retryable: true,
  });
  const aborted = new ApiClient("https://rr.test", async () => {
    throw new DOMException("Cancelled", "AbortError");
  });
  await assert.rejects(aborted.request("health"), { name: "AbortError" });
});

test("route parameters cannot escape into another path or query", async () => {
  const client = new ApiClient("https://rr.test", async (url) => {
    assert.equal(url.pathname, "/api/workers/a%2Fb%3Fkey%3Dprivate");
    assert.equal(url.search, "");
    return Response.json(
      { error: { code: "NOT_FOUND", message: "Missing worker", retryable: false } },
      { status: 404 },
    );
  });
  await assert.rejects(client.request("publicWorker", { params: { id: "a/b?key=private" } }), {
    code: "NOT_FOUND",
  });
});

test("dot-only path parameters are rejected before URL normalization", async () => {
  let calls = 0;
  const client = new ApiClient("https://rr.test", async () => {
    calls += 1;
    return Response.json({});
  });
  for (const id of [".", ".."])
    await assert.rejects(
      client.request("publicWorker", { params: { id } }),
      /Invalid route parameter/,
    );
  assert.equal(calls, 0);
});
