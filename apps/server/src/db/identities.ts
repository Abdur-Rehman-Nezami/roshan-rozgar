import type { Pool } from "pg";
import { UserSchema, WorkerSchema } from "@roshan/shared";
import type { IdentityRepository } from "../auth/otp.ts";
import { AuthError } from "../auth/session.ts";

const USER_JSON = `json_build_object(
  'id', u.id, 'role', u.role, 'phone', u.phone,
  'name', CASE WHEN u.name_ur IS NULL AND u.name_roman IS NULL THEN NULL ELSE
    json_build_object('ur', coalesce(u.name_ur, u.name_roman, ''),
      'roman', coalesce(u.name_roman, u.name_ur, ''),
      'en', coalesce(u.name_roman, u.name_ur, '')) END,
  'lang', u.lang, 'areaId', u.area_id,
  'coordinates', CASE WHEN u.lat IS NULL OR u.lng IS NULL THEN NULL ELSE
    json_build_object('lat', u.lat, 'lng', u.lng) END,
  'isSeeded', u.is_seeded, 'createdAt', u.created_at
)`;
const WORKER_JSON = `json_build_object(
  'userId', w.user_id, 'yearsExp', w.years_exp, 'rateMin', w.rate_min,
  'rateMax', w.rate_max, 'serviceRadiusKm', w.service_radius_km,
  'availability', w.availability, 'availabilityUpdatedAt', w.availability_updated_at,
  'photoUrl', w.photo_url, 'voiceIntroUrl', w.voice_intro_url, 'profileText', w.profile_text,
  'profileComplete', w.profile_complete, 'autoRespond', w.auto_respond,
  'ratingAvg', w.rating_avg::float, 'ratingCount', w.rating_count,
  'jobsCompleted', w.jobs_completed, 'repeatCustomers', w.repeat_customers,
  'tagCounts', jsonb_build_object(
    'on_time', coalesce((w.tag_counts->>'on_time')::int, 0),
    'fair_price', coalesce((w.tag_counts->>'fair_price')::int, 0),
    'clean', coalesce((w.tag_counts->>'clean')::int, 0),
    'quality', coalesce((w.tag_counts->>'quality')::int, 0),
    'hire_again', coalesce((w.tag_counts->>'hire_again')::int, 0),
    'n', coalesce((w.tag_counts->>'n')::int, 0)),
  'reviewSummary', w.review_summary
)`;

export function createIdentityRepository(
  database: Pick<Pool, "connect" | "query">,
): IdentityRepository {
  return {
    async signIn(phone, role) {
      const client = await database.connect();
      let discard = false;
      try {
        await client.query("BEGIN");
        // Preserve an existing role; mocked login must never turn a customer into an admin/worker.
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO users (phone, role) VALUES ($1, $2)
           ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
           WHERE users.role = EXCLUDED.role RETURNING id`,
          [phone, role],
        );
        const id = inserted.rows[0]?.id;
        if (!id) throw new AuthError(true);
        if (role === "worker")
          await client.query(
            "INSERT INTO workers (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING",
            [id],
          );
        const result = await client.query<{ user: unknown }>(
          `SELECT ${USER_JSON} AS "user" FROM users u WHERE u.id = $1`,
          [id],
        );
        const parsed = UserSchema.safeParse(result.rows[0]?.user);
        if (!parsed.success) throw new Error("Stored user is invalid");
        const user = parsed.data;
        await client.query("COMMIT");
        return user;
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          discard = true;
        }
        throw error;
      } finally {
        client.release(discard);
      }
    },
    async current(userId, role) {
      const result = await database.query<{ user: unknown; worker: unknown }>(
        `SELECT ${USER_JSON} AS "user",
          CASE WHEN w.user_id IS NULL THEN NULL ELSE ${WORKER_JSON} END AS worker
         FROM users u LEFT JOIN workers w ON w.user_id = u.id
         WHERE u.id = $1 AND u.role = $2`,
        [userId, role],
      );
      const row = result.rows[0];
      if (!row) return null;
      const user = UserSchema.safeParse(row.user);
      const worker = row.worker === null ? null : WorkerSchema.safeParse(row.worker);
      if (!user.success || (worker && !worker.success))
        throw new Error("Stored identity is invalid");
      return {
        user: user.data,
        ...(worker?.success ? { worker: worker.data } : {}),
      };
    },
  };
}
