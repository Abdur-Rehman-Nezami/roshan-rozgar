import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  char,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// Column/query mirror. Handwritten SQL migrations own extensions, exclusion constraints
// and Haversine function. Never replace them with drizzle-kit push.
const timeRange = customType({ dataType: () => "tstzrange" });

export const areas = pgTable("areas", {
  id: text("id").primaryKey(),
  city: text("city").notNull(),
  nameEn: text("name_en").notNull(),
  nameUr: text("name_ur").notNull(),
  nameRoman: text("name_roman").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
});

export const trades = pgTable("trades", {
  slug: text("slug").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameUr: text("name_ur").notNull(),
  nameRoman: text("name_roman").notNull(),
  photo: text("photo").notNull(),
  icon: text("icon").notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: text("role").notNull(),
    phone: text("phone").notNull().unique(),
    nameUr: text("name_ur"),
    nameRoman: text("name_roman"),
    lang: text("lang")
      .notNull()
      .default(sql`'ur'`),
    areaId: text("area_id").references(() => areas.id),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    isSeeded: boolean("is_seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [
    check("users_role_check", sql`role IN ('worker','customer','admin')`),
    check("users_lang_check", sql`lang IN ('ur','roman','en')`),
  ],
);

export const workers = pgTable(
  "workers",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    yearsExp: integer("years_exp"),
    rateMin: integer("rate_min"),
    rateMax: integer("rate_max"),
    serviceRadiusKm: integer("service_radius_km").notNull().default(8),
    availability: text("availability")
      .notNull()
      .default(sql`'off'`),
    availabilityUpdatedAt: timestamp("availability_updated_at", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    photoUrl: text("photo_url"),
    voiceIntroUrl: text("voice_intro_url"),
    profileText: text("profile_text"),
    profileComplete: boolean("profile_complete").notNull().default(false),
    autoRespond: boolean("auto_respond").notNull().default(false),
    ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }),
    ratingCount: integer("rating_count").notNull().default(0),
    jobsCompleted: integer("jobs_completed").notNull().default(0),
    repeatCustomers: integer("repeat_customers").notNull().default(0),
    tagCounts: jsonb("tag_counts")
      .notNull()
      .default(sql`'{}'`),
    reviewSummary: jsonb("review_summary"),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    check("workers_availability_check", sql`availability IN ('free','off')`),
    check(
      "worker_rates_valid",
      sql`(rate_min IS NULL OR rate_min >= 0)
  AND (rate_max IS NULL OR rate_max >= 0)
  AND (rate_min IS NULL OR rate_max IS NULL OR rate_max >= rate_min)`,
    ),
    index("workers_hnsw").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const workerTrades = pgTable(
  "worker_trades",
  {
    workerId: uuid("worker_id").references(() => workers.userId, { onDelete: "cascade" }),
    tradeSlug: text("trade_slug").references(() => trades.slug),
  },
  (table) => [primaryKey({ columns: [table.workerId, table.tradeSlug] })],
);

export const workerTasks = pgTable(
  "worker_tasks",
  {
    workerId: uuid("worker_id").references(() => workers.userId, { onDelete: "cascade" }),
    taskSlug: text("task_slug").notNull(),
  },
  (table) => [primaryKey({ columns: [table.workerId, table.taskSlug] })],
);

export const workerAreas = pgTable(
  "worker_areas",
  {
    workerId: uuid("worker_id").references(() => workers.userId, { onDelete: "cascade" }),
    areaId: text("area_id").references(() => areas.id),
  },
  (table) => [primaryKey({ columns: [table.workerId, table.areaId] })],
);

export const workerSlots = pgTable(
  "worker_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workerId: uuid("worker_id").references(() => workers.userId, { onDelete: "cascade" }),
    slot: timeRange("slot").notNull(),
    source: text("source").notNull(),
  },
  () => [check("worker_slots_source_check", sql`source IN ('voice','tap')`)],
);

export const workerPhotos = pgTable(
  "worker_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workerId: uuid("worker_id").references(() => workers.userId, { onDelete: "cascade" }),
    url: text("url").notNull(),
    kind: text("kind").notNull(),
    aiTags: text("ai_tags")
      .array()
      .notNull()
      .default(sql`'{}'`),
    caption: jsonb("caption"),
  },
  () => [check("worker_photos_kind_check", sql`kind IN ('face','work')`)],
);

export const rateCard = pgTable(
  "rate_card",
  {
    taskSlug: text("task_slug").primaryKey(),
    tradeSlug: text("trade_slug").references(() => trades.slug),
    nameEn: text("name_en"),
    nameUr: text("name_ur"),
    nameRoman: text("name_roman"),
    priceMin: integer("price_min").notNull(),
    priceMax: integer("price_max").notNull(),
    typicalMinutes: integer("typical_minutes").notNull(),
    isSeeded: boolean("is_seeded").notNull().default(true),
  },
  () => [
    check(
      "rate_card_prices_valid",
      sql`price_min >= 0 AND price_max >= price_min AND typical_minutes > 0`,
    ),
  ],
);

export const jobRequests = pgTable(
  "job_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => users.id),
    tradeSlug: text("trade_slug").references(() => trades.slug),
    taskSlug: text("task_slug"),
    descriptionText: text("description_text"),
    descriptionAudioUrl: text("description_audio_url"),
    photoUrl: text("photo_url"),
    triage: jsonb("triage"),
    answers: jsonb("answers"),
    urgency: text("urgency"),
    wanted: timeRange("wanted"),
    areaId: text("area_id").references(() => areas.id),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    addressDetail: text("address_detail"),
    mode: text("mode")
      .notNull()
      .default(sql`'normal'`),
    status: text("status")
      .notNull()
      .default(sql`'open'`),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [
    check("job_requests_urgency_check", sql`urgency IN ('emergency','today','scheduled')`),
    check("job_requests_mode_check", sql`mode IN ('normal','emergency')`),
    check("job_requests_status_check", sql`status IN ('open','matched','cancelled','expired')`),
  ],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").references(() => jobRequests.id, { onDelete: "cascade" }),
    workerId: uuid("worker_id").references(() => workers.userId),
    rank: integer("rank").notNull(),
    status: text("status").notNull(),
    counterPrice: integer("counter_price"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "offers_status_check",
      sql`status IN ('pending','accepted','countered','declined','expired','withdrawn')`,
    ),
    unique().on(table.requestId, table.workerId),
    index("offers_expiry")
      .on(table.expiresAt)
      .where(sql`status = 'pending'`),
  ],
);

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").references(() => jobRequests.id),
  offerId: uuid("offer_id").references(() => offers.id),
  customerId: uuid("customer_id").references(() => users.id),
  workerId: uuid("worker_id").references(() => workers.userId),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").references(() => threads.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").references(() => users.id),
    kind: text("kind").notNull(),
    text: text("text"),
    audioUrl: text("audio_url"),
    lang: text("lang"),
    translations: jsonb("translations"),
    price: integer("price"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [
    check(
      "messages_kind_check",
      sql`kind IN ('text','voice','price_proposal','price_accept','system','agreement')`,
    ),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").references(() => jobRequests.id),
    threadId: uuid("thread_id").references(() => threads.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.userId),
    tradeSlug: text("trade_slug"),
    taskSlug: text("task_slug"),
    city: text("city"),
    areaId: text("area_id").references(() => areas.id),
    slot: timeRange("slot").notNull(),
    status: text("status").notNull(),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true, mode: "string" }),
    agreedPrice: integer("agreed_price"),
    finalAmount: integer("final_amount"),
    agreement: jsonb("agreement"),
    customerConfirmedAt: timestamp("customer_confirmed_at", { withTimezone: true, mode: "string" }),
    workerConfirmedAt: timestamp("worker_confirmed_at", { withTimezone: true, mode: "string" }),
    arrivalCode: char("arrival_code", { length: 4 }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    isSeeded: boolean("is_seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "bookings_status_check",
      sql`status IN ('held','confirmed','on_the_way','arrived','in_progress','completed','cancelled','expired')`,
    ),
    check(
      "booking_slot_valid",
      sql`NOT isempty(slot) AND NOT lower_inf(slot) AND NOT upper_inf(slot)
  AND lower_inc(slot) AND NOT upper_inc(slot)`,
    ),
    check("held_booking_has_expiry", sql`status <> 'held' OR hold_expires_at IS NOT NULL`),
    check(
      "booking_amounts_valid",
      sql`(agreed_price IS NULL OR agreed_price >= 0)
  AND (final_amount IS NULL OR final_amount >= 0)`,
    ),
    index("bookings_worker_active")
      .on(table.workerId)
      .where(sql`status IN ('held','confirmed','on_the_way','arrived','in_progress')`),
    index("bookings_price_stats")
      .on(table.taskSlug, table.city, table.completedAt)
      .where(sql`status = 'completed'`),
    index("bookings_hold_expiry")
      .on(table.holdExpiresAt)
      .where(sql`status = 'held'`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .unique()
      .references(() => bookings.id),
    customerId: uuid("customer_id").references(() => users.id),
    workerId: uuid("worker_id").references(() => workers.userId),
    stars: integer("stars"),
    tags: jsonb("tags").notNull(),
    transcript: text("transcript"),
    audioUrl: text("audio_url"),
    photoUrl: text("photo_url"),
    summary: jsonb("summary"),
    isSeeded: boolean("is_seeded").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  () => [check("reviews_stars_check", sql`stars BETWEEN 1 AND 5`)],
);

export const kbDocs = pgTable(
  "kb_docs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    refId: text("ref_id").notNull(),
    screenId: text("screen_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    searchText: text("search_text").notNull(),
    meta: jsonb("meta")
      .notNull()
      .default(sql`'{}'`),
    embedding: vector("embedding", { dimensions: 1536 }),
    isSeeded: boolean("is_seeded").notNull().default(true),
  },
  (table) => [
    check(
      "kb_docs_kind_check",
      sql`kind IN ('rate_card','problem_guide','help','glossary','worker_profile','review_summary')`,
    ),
    index("kb_docs_hnsw").using("hnsw", table.embedding.op("vector_cosine_ops")),
    index("kb_docs_trgm").using("gin", table.searchText.op("gin_trgm_ops")),
  ],
);

export const aiCalls = pgTable("ai_calls", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  route: text("route").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  effort: text("effort"),
  latencyMs: integer("latency_ms").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cacheReadTokens: integer("cache_read_tokens"),
  ok: boolean("ok").notNull(),
  errorCode: text("error_code"),
  cached: boolean("cached").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});
