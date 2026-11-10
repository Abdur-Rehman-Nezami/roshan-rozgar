import { SWEEPER_INTERVAL_MS } from "@roshan/shared";
import { loadConfig } from "./config.ts";
import { createDatabase } from "./services.ts";
import { startSweeper, sweepExpired } from "./db/sweeper.ts";

const config = loadConfig();
// The correctness backup intentionally creates no Redis connection.
const database = createDatabase(config, (event) => console.error(JSON.stringify({ event })));
const stop = startSweeper(
  async () => {
    const result = await sweepExpired(database);
    if (result.offers.length || result.holds.length)
      console.info(
        JSON.stringify({
          event: "expiry_sweep",
          offers: result.offers.length,
          holds: result.holds.length,
        }),
      );
  },
  () => console.error(JSON.stringify({ event: "expiry_sweep_failed" })),
  SWEEPER_INTERVAL_MS,
);
console.info(
  JSON.stringify({ event: "jobs_started", sweeper: true, queueConsumers: false, realtime: false }),
);
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    if (closing) return;
    closing = true;
    void stop()
      .then(() => database.end())
      .catch(() => {
        console.error(JSON.stringify({ event: "jobs_shutdown_failed" }));
        process.exitCode = 1;
      });
  });
}
