import { createHash } from "node:crypto";
import { AiModeSchema } from "@roshan/shared";
import type { AiMode, JsonValue } from "@roshan/shared";

export class AiError extends Error {
  readonly code: "AI_OFF" | "AI_UNAVAILABLE" | "AI_BAD_OUTPUT" | "RATE_LIMITED";
  constructor(code: AiError["code"]) {
    super(
      code === "AI_OFF"
        ? "AI is turned off; use the tap path"
        : "AI is unavailable; use the fallback",
    );
    this.name = "AiError";
    this.code = code;
  }
}
export interface StringStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}
export interface AiCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<unknown>;
}
export interface AiAudit {
  effort?: "low" | "medium" | "high";
  route: string;
  provider: string;
  model: string;
  mode: AiMode;
  latencyMs: number;
  ok: boolean;
  cached: boolean;
  errorCode: string | null;
}
export interface AiResult<T> {
  data: T;
  mode: AiMode;
  demo: boolean;
  cached: boolean;
}
export interface AiInvocation<T> {
  effort?: "low" | "medium" | "high";
  route: string;
  model: string;
  provider: string;
  input: JsonValue;
  parse: (output: unknown) => T;
  fake?: () => Promise<unknown>;
  live?: () => Promise<unknown>;
  ttlSeconds?: number;
}

/** If Redis config is unavailable, fail closed to tap-only rather than enabling live calls. */
export async function readAiMode(
  fallback: AiMode,
  store?: Pick<StringStore, "get">,
): Promise<AiMode> {
  if (!store) return AiModeSchema.parse(fallback);
  try {
    const configured = await store.get("cfg:ai_mode");
    return configured === null ? AiModeSchema.parse(fallback) : AiModeSchema.parse(configured);
  } catch {
    return "off";
  }
}
export async function writeAiMode(store: StringStore, mode: AiMode) {
  await store.set("cfg:ai_mode", AiModeSchema.parse(mode));
}

export class AiRuntime {
  private readonly mode: () => Promise<AiMode>;
  private readonly audit: (entry: AiAudit) => Promise<void>;
  private readonly cache: AiCache | undefined;
  private readonly allowLive: ((route: string) => Promise<boolean>) | undefined;
  constructor(options: {
    mode: () => Promise<AiMode>;
    audit: (entry: AiAudit) => Promise<void>;
    cache?: AiCache;
    allowLive?: (route: string) => Promise<boolean>;
  }) {
    this.mode = options.mode;
    this.audit = options.audit;
    this.cache = options.cache;
    this.allowLive = options.allowLive;
  }
  private async record(entry: AiAudit) {
    try {
      await this.audit(entry);
    } catch {
      throw new AiError("AI_UNAVAILABLE");
    }
  }
  async invoke<T>(request: AiInvocation<T>): Promise<AiResult<T>> {
    const started = performance.now();
    const mode = AiModeSchema.parse(await this.mode());
    const useCache = (request.ttlSeconds ?? 86400) > 0;
    const digest = createHash("sha256").update(JSON.stringify(request.input)).digest("hex");
    const key = `ai:${mode}:${request.provider}:${request.model}:${request.route}:${digest}`;
    let cached = false;
    let data: T;
    const base = {
      route: request.route,
      model: request.model,
      provider: mode === "fake" ? "fixture" : request.provider,
      mode,
      ...(request.effort ? { effort: request.effort } : {}),
    };
    try {
      if (mode === "off") throw new AiError("AI_OFF");
      let hit: string | null = null;
      try {
        hit = useCache ? ((await this.cache?.get(key)) ?? null) : null;
      } catch {
        /* Cache outage is not a correctness dependency. */
      }
      if (hit !== null) {
        try {
          data = request.parse(JSON.parse(hit));
          cached = true;
        } catch {
          hit = null;
        }
      }
      if (hit === null) {
        const adapter = mode === "fake" ? request.fake : request.live;
        if (!adapter) throw new AiError("AI_UNAVAILABLE");
        if (mode === "live") {
          if (!this.allowLive) throw new AiError("AI_UNAVAILABLE");
          if (!(await this.allowLive(request.route))) throw new AiError("RATE_LIMITED");
        }
        const raw = await adapter();
        try {
          data = request.parse(raw);
        } catch {
          throw new AiError("AI_BAD_OUTPUT");
        }
        try {
          if (useCache)
            await this.cache?.set(key, JSON.stringify(data), request.ttlSeconds ?? 86400);
        } catch {
          /* Continue uncached. */
        }
      }
    } catch (error) {
      const safe = error instanceof AiError ? error : new AiError("AI_UNAVAILABLE");
      await this.record({
        ...base,
        latencyMs: Math.round(performance.now() - started),
        ok: false,
        cached,
        errorCode: safe.code,
      });
      throw safe;
    }
    await this.record({
      ...base,
      latencyMs: Math.round(performance.now() - started),
      ok: true,
      cached,
      errorCode: null,
    });
    return { data: data!, mode, demo: mode === "fake", cached };
  }
}
