import { AuthError } from "../auth/session.ts";
import { AiError } from "../ai/runtime.ts";
import { ZodError } from "zod";
import type { ErrorEnvelope } from "@roshan/shared";

/** Shared by REST mutations and Engine.IO handshakes, including WebSocket upgrades. */
export function isAllowedOrigin(
  origin: string | undefined,
  fetchSite: string | undefined,
  publicUrl: string,
) {
  if (origin !== undefined) return origin === new URL(publicUrl).origin;
  return fetchSite === undefined || fetchSite === "same-origin" || fetchSite === "none";
}

export function publicError(error: unknown): { status: number; body: ErrorEnvelope } {
  if (error instanceof AuthError)
    return {
      status: error.statusCode,
      body: { error: { code: error.code, message: error.message, retryable: false } },
    };
  if (error instanceof ZodError)
    return {
      status: 400,
      body: {
        error: { code: "VALIDATION", message: "Check the submitted fields", retryable: false },
      },
    };
  if (error instanceof AiError) {
    const limited = error.code === "RATE_LIMITED";
    return {
      status: limited ? 429 : 503,
      body: {
        error: {
          code: limited ? "RATE_LIMITED" : "AI_UNAVAILABLE",
          message: limited ? "Please try again shortly" : "AI is unavailable; use the tap path",
          retryable: true,
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: { code: "INTERNAL", message: "Something went wrong; try again", retryable: true },
    },
  };
}
