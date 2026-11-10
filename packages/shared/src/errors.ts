import { z } from "zod";

export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "WORKER_ENGAGED",
  "HOLD_EXPIRED",
  "AI_UNAVAILABLE",
  "RATE_LIMITED",
  "INTERNAL",
] as const;
export const ErrorCodeSchema = z.enum(ERROR_CODES);
export const ErrorEnvelopeSchema = z
  .object({
    error: z
      .object({ code: ErrorCodeSchema, message: z.string(), retryable: z.boolean() })
      .strict(),
  })
  .strict();
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
