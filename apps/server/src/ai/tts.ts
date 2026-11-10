import type { AiRuntime } from "./runtime.ts";
import { AiError } from "./runtime.ts";
import type { Language } from "@roshan/shared";

export function synthesize(
  runtime: AiRuntime,
  text: string,
  options: {
    lang: Language;
    rate: number;
    voice: string;
    model: string;
    live?: () => Promise<unknown>;
  },
) {
  if (
    !text.trim() ||
    text.length > 4000 ||
    !Number.isFinite(options.rate) ||
    options.rate < 0.5 ||
    options.rate > 2
  )
    throw new Error("Invalid speech request");
  return runtime.invoke<Uint8Array>({
    route: "tts",
    provider: "speech",
    model: options.model,
    input: { text, language: options.lang, voice: options.voice, rate: options.rate },
    ttlSeconds: 0,
    parse: (output) => {
      if (!(output instanceof Uint8Array) || !output.length) throw new AiError("AI_BAD_OUTPUT");
      return output;
    },
    // No prerecorded audio exists yet. Return a typed unavailable result, never silent/fake speech.
    fake: async () => {
      throw new AiError("AI_UNAVAILABLE");
    },
    ...(options.live ? { live: options.live } : {}),
  });
}
