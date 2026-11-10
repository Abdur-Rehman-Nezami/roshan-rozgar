import { createServer } from "node:http";
import { loadConfig } from "./config.ts";
import { createServices } from "./services.ts";
import { checkReadiness } from "./readiness.ts";
import { readAiMode } from "./ai/runtime.ts";
import { createHttpHandler } from "./http/app.ts";
import { createSocketAuthorization } from "./realtime/authorization.ts";
import { attachSockets } from "./realtime/server.ts";
import { createAuthService } from "./auth/otp.ts";
import { createRedisOtpStore } from "./auth/redis-otp.ts";
import { createIdentityRepository } from "./db/identities.ts";
import { createAuthController } from "./auth/controller.ts";
import { createRedisRateLimiter } from "./http/rate-limit.ts";
import { createMvpService } from "./mvp/service.ts";

const config = loadConfig();
const services = createServices(config, (event) => console.error(JSON.stringify({ event })));
const handler = createHttpHandler({
  mvp: createMvpService(services.database),
  publicUrl: config.PUBLIC_URL,
  auth: createAuthController(
    createAuthService({
      store: createRedisOtpStore(services.redis),
      identities: createIdentityRepository(services.database),
      secret: config.SESSION_SECRET,
      secure: config.NODE_ENV === "production",
    }),
    createRedisRateLimiter(services.redis, config.SESSION_SECRET),
    config.NODE_ENV === "production",
  ),
  readiness: async () =>
    checkReadiness(
      { database: () => services.database.query("SELECT 1"), redis: () => services.redis.ping() },
      await readAiMode(config.AI_MODE, services.redis),
    ),
});
const server = createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, handler);
const io = attachSockets(server, config, createSocketAuthorization(services.database, config));
let closing: Promise<void> | undefined;
function close() {
  closing ??= (async () => {
    const force = setTimeout(() => server.closeAllConnections(), 10_000);
    force.unref();
    try {
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await services.close();
    } finally {
      clearTimeout(force);
    }
  })();
  return closing;
}
server.on("error", () => {
  console.error(JSON.stringify({ event: "http_server_failed" }));
  process.exitCode = 1;
  void close().catch(() => {
    console.error(JSON.stringify({ event: "http_shutdown_failed" }));
  });
});
server.listen(config.PORT, config.HOST, () => {
  console.info(JSON.stringify({ event: "http_started", port: config.PORT, fastify: false }));
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void close().catch(() => {
      console.error(JSON.stringify({ event: "http_shutdown_failed" }));
      process.exitCode = 1;
    });
  });
}
