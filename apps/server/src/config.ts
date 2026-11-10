import { z } from "zod";
import { AiModeSchema } from "@roshan/shared";

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    PUBLIC_URL: z.string().url().default("http://localhost:5173"),
    DATABASE_URL: z
      .string()
      .url()
      .refine((url) => ["postgres:", "postgresql:"].includes(new URL(url).protocol)),
    REDIS_URL: z
      .string()
      .url()
      .refine((url) => ["redis:", "rediss:"].includes(new URL(url).protocol)),
    SESSION_SECRET: z
      .string()
      .refine(
        (value) => Buffer.byteLength(value, "utf8") >= 32,
        "SESSION_SECRET must contain at least 32 bytes",
      ),
    DEMO_KEY: z.string().min(16),
    AI_MODE: AiModeSchema.default("fake"),
    UPLOAD_DIR: z.string().min(1).default("./data/uploads"),
    TTS_DIR: z.string().min(1).default("./data/tts"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && new URL(env.PUBLIC_URL).protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["PUBLIC_URL"],
        message: "Production requires an HTTPS public URL",
      });
    }
    if (
      /^(?:change-me|secret|password)/i.test(env.SESSION_SECRET) ||
      /^(?:change-me|secret|password)/i.test(env.DEMO_KEY)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SESSION_SECRET"],
        message: "Replace placeholder secrets",
      });
    }
  });

export type ServerConfig = z.infer<typeof EnvSchema>;

/** Log only field names on failure, never the submitted environment values. */
export function loadConfig(input: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = EnvSchema.safeParse(input);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].join(
      ", ",
    );
    throw new Error(`Invalid server configuration: ${fields}. Check .env.example.`);
  }
  return parsed.data;
}
