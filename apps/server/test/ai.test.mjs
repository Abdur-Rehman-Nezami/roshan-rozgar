import assert from "node:assert/strict";
import test from "node:test";
import { AI_ROUTES } from "@roshan/shared";
import { AiError, AiRuntime, readAiMode, writeAiMode } from "../src/ai/runtime.ts";
import { llmJSON } from "../src/ai/llm.ts";
import { embed } from "../src/ai/embed.ts";
import { transcribe } from "../src/ai/stt.ts";
import { postgresAiAudit } from "../src/ai/log.ts";
import { redisAiCache } from "../src/ai/cache.ts";
import { synthesize } from "../src/ai/tts.ts";

function runtime(mode = "fake") {
  const records = [];
  const values = new Map();
  return {
    records,
    values,
    runtime: new AiRuntime({
      mode: async () => mode,
      allowLive: async () => true,
      audit: async (entry) => {
        records.push(entry);
      },
      cache: {
        get: async (key) => values.get(key) ?? null,
        set: async (key, value) => {
          values.set(key, value);
        },
      },
    }),
  };
}

test("all seventeen LLM routes return schema-validated, explicitly marked demo fixtures", async () => {
  const context = runtime();
  for (const route of AI_ROUTES) {
    const result = await llmJSON(
      context.runtime,
      route,
      { transcript: "private phrase" },
      { model: "fixture-model" },
    );
    assert.equal(result.demo, true);
    assert.equal(result.mode, "fake");
  }
  assert.equal(context.records.length, 17);
  assert.ok(!JSON.stringify(context.records).includes("private phrase"));
  assert.ok(context.records.every((record) => record.ok && record.provider === "fixture"));
});

test("off mode calls neither fixtures nor live providers and records a safe failure", async () => {
  const context = runtime("off");
  let called = false;
  await assert.rejects(
    context.runtime.invoke({
      route: "test",
      provider: "test",
      model: "test",
      input: "private",
      parse: (value) => value,
      fake: async () => {
        called = true;
      },
      live: async () => {
        called = true;
      },
    }),
    { code: "AI_OFF" },
  );
  assert.equal(called, false);
  assert.equal(context.records[0].errorCode, "AI_OFF");
});

test("mode lookup fails closed during a configuration outage", async () => {
  assert.equal(
    await readAiMode("live", {
      get: async () => {
        throw new Error("Redis unavailable");
      },
    }),
    "off",
  );
  assert.equal(await readAiMode("fake", { get: async () => "off" }), "off");
  const values = new Map();
  await writeAiMode(
    {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => values.set(key, value),
    },
    "fake",
  );
  assert.equal(values.get("cfg:ai_mode"), "fake");
});

test("cache keys isolate fake/live outputs and cached output is validated again", async () => {
  let mode = "fake";
  let calls = 0;
  const values = new Map();
  const instance = new AiRuntime({
    mode: async () => mode,
    allowLive: async () => true,
    audit: async () => {},
    cache: {
      get: async (key) => values.get(key) ?? null,
      set: async (key, value) => values.set(key, value),
    },
  });
  const request = {
    route: "test",
    provider: "test",
    model: "test",
    input: "same",
    parse: (value) => {
      if (typeof value !== "string") throw new Error();
      return value;
    },
    fake: async () => "DEMO",
    live: async () => {
      calls += 1;
      return "live";
    },
  };
  assert.equal((await instance.invoke(request)).data, "DEMO");
  assert.equal((await instance.invoke(request)).cached, true);
  mode = "live";
  assert.equal((await instance.invoke(request)).data, "live");
  assert.equal(calls, 1);
  assert.equal(values.size, 2);
  const liveKey = [...values.keys()].find((key) => key.startsWith("ai:live:"));
  values.set(liveKey, JSON.stringify({ invalid: true }));
  assert.equal((await instance.invoke(request)).data, "live");
  assert.equal(calls, 2);
});

test("invalid provider output produces a typed failure without logging raw content", async () => {
  const context = runtime("live");
  await assert.rejects(
    llmJSON(
      context.runtime,
      "extract_years",
      {},
      { model: "test", live: async () => ({ private: "sensitive result" }) },
    ),
    { code: "AI_BAD_OUTPUT" },
  );
  assert.ok(!JSON.stringify(context.records).includes("sensitive result"));
});

test("unconfigured live providers fail rather than silently returning fake data", async () => {
  const context = runtime("live");
  await assert.rejects(llmJSON(context.runtime, "extract_name", {}, { model: "unconfigured" }), {
    code: "AI_UNAVAILABLE",
  });
});

test("fixture embeddings are reproducible nonzero vectors with demo metadata", async () => {
  const context = runtime();
  const first = await embed(context.runtime, "demo plumbing", { model: "fixture" });
  assert.equal(first.data.length, 1536);
  assert.equal(first.demo, true);
  assert.deepEqual(
    first.data,
    (await embed(context.runtime, "demo plumbing", { model: "fixture" })).data,
  );
  assert.ok(Math.abs(first.data.reduce((sum, value) => sum + value * value, 0) - 1) < 1e-10);
});

test("STT marks fake transcripts and forces spoken Roman Urdu to Urdu in live adapters", async () => {
  const fixture = runtime();
  assert.equal(
    (
      await transcribe(fixture.runtime, new Uint8Array([1]), {
        lang: "roman",
        mime: "audio/webm;codecs=opus",
        model: "fixture",
      })
    ).demo,
    true,
  );
  const live = runtime("live");
  let selected;
  await transcribe(live.runtime, new Uint8Array([1]), {
    lang: "roman",
    mime: "audio/mp4",
    model: "test",
    live: async (language) => {
      selected = language;
      return { text: "آواز", lang: "roman", ms: 1 };
    },
  });
  assert.equal(selected, "ur");
  assert.throws(() =>
    transcribe(live.runtime, new Uint8Array(2 * 1024 * 1024 + 1), {
      lang: "en",
      mime: "audio/mp4",
      model: "test",
    }),
  );
});

test("missing speech fixtures return unavailable so captions/taps remain the honest fallback", async () => {
  await assert.rejects(
    synthesize(runtime().runtime, "Demo", {
      lang: "en",
      rate: 1,
      voice: "fixture",
      model: "fixture",
    }),
    AiError,
  );
});

test("persistent audit selects safe metadata even if an extra sensitive field is supplied", async () => {
  const writes = [];
  const audit = postgresAiAudit({
    async query(sql, params) {
      writes.push({ sql, params });
      return { rows: [] };
    },
  });
  await audit({
    route: "extract_name",
    provider: "fixture",
    model: "demo",
    mode: "fake",
    latencyMs: 1,
    ok: true,
    cached: false,
    errorCode: null,
    transcript: "private phone and address",
  });
  assert.equal(writes.length, 1);
  assert.ok(!JSON.stringify(writes).includes("private phone and address"));
});

test("audit failure surfaces as typed unavailable rather than leaking driver details", async () => {
  const instance = new AiRuntime({
    mode: async () => "fake",
    audit: async () => {
      throw new Error("private database details");
    },
  });
  await assert.rejects(
    llmJSON(instance, "extract_name", {}, { model: "fixture" }),
    (error) => error instanceof AiError && !error.message.includes("private database details"),
  );
});

test("Redis cache adapter requires expiring entries and preserves failure visibility", async () => {
  const values = new Map();
  const cache = redisAiCache({
    get: async (key) => values.get(key) ?? null,
    set: async (key, value, mode, ttl) => {
      assert.equal(mode, "EX");
      assert.ok(ttl > 0);
      values.set(key, value);
    },
  });
  await cache.set("test", "value", 60);
  assert.equal(await cache.get("test"), "value");
  assert.throws(() => cache.set("test", "value", 0));
});

test("a refused live-call budget prevents the provider from being invoked", async () => {
  let called = false;
  const instance = new AiRuntime({
    mode: async () => "live",
    allowLive: async () => false,
    audit: async () => {},
  });
  await assert.rejects(
    llmJSON(
      instance,
      "extract_name",
      {},
      {
        model: "test",
        live: async () => {
          called = true;
          return {};
        },
      },
    ),
    { code: "RATE_LIMITED" },
  );
  assert.equal(called, false);
});
