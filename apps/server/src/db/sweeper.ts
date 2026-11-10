import type { Pool } from "pg";

export interface ExpiredOffer {
  id: string;
  requestId: string;
  workerId: string;
}
export interface ExpiredHold {
  id: string;
  customerId: string;
  workerId: string;
  requestId: string;
}
export interface SweepResult {
  offers: ExpiredOffer[];
  holds: ExpiredHold[];
}

// No Redis dependency: authoritative expirations still run during a Redis outage.
export async function sweepExpired(database: Pick<Pool, "query">): Promise<SweepResult> {
  const offers = await database.query<ExpiredOffer>(`
    UPDATE offers SET status = 'expired'
    WHERE status = 'pending' AND expires_at <= now()
    RETURNING id, request_id AS "requestId", worker_id AS "workerId"
  `);
  const holds = await database.query<ExpiredHold>(`
    UPDATE bookings SET status = 'expired'
    WHERE status = 'held' AND hold_expires_at <= now()
    RETURNING id, customer_id AS "customerId", worker_id AS "workerId", request_id AS "requestId"
  `);
  return { offers: offers.rows, holds: holds.rows };
}

/** Prevent overlapping sweeps on a slow DB. Closing waits for an in-flight sweep. */
export function startSweeper(
  sweep: () => Promise<unknown>,
  onError: (error: unknown) => void,
  intervalMs = 15_000,
) {
  let pending: Promise<void> | undefined;
  const tick = () => {
    if (pending) return;
    pending = Promise.resolve()
      .then(sweep)
      .then(() => {}, onError)
      .finally(() => {
        pending = undefined;
      });
  };
  const timer = setInterval(tick, intervalMs);
  tick();
  return async () => {
    clearInterval(timer);
    await pending;
  };
}
