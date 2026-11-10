import type { IncomingMessage, ServerResponse } from "node:http";
import type { ReadinessSchema } from "@roshan/shared";
import type { z } from "zod";
import { publicError } from "./security.ts";
import { serviceInfo } from "../index.ts";

/** Interim transport while Fastify plugins are unavailable; domain services stay transport-free. */
export function createHttpHandler(options: {
  readiness: () => Promise<z.infer<typeof ReadinessSchema>>;
}) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    try {
      const pathname = new URL(request.url ?? "/", "http://internal").pathname;
      if (request.method === "GET" && pathname === "/healthz") {
        response.end(JSON.stringify({ ok: true, ...serviceInfo }));
      } else if (request.method === "GET" && pathname === "/readyz") {
        const readiness = await options.readiness();
        response.statusCode = readiness.ok ? 200 : 503;
        response.end(JSON.stringify(readiness));
      } else {
        response.statusCode = 404;
        response.end(
          JSON.stringify({
            error: { code: "NOT_FOUND", message: "Route not found", retryable: false },
          }),
        );
      }
    } catch (error) {
      const failure = publicError(error);
      response.statusCode = failure.status;
      response.end(JSON.stringify(failure.body));
    }
  };
}
