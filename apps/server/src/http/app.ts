import type { IncomingMessage, ServerResponse } from "node:http";
import { IdSchema } from "@roshan/shared";
import type { ReadinessSchema } from "@roshan/shared";
import type { z } from "zod";
import { HttpError, isAllowedOrigin, publicError } from "./security.ts";
import { readJsonBody } from "./body.ts";
import type { createAuthController } from "../auth/controller.ts";
import type { createMvpService } from "../mvp/service.ts";
import { serviceInfo } from "../index.ts";

/** Interim transport while Fastify plugins are unavailable; domain services stay transport-free. */
export function createHttpHandler(options: {
  readiness: () => Promise<z.infer<typeof ReadinessSchema>>;
  publicUrl?: string;
  auth?: ReturnType<typeof createAuthController>;
  mvp?: ReturnType<typeof createMvpService>;
}) {
  return async (request: IncomingMessage, response: ServerResponse) => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    try {
      const url = new URL(request.url ?? "/", "http://internal");
      const pathname = url.pathname;
      if (request.method === "GET" && pathname === "/healthz") {
        response.end(JSON.stringify({ ok: true, ...serviceInfo }));
      } else if (request.method === "GET" && pathname === "/readyz") {
        const readiness = await options.readiness();
        response.statusCode = readiness.ok ? 200 : 503;
        response.end(JSON.stringify(readiness));
      } else if (request.method === "GET" && pathname === "/api/me" && options.auth) {
        response.end(JSON.stringify(await options.auth.me(request.headers.cookie)));
      } else if (pathname.startsWith("/api/mvp/") && options.auth && options.mvp) {
        const current = await options.auth.me(request.headers.cookie);
        const user = { userId: current.user.id, role: current.user.role };
        if (request.method === "GET" && pathname === "/api/mvp/state") {
          const id = url.searchParams.get("requestId");
          if (id !== null) IdSchema.parse(id);
          response.end(JSON.stringify(await options.mvp.state(user, id)));
        } else if (request.method === "POST" && pathname === "/api/mvp/command") {
          const site = request.headers["sec-fetch-site"];
          if (
            !options.publicUrl ||
            !isAllowedOrigin(
              request.headers.origin,
              typeof site === "string" ? site : undefined,
              options.publicUrl,
            )
          )
            throw new HttpError(403, "FORBIDDEN", "Use this site's controls");
          response.end(
            JSON.stringify(await options.mvp.command(user, await readJsonBody(request))),
          );
        } else throw new HttpError(404, "NOT_FOUND", "Route not found");
      } else if (
        request.method === "POST" &&
        (pathname === "/api/auth/otp/start" || pathname === "/api/auth/otp/verify") &&
        options.auth
      ) {
        const fetchSite = request.headers["sec-fetch-site"];
        if (
          !options.publicUrl ||
          !isAllowedOrigin(
            request.headers.origin,
            typeof fetchSite === "string" ? fetchSite : undefined,
            options.publicUrl,
          )
        )
          throw new HttpError(403, "FORBIDDEN", "Use this site's sign-in form");
        const operation = pathname.endsWith("/start") ? "start" : "verify";
        await options.auth.rateLimit(operation, request.socket.remoteAddress ?? "unknown");
        const body = await readJsonBody(request);
        if (operation === "start") response.end(JSON.stringify(await options.auth.start(body)));
        else {
          const result = await options.auth.verify(body);
          response.setHeader("Set-Cookie", result.cookie);
          response.end(JSON.stringify(result.body));
        }
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
      if (failure.status === 429) response.setHeader("Retry-After", "60");
      // Close rejected POSTs rather than retaining a connection with an unread body.
      if (request.method === "POST") response.setHeader("Connection", "close");
      response.statusCode = failure.status;
      response.end(JSON.stringify(failure.body));
    }
  };
}
