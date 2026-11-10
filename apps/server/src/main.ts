import { createServer } from "node:http";
import { serviceInfo } from "./index.ts";

const port = Number(process.env.PORT ?? "8080");
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be between 1 and 65535");

// Foundation-only listener. F-05 replaces this entry's HTTP wiring with Fastify,
// authenticated routes, database readiness, sockets and service connections.
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method === "GET" && request.url === "/healthz") {
    response.end(JSON.stringify({ ok: true, ...serviceInfo }));
  } else if (request.method === "GET" && request.url === "/readyz") {
    response.statusCode = 503;
    response.end(JSON.stringify({ ok: false, database: "not connected", redis: "not connected" }));
  } else {
    response.statusCode = 404;
    response.end(
      JSON.stringify({
        error: { code: "NOT_FOUND", message: "Route not found", retryable: false },
      }),
    );
  }
});
server.on("error", (error) => {
  console.error("HTTP server failed:", error.message);
  process.exitCode = 1;
});
server.listen(port, process.env.HOST ?? "127.0.0.1", () => {
  console.info(`Foundation server listening on port ${port}; service readiness is pending F-05.`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close());
}
