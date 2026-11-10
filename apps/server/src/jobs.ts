import { SWEEPER_INTERVAL_MS } from "@roshan/shared";

// Queue registration and the database sweeper are supplied by F-05.
// Keep a watchable process now, with an explicit statement of its capabilities.
console.info(
  "Jobs foundation running. Queue consumers and database sweeper are not registered yet.",
);
const heartbeat = setInterval(() => {}, SWEEPER_INTERVAL_MS);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => clearInterval(heartbeat));
}
