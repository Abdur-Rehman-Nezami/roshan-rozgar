import { createHash } from "node:crypto";
import type { AiRuntime } from "./runtime.ts";
import { AiError } from "./runtime.ts";

export function embed(
  runtime: AiRuntime,
  text: string,
  options: { model: string; live?: () => Promise<unknown> },
) {
  if (!text.trim() || text.length > 16000)
    throw new Error("Embedding text must contain 1–16000 characters");
  return runtime.invoke<number[]>({
    route: "embed",
    provider: "openai",
    model: options.model,
    input: text,
    ttlSeconds: 7 * 86400,
    parse: (output) => {
      if (
        !Array.isArray(output) ||
        output.length !== 1536 ||
        !output.every((value: unknown) => typeof value === "number" && Number.isFinite(value)) ||
        !output.some((value: number) => value !== 0)
      )
        throw new AiError("AI_BAD_OUTPUT");
      return output as number[];
    },
    fake: async () => {
      // Deterministic fixture vector, not a semantic embedding; demo metadata is mandatory.
      const hash = createHash("sha256").update(text).digest();
      const vector = Array.from(
        { length: 1536 },
        (_, index) => ((hash[index % hash.length] ?? 0) - 127.5) / 127.5,
      );
      const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
      return vector.map((value) => value / magnitude);
    },
    ...(options.live ? { live: options.live } : {}),
  });
}
