import { readFile } from "node:fs/promises";
import { AI_EFFORT, AI_OUTPUT_SCHEMAS } from "@roshan/shared";
import type { AiOutput, AiRoute, JsonValue } from "@roshan/shared";
import type { AiRuntime } from "./runtime.ts";

export function llmJSON<R extends AiRoute>(
  runtime: AiRuntime,
  route: R,
  input: JsonValue,
  options: { model: string; live?: () => Promise<unknown> },
) {
  if (!Object.hasOwn(AI_OUTPUT_SCHEMAS, route)) throw new Error("Unknown AI route");
  return runtime.invoke<AiOutput<R>>({
    route,
    effort: AI_EFFORT[route],
    provider: "anthropic",
    model: options.model,
    input,
    parse: (output) => AI_OUTPUT_SCHEMAS[route].parse(output) as AiOutput<R>,
    fake: async () =>
      JSON.parse(
        await readFile(new URL(`./fake/${route}.json`, import.meta.url), "utf8"),
      ) as unknown,
    ...(options.live ? { live: options.live } : {}),
  });
}
