-- Initial schema from BUILD_PLAN.md section 6.1.
-- Applied transactionally by scripts/migrate.mjs; do not edit after deployment.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE areas (
  id text PRIMARY KEY,                 -- 'isb-g-9'
  city text NOT NULL,                  -- 'islamabad' | 'rawalpindi'
  name_en text NOT NULL, name_ur text NOT NULL, name_roman text NOT NULL,
  lat double precision NOT NULL, lng double precision NOT NULL
);

CREATE TABLE trades (
  slug text PRIMARY KEY,               -- plumber | electrician | ac_technician | carpenter | mechanic | painter | mason | other
  name_en text NOT NULL, name_ur text NOT NULL, name_roman text NOT NULL,
  photo text NOT NULL, icon text NOT NULL
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('worker','customer','admin')),
  phone text UNIQUE NOT NULL,
  name_ur text, name_roman text,
  lang text NOT NULL DEFAULT 'ur' CHECK (lang IN ('ur','roman','en')),
  area_id text REFERENCES areas(id),
  lat double precision, lng double precision,
  is_seeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workers (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  years_exp int,
  rate_min int, rate_max int,                    -- PKR
  service_radius_km int NOT NULL DEFAULT 8,
  availability text NOT NULL DEFAULT 'off' CHECK (availability IN ('free','off')),
  availability_updated_at timestamptz NOT NULL DEFAULT now(),
  photo_url text, voice_intro_url text,
  profile_text text,                             -- generated canonical profile (en + ur + roman), embedded
  profile_complete boolean NOT NULL DEFAULT false,
  auto_respond boolean NOT NULL DEFAULT false,   -- seeded workers only; labelled "simulated"
  rating_avg numeric(3,2), rating_count int NOT NULL DEFAULT 0,
  jobs_completed int NOT NULL DEFAULT 0, repeat_customers int NOT NULL DEFAULT 0,
  tag_counts jsonb NOT NULL DEFAULT '{}',        -- {"on_time":18,"fair_price":15,"clean":12,"quality":17,"hire_again":16,"n":20}
  review_summary jsonb,                          -- {strengths[], complaints[], one_liner:{ur,roman,en}}
  embedding vector(1536)
);
CREATE TABLE worker_trades (worker_id uuid REFERENCES workers(user_id) ON DELETE CASCADE, trade_slug text REFERENCES trades(slug), PRIMARY KEY (worker_id, trade_slug));
CREATE TABLE worker_tasks  (worker_id uuid REFERENCES workers(user_id) ON DELETE CASCADE, task_slug text NOT NULL, PRIMARY KEY (worker_id, task_slug));
CREATE TABLE worker_areas  (worker_id uuid REFERENCES workers(user_id) ON DELETE CASCADE, area_id text REFERENCES areas(id), PRIMARY KEY (worker_id, area_id));
CREATE TABLE worker_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES workers(user_id) ON DELETE CASCADE,
  slot tstzrange NOT NULL, source text NOT NULL CHECK (source IN ('voice','tap'))
);
CREATE TABLE worker_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES workers(user_id) ON DELETE CASCADE,
  url text NOT NULL, kind text NOT NULL CHECK (kind IN ('face','work')),
  ai_tags text[] NOT NULL DEFAULT '{}', caption jsonb
);

CREATE TABLE rate_card (
  task_slug text PRIMARY KEY,                    -- 'plumber.tap_repair'
  trade_slug text REFERENCES trades(slug),
  name_en text, name_ur text, name_roman text,
  price_min int NOT NULL, price_max int NOT NULL, typical_minutes int NOT NULL,
  is_seeded boolean NOT NULL DEFAULT true
);

CREATE TABLE job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES users(id),
  trade_slug text REFERENCES trades(slug), task_slug text,
  description_text text, description_audio_url text, photo_url text,
  triage jsonb,                                  -- AI output + cited doc ids
  answers jsonb,                                 -- follow-up tap answers
  urgency text CHECK (urgency IN ('emergency','today','scheduled')),
  wanted tstzrange,                              -- [now, now+2h) for "abhi"
  area_id text REFERENCES areas(id), lat double precision, lng double precision,
  address_detail text,                           -- revealed to worker only after CONFIRMED
  mode text NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal','emergency')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','cancelled','expired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES job_requests(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES workers(user_id),
  rank int NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','accepted','countered','declined','expired','withdrawn')),
  counter_price int, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, worker_id)
);

CREATE TABLE threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES job_requests(id), offer_id uuid REFERENCES offers(id),
  customer_id uuid REFERENCES users(id), worker_id uuid REFERENCES workers(user_id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('text','voice','price_proposal','price_accept','system','agreement')),
  text text, audio_url text, lang text,
  translations jsonb,                            -- {ur, roman, en}
  price int, payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES job_requests(id), thread_id uuid REFERENCES threads(id),
  customer_id uuid NOT NULL REFERENCES users(id),
  worker_id uuid NOT NULL REFERENCES workers(user_id),
  trade_slug text, task_slug text, city text, area_id text REFERENCES areas(id),
  slot tstzrange NOT NULL,
  status text NOT NULL CHECK (status IN ('held','confirmed','on_the_way','arrived','in_progress','completed','cancelled','expired')),
  hold_expires_at timestamptz,
  agreed_price int, final_amount int,
  agreement jsonb,                               -- {job:{ur,roman,en}, priceRs, when, area}
  customer_confirmed_at timestamptz, worker_confirmed_at timestamptz,
  arrival_code char(4),
  completed_at timestamptz,
  is_seeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- THE consistency guarantee (outcome 4): one worker cannot hold two active bookings that overlap in time.
  CONSTRAINT no_double_booking EXCLUDE USING gist (worker_id WITH =, slot WITH &&)
    WHERE (status IN ('held','confirmed','on_the_way','arrived','in_progress'))
);
CREATE INDEX bookings_worker_active ON bookings (worker_id) WHERE status IN ('held','confirmed','on_the_way','arrived','in_progress');
CREATE INDEX bookings_price_stats ON bookings (task_slug, city, completed_at) WHERE status = 'completed';

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE REFERENCES bookings(id),
  customer_id uuid REFERENCES users(id), worker_id uuid REFERENCES workers(user_id),
  stars int CHECK (stars BETWEEN 1 AND 5),
  tags jsonb NOT NULL,                           -- {on_time, fair_price, clean, quality, hire_again} booleans
  transcript text, audio_url text, photo_url text,
  summary jsonb,                                 -- {ur, roman, en}
  is_seeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kb_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('rate_card','problem_guide','help','glossary','worker_profile','review_summary')),
  ref_id text NOT NULL,                          -- task_slug | guide id | element id | worker id
  screen_id text,                                -- for help docs
  title text NOT NULL, body text NOT NULL,       -- what the source chip opens
  search_text text NOT NULL,                     -- ur + roman + en variants + synonyms, lower-cased
  meta jsonb NOT NULL DEFAULT '{}',
  embedding vector(1536),
  is_seeded boolean NOT NULL DEFAULT true
);
CREATE INDEX kb_docs_hnsw ON kb_docs USING hnsw (embedding vector_cosine_ops);
CREATE INDEX kb_docs_trgm ON kb_docs USING gin (search_text gin_trgm_ops);
CREATE INDEX workers_hnsw ON workers USING hnsw (embedding vector_cosine_ops);

CREATE TABLE ai_calls (
  id bigserial PRIMARY KEY,
  route text NOT NULL, provider text NOT NULL, model text NOT NULL, effort text,
  latency_ms int NOT NULL, input_tokens int, output_tokens int, cache_read_tokens int,
  ok boolean NOT NULL, error_code text, cached boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION haversine_km(lat1 float8, lng1 float8, lat2 float8, lng2 float8) RETURNS float8
LANGUAGE sql IMMUTABLE AS $$
  SELECT 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Invariants supplement application validation for direct SQL/concurrent writers.
ALTER TABLE bookings ADD CONSTRAINT booking_slot_valid CHECK (
  NOT isempty(slot) AND NOT lower_inf(slot) AND NOT upper_inf(slot)
  AND lower_inc(slot) AND NOT upper_inc(slot)
);
ALTER TABLE bookings ADD CONSTRAINT held_booking_has_expiry CHECK (
  status <> 'held' OR hold_expires_at IS NOT NULL
);
ALTER TABLE bookings ADD CONSTRAINT booking_amounts_valid CHECK (
  (agreed_price IS NULL OR agreed_price >= 0)
  AND (final_amount IS NULL OR final_amount >= 0)
);
ALTER TABLE workers ADD CONSTRAINT worker_rates_valid CHECK (
  (rate_min IS NULL OR rate_min >= 0)
  AND (rate_max IS NULL OR rate_max >= 0)
  AND (rate_min IS NULL OR rate_max IS NULL OR rate_max >= rate_min)
);
ALTER TABLE rate_card ADD CONSTRAINT rate_card_prices_valid CHECK (
  price_min >= 0 AND price_max >= price_min AND typical_minutes > 0
);
CREATE INDEX offers_expiry ON offers (expires_at) WHERE status = 'pending';
CREATE INDEX bookings_hold_expiry ON bookings (hold_expires_at) WHERE status = 'held';
