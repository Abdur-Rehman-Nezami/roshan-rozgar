import { randomInt } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { MVP_AREAS, MVP_TASKS, MvpCommandSchema, MvpStateSchema } from "@roshan/shared";
import type { MvpCommand } from "@roshan/shared";
import type { SessionUser } from "../auth/session.ts";
import { requireRole } from "../auth/session.ts";
import { HttpError } from "../http/security.ts";
import { sweepExpired } from "../db/sweeper.ts";

const active = "'held','confirmed','on_the_way','arrived','in_progress'";
const invalid = (message: string) => new HttpError(400, "VALIDATION", message);
const missing = () => new HttpError(404, "NOT_FOUND", "This item is unavailable");
const overlap = () =>
  new HttpError(409, "WORKER_ENGAGED", "This worker just became busy. Choose another worker.");

export function createMvpService(database: Pick<Pool, "query" | "connect">) {
  async function state(user: SessionUser, requestId: string | null = null) {
    await sweepExpired(database);
    const values = [user.userId];
    const [workers, requests, offers, threads, messages, bookings, reviews, rates] =
      await Promise.all([
        database.query(
          `SELECT w.user_id AS id, coalesce(u.name_roman,u.name_ur,'Worker') AS name,
        w.years_exp AS years,w.rate_min AS "rateMin",w.rate_max AS "rateMax",
        (w.availability='free' AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.worker_id=w.user_id
          AND b.status IN (${active}) AND b.slot && coalesce(r.wanted,tstzrange(now(),now()+interval '2 hours')))) AS free,
        w.profile_complete AS complete,
        ARRAY(SELECT trade_slug FROM worker_trades WHERE worker_id=w.user_id) AS trades,
        ARRAY(SELECT area_id FROM worker_areas WHERE worker_id=w.user_id) AS areas,
        w.rating_avg::float AS rating,w.rating_count AS reviews,w.jobs_completed AS jobs,u.is_seeded AS seeded,
        w.review_summary->'one_liner'->>'en' AS summary,
        CASE WHEN r.lat IS NOT NULL AND u.lat IS NOT NULL THEN haversine_km(r.lat,r.lng,u.lat,u.lng) ELSE NULL END AS km
        FROM workers w JOIN users u ON u.id=w.user_id
        LEFT JOIN job_requests r ON r.id=$2::uuid AND r.customer_id=$1
        WHERE w.profile_complete OR w.user_id=$1
        ORDER BY u.is_seeded, km NULLS LAST,w.rating_avg DESC NULLS LAST LIMIT 100`,
          [user.userId, requestId],
        ),
        database.query(
          `SELECT r.id,r.task_slug AS task,r.trade_slug AS trade,r.description_text AS description,
        r.area_id AS "areaId",to_json(lower(r.wanted))#>>'{}' AS start,to_json(upper(r.wanted))#>>'{}' AS "end",r.status,
        CASE WHEN r.customer_id=$1 OR EXISTS(SELECT 1 FROM bookings b WHERE b.request_id=r.id
          AND b.worker_id=$1 AND b.status IN ('confirmed','on_the_way','arrived','in_progress','completed'))
          THEN r.address_detail ELSE NULL END AS address
        FROM job_requests r WHERE r.customer_id=$1 OR EXISTS(SELECT 1 FROM offers o WHERE o.request_id=r.id AND o.worker_id=$1)
        ORDER BY r.created_at DESC LIMIT 50`,
          values,
        ),
        database.query(
          `SELECT o.id,o.request_id AS "requestId",o.worker_id AS "workerId",o.status,
        to_json(o.expires_at)#>>'{}' AS "expiresAt",t.id AS "threadId" FROM offers o
        JOIN job_requests r ON r.id=o.request_id LEFT JOIN threads t ON t.offer_id=o.id
        WHERE r.customer_id=$1 OR o.worker_id=$1 ORDER BY o.created_at DESC LIMIT 100`,
          values,
        ),
        database.query(
          `SELECT t.id,t.request_id AS "requestId",t.worker_id AS "workerId",t.customer_id AS "customerId",
        coalesce(w.name_roman,w.name_ur,'Worker') AS "workerName",coalesce(c.name_roman,c.name_ur,'Customer') AS "customerName"
        FROM threads t JOIN users w ON w.id=t.worker_id JOIN users c ON c.id=t.customer_id
        WHERE t.worker_id=$1 OR t.customer_id=$1 ORDER BY t.created_at DESC LIMIT 50`,
          values,
        ),
        database.query(
          `SELECT m.id,m.thread_id AS "threadId",m.sender_id AS "senderId",m.kind,m.text,m.price,m.created_at::text AS "createdAt"
        FROM messages m JOIN threads t ON t.id=m.thread_id WHERE t.worker_id=$1 OR t.customer_id=$1
        ORDER BY m.created_at,m.id LIMIT 500`,
          values,
        ),
        database.query(
          `SELECT b.id,b.thread_id AS "threadId",b.request_id AS "requestId",b.worker_id AS "workerId",b.customer_id AS "customerId",
        b.status,b.agreed_price AS price,b.final_amount AS "finalAmount",to_json(b.hold_expires_at)#>>'{}' AS "expiresAt",
        (b.customer_confirmed_at IS NOT NULL) AS "customerConfirmed",(b.worker_confirmed_at IS NOT NULL) AS "workerConfirmed",
        CASE WHEN b.customer_id=$1 THEN b.arrival_code ELSE NULL END AS code,
        CASE WHEN b.customer_id=$1 OR b.status IN ('confirmed','on_the_way','arrived','in_progress','completed')
          THEN r.address_detail ELSE NULL END AS address,
        EXISTS(SELECT 1 FROM reviews v WHERE v.booking_id=b.id) AS reviewed
        FROM bookings b JOIN job_requests r ON r.id=b.request_id WHERE b.worker_id=$1 OR b.customer_id=$1
        ORDER BY b.created_at DESC LIMIT 100`,
          values,
        ),
        database.query(`SELECT v.id,v.worker_id AS "workerId",v.stars,coalesce(v.summary->>'en',v.transcript,'') AS text,v.is_seeded AS seeded
        FROM reviews v ORDER BY v.created_at DESC LIMIT 100`),
        database.query(
          "SELECT task_slug AS task,price_min AS min,price_max AS max,is_seeded AS seeded FROM rate_card",
        ),
      ]);
    const parsed = MvpStateSchema.safeParse({
      workers: workers.rows,
      requests: requests.rows,
      offers: offers.rows,
      threads: threads.rows,
      messages: messages.rows,
      bookings: bookings.rows,
      reviews: reviews.rows,
      rates: rates.rows,
    });
    if (!parsed.success) throw new Error("Stored MVP data is invalid");
    return parsed.data;
  }

  async function lockedThread(client: PoolClient, id: string, user: SessionUser) {
    const result = await client.query<{
      id: string;
      request_id: string;
      customer_id: string;
      worker_id: string;
    }>("SELECT * FROM threads WHERE id=$1 AND (customer_id=$2 OR worker_id=$2) FOR UPDATE", [
      id,
      user.userId,
    ]);
    if (!result.rows[0]) throw missing();
    return result.rows[0];
  }

  async function execute(
    client: PoolClient,
    user: SessionUser,
    input: MvpCommand,
  ): Promise<string | undefined> {
    const uid = user.userId;
    if (input.action === "profile") {
      requireRole(user, ["worker"]);
      const p = input.profile;
      if (!p.areas.every((id) => MVP_AREAS.some((a) => a.id === id)))
        throw invalid("Choose a listed service area");
      await client.query(
        `UPDATE users SET name_ur=$2,name_roman=$2,area_id=$3,
        lat=(SELECT lat FROM areas WHERE id=$3),lng=(SELECT lng FROM areas WHERE id=$3) WHERE id=$1`,
        [uid, p.name, p.areas[0]],
      );
      await client.query(
        `UPDATE workers SET years_exp=$2,rate_min=$3,rate_max=$4,profile_complete=true,
        profile_text=$5,embedding=NULL WHERE user_id=$1`,
        [
          uid,
          p.years,
          p.rateMin,
          p.rateMax,
          `${p.name}: ${p.trades.join(", ")}; ${p.years} years; ${p.areas.join(", ")}`,
        ],
      );
      for (const [table, column, items] of [
        ["worker_trades", "trade_slug", p.trades],
        ["worker_areas", "area_id", p.areas],
        [
          "worker_tasks",
          "task_slug",
          MVP_TASKS.filter((t) => p.trades.includes(t.trade)).map((t) => t.id),
        ],
      ] as const) {
        await client.query(`DELETE FROM ${table} WHERE worker_id=$1`, [uid]);
        await client.query(
          `INSERT INTO ${table} (worker_id,${column}) SELECT $1,unnest($2::text[]) ON CONFLICT DO NOTHING`,
          [uid, items],
        );
      }
      return uid;
    }
    if (input.action === "availability") {
      requireRole(user, ["worker"]);
      const result = await client.query(
        "UPDATE workers SET availability=$2,availability_updated_at=now() WHERE user_id=$1 AND profile_complete RETURNING user_id",
        [uid, input.free ? "free" : "off"],
      );
      if (!result.rows.length) throw invalid("Save your profile first");
      return uid;
    }
    if (input.action === "request") {
      requireRole(user, ["customer"]);
      const task = MVP_TASKS.find((t) => t.id === input.task);
      const area = MVP_AREAS.find((a) => a.id === input.areaId);
      if (!task || !area) throw invalid("Choose a listed task and area");
      const start = input.when ? new Date(input.when) : new Date();
      if (start.getTime() < Date.now() - 300_000) throw invalid("Choose a future time");
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
      await client.query(
        "UPDATE users SET name_ur=$2,name_roman=$2,area_id=$3,lat=$4,lng=$5 WHERE id=$1",
        [uid, input.name, area.id, area.lat, area.lng],
      );
      const result = await client.query<{ id: string }>(
        `INSERT INTO job_requests
        (customer_id,trade_slug,task_slug,description_text,area_id,lat,lng,address_detail,wanted,urgency,answers,mode)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,tstzrange($9,$10,'[)'),'today','{}','normal') RETURNING id`,
        [
          uid,
          task.trade,
          task.id,
          input.description,
          area.id,
          area.lat,
          area.lng,
          input.address,
          start,
          end,
        ],
      );
      return result.rows[0]!.id;
    }
    if (input.action === "offer") {
      requireRole(user, ["customer"]);
      const result = await client.query<{ id: string }>(
        `INSERT INTO offers(request_id,worker_id,rank,status,expires_at)
        SELECT r.id,w.user_id,1,'pending',now()+interval '60 seconds'
        FROM job_requests r JOIN workers w ON w.user_id=$3 JOIN users u ON u.id=w.user_id
        WHERE r.id=$1 AND r.customer_id=$2 AND r.status='open' AND w.availability='free' AND w.profile_complete
        AND EXISTS(SELECT 1 FROM worker_trades t WHERE t.worker_id=w.user_id AND t.trade_slug=r.trade_slug)
        AND (EXISTS(SELECT 1 FROM worker_areas a WHERE a.worker_id=w.user_id AND a.area_id=r.area_id)
          OR haversine_km(r.lat,r.lng,u.lat,u.lng)<=w.service_radius_km)
        AND NOT EXISTS(SELECT 1 FROM bookings b WHERE b.worker_id=w.user_id AND b.status IN (${active}) AND b.slot && r.wanted)
        RETURNING id`,
        [input.requestId, uid, input.workerId],
      );
      if (!result.rows[0]) throw overlap();
      return result.rows[0].id;
    }
    if (input.action === "respond") {
      requireRole(user, ["worker"]);
      const result = await client.query<{ id: string; request_id: string }>(
        `UPDATE offers SET status=$3
        WHERE id=$1 AND worker_id=$2 AND status='pending' AND expires_at>now() RETURNING id,request_id`,
        [input.offerId, uid, input.accept ? "accepted" : "declined"],
      );
      const offer = result.rows[0];
      if (!offer) throw invalid("This offer is no longer pending");
      if (!input.accept) return offer.id;
      // Lock the request so only one worker can become its negotiating party.
      const request = await client.query<{ customer_id: string; status: string }>(
        "SELECT customer_id,status FROM job_requests WHERE id=$1 FOR UPDATE",
        [offer.request_id],
      );
      if (request.rows[0]?.status !== "open") throw invalid("Another worker has already accepted");
      await client.query("UPDATE job_requests SET status='matched' WHERE id=$1", [
        offer.request_id,
      ]);
      await client.query(
        "UPDATE offers SET status='withdrawn' WHERE request_id=$1 AND id<>$2 AND status='pending'",
        [offer.request_id, offer.id],
      );
      const thread = await client.query<{ id: string }>(
        `INSERT INTO threads(request_id,offer_id,customer_id,worker_id) VALUES($1,$2,$3,$4) RETURNING id`,
        [offer.request_id, offer.id, request.rows[0].customer_id, uid],
      );
      return thread.rows[0]!.id;
    }
    if (
      ["message", "propose", "acceptPrice", "hold"].includes(input.action) &&
      "threadId" in input
    ) {
      const thread = await lockedThread(client, input.threadId, user);
      if (input.action === "message") {
        const result = await client.query<{ id: string }>(
          "INSERT INTO messages(thread_id,sender_id,kind,text,lang,created_at) VALUES($1,$2,'text',$3,$4,clock_timestamp()) RETURNING id",
          [thread.id, uid, input.text, input.lang],
        );
        return result.rows[0]!.id;
      }
      await client.query(
        "UPDATE bookings SET status='expired' WHERE worker_id=$1 AND status='held' AND hold_expires_at<=now()",
        [thread.worker_id],
      );
      const existing = await client.query<{ id: string; status: string }>(
        `SELECT id,status FROM bookings WHERE thread_id=$1 AND status IN (${active},'completed') ORDER BY created_at DESC LIMIT 1`,
        [thread.id],
      );
      if (existing.rows[0]) {
        if (input.action === "hold") return existing.rows[0].id;
        throw invalid("The price is locked for this booking");
      }
      if (input.action === "propose") {
        const result = await client.query<{ id: string }>(
          "INSERT INTO messages(thread_id,sender_id,kind,price,created_at) VALUES($1,$2,'price_proposal',$3,clock_timestamp()) RETURNING id",
          [thread.id, uid, input.price],
        );
        return result.rows[0]!.id;
      }
      if (input.action === "acceptPrice") {
        const proposal = await client.query<{ id: string; sender_id: string; price: number }>(
          "SELECT id,sender_id,price FROM messages WHERE thread_id=$1 AND kind='price_proposal' ORDER BY created_at DESC,id DESC LIMIT 1",
          [thread.id],
        );
        const p = proposal.rows[0];
        if (!p || p.id !== input.messageId || p.sender_id === uid)
          throw invalid("Accept the other person's latest price proposal");
        const result = await client.query<{ id: string }>(
          "INSERT INTO messages(thread_id,sender_id,kind,price,payload,created_at) VALUES($1,$2,'price_accept',$3,$4,clock_timestamp()) RETURNING id",
          [thread.id, uid, p.price, JSON.stringify({ proposalId: p.id })],
        );
        return result.rows[0]!.id;
      }
      if (input.action === "hold") {
        requireRole(user, ["customer"]);
        const accepted = await client.query<{ kind: string; price: number }>(
          "SELECT kind,price FROM messages WHERE thread_id=$1 AND kind IN ('price_proposal','price_accept') ORDER BY created_at DESC,id DESC LIMIT 1",
          [thread.id],
        );
        const price = accepted.rows[0];
        if (!price || price.kind !== "price_accept")
          throw invalid("Both people must agree to a price first");
        await client.query(
          "UPDATE bookings SET status='expired' WHERE worker_id=$1 AND status='held' AND hold_expires_at<=now()",
          [thread.worker_id],
        );
        const result = await client.query<{ id: string }>(
          `INSERT INTO bookings(request_id,thread_id,customer_id,worker_id,trade_slug,task_slug,city,area_id,slot,status,hold_expires_at,agreed_price,arrival_code,agreement)
          SELECT r.id,$1,$2,$3,r.trade_slug,r.task_slug,a.city,r.area_id,r.wanted,'held',now()+interval '5 minutes',$4,$5,
            jsonb_build_object('description',r.description_text,'priceRs',$4::int)
          FROM job_requests r JOIN areas a ON a.id=r.area_id JOIN workers w ON w.user_id=$3
          WHERE r.id=$6 AND r.status='matched' AND w.availability='free' AND w.profile_complete
          AND EXISTS(SELECT 1 FROM offers o JOIN threads t ON t.offer_id=o.id WHERE t.id=$1 AND o.status='accepted') RETURNING id`,
          [
            thread.id,
            uid,
            thread.worker_id,
            price.price,
            String(randomInt(0, 10000)).padStart(4, "0"),
            thread.request_id,
          ],
        );
        if (!result.rows[0]) throw overlap();
        return result.rows[0].id;
      }
    }
    if ("bookingId" in input) {
      const result = await client.query<{
        id: string;
        status: string;
        worker_id: string;
        customer_id: string;
        request_id: string;
        arrival_code: string;
        final_amount: number | null;
        expired: boolean;
      }>(
        "SELECT *,hold_expires_at<=now() AS expired FROM bookings WHERE id=$1 AND (customer_id=$2 OR worker_id=$2) FOR UPDATE",
        [input.bookingId, uid],
      );
      const booking = result.rows[0];
      if (!booking) throw missing();
      if (input.action === "confirm") {
        if (booking.status !== "held" || booking.expired)
          throw new HttpError(409, "HOLD_EXPIRED", "This hold is no longer available");
        const column =
          uid === booking.customer_id ? "customer_confirmed_at" : "worker_confirmed_at";
        await client.query(`UPDATE bookings SET ${column}=coalesce(${column},now()) WHERE id=$1`, [
          booking.id,
        ]);
        await client.query(
          "UPDATE bookings SET status='confirmed' WHERE id=$1 AND customer_confirmed_at IS NOT NULL AND worker_confirmed_at IS NOT NULL",
          [booking.id],
        );
      } else if (input.action === "cancel") {
        if (!["held", "confirmed"].includes(booking.status))
          throw invalid("This booking can no longer be cancelled");
        await client.query("UPDATE bookings SET status='cancelled' WHERE id=$1", [booking.id]);
        await client.query("UPDATE job_requests SET status='open' WHERE id=$1", [
          booking.request_id,
        ]);
        await client.query(
          "UPDATE offers SET status='withdrawn' WHERE id=(SELECT offer_id FROM threads WHERE id=(SELECT thread_id FROM bookings WHERE id=$1))",
          [booking.id],
        );
      } else if (input.action === "status") {
        requireRole(user, ["worker"]);
        if (uid !== booking.worker_id) throw missing();
        const previous = {
          on_the_way: "confirmed",
          arrived: "on_the_way",
          in_progress: "arrived",
          completed: "in_progress",
        }[input.status];
        if (booking.status !== previous) throw invalid("Finish the previous job step first");
        if (input.status === "arrived" && input.code !== booking.arrival_code)
          throw invalid("Ask the customer for the four-digit DEMO arrival code");
        if (input.status === "completed") {
          if (input.amount === undefined) throw invalid("Enter the final cash amount");
          await client.query("UPDATE bookings SET final_amount=$2 WHERE id=$1", [
            booking.id,
            input.amount,
          ]);
        } else
          await client.query("UPDATE bookings SET status=$2 WHERE id=$1", [
            booking.id,
            input.status,
          ]);
      } else if (input.action === "complete") {
        requireRole(user, ["customer"]);
        if (booking.status !== "in_progress" || booking.final_amount === null)
          throw invalid("Wait for the worker to submit the final amount");
        await client.query(
          "UPDATE bookings SET status='completed',completed_at=now() WHERE id=$1",
          [booking.id],
        );
        await client.query(
          "UPDATE workers SET jobs_completed=jobs_completed+1,availability='free',availability_updated_at=now() WHERE user_id=$1",
          [booking.worker_id],
        );
      } else if (input.action === "review") {
        requireRole(user, ["customer"]);
        if (booking.status !== "completed") throw invalid("Complete the job before reviewing it");
        await client.query(
          `INSERT INTO reviews(booking_id,customer_id,worker_id,stars,tags,transcript,summary)
          VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [
            booking.id,
            uid,
            booking.worker_id,
            input.stars,
            JSON.stringify(input.tags),
            input.text,
            JSON.stringify({ ur: input.text, roman: input.text, en: input.text }),
          ],
        );
        await client.query(
          `UPDATE workers SET rating_avg=(SELECT avg(stars) FROM reviews WHERE worker_id=$1),
          rating_count=(SELECT count(*) FROM reviews WHERE worker_id=$1),
          tag_counts=(SELECT jsonb_build_object('n',count(*),'on_time',count(*) FILTER(WHERE tags->>'on_time'='true'),
            'fair_price',count(*) FILTER(WHERE tags->>'fair_price'='true'),'clean',count(*) FILTER(WHERE tags->>'clean'='true'),
            'quality',count(*) FILTER(WHERE tags->>'quality'='true'),'hire_again',count(*) FILTER(WHERE tags->>'hire_again'='true')) FROM reviews WHERE worker_id=$1)
          WHERE user_id=$1`,
          [booking.worker_id],
        );
      }
      return booking.id;
    }
    throw invalid("Unknown action");
  }

  async function command(user: SessionUser, body: unknown) {
    const input = MvpCommandSchema.parse(body);
    const client = await database.connect();
    let discard = false;
    try {
      await client.query("BEGIN");
      const id = await execute(client, user, input);
      await client.query("COMMIT");
      return { ok: true as const, ...(id ? { id } : {}) };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        discard = true;
      }
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "23P01") throw overlap();
      if (code === "23505")
        throw new HttpError(409, "VALIDATION", "This action has already been recorded");
      throw error;
    } finally {
      client.release(discard);
    }
  }
  return { state, command };
}
