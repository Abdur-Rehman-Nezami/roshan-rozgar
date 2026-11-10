import { createHash } from "node:crypto";
import { z } from "zod";
import { LanguageSchema } from "@roshan/shared";
import type { Language } from "@roshan/shared";
import type { AiRuntime } from "./runtime.ts";

const TranscriptSchema = z
  .object({ text: z.string(), lang: LanguageSchema, ms: z.number().nonnegative() })
  .strict();
export function transcribe(
  runtime: AiRuntime,
  audio: Uint8Array,
  options: {
    lang: Language;
    mime: string;
    model: string;
    live?: (language: "ur" | "en") => Promise<unknown>;
  },
) {
  if (!audio.length || audio.length > 2 * 1024 * 1024)
    throw new Error("Audio upload must be between 1 byte and 2 MB");
  if (!["audio/webm", "audio/mp4"].includes(options.mime.split(";")[0] ?? ""))
    throw new Error("Unsupported audio format");
  const language = options.lang === "en" ? "en" : "ur";
  return runtime.invoke({
    route: "stt",
    provider: "openai",
    model: options.model,
    input: {
      hash: createHash("sha256").update(audio).digest("hex"),
      language,
      displayLanguage: options.lang,
    },
    parse: (output) => TranscriptSchema.parse(output),
    fake: async () => ({
      text:
        language === "ur" ? "نمونہ: کچن کا نل ٹپک رہا ہے۔" : "DEMO: The kitchen tap is leaking.",
      lang: options.lang,
      ms: 0,
    }),
    ...(options.live ? { live: () => options.live!(language) } : {}),
  });
}
