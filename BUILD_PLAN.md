# Roshan Rozgar (روشن روزگار) · Engineering Build Plan

Engineering source of truth for the CUI Tech Fest · AI Web Forge hackathon build.
UX source of truth: `Roshan Rozgar Product & Figma Design Spec.pdf` (screen ids W0–W14, C1–C12, D1 are used here unchanged).
Problem statement: `Roshan_Rozgar_Problem_Statement.pdf`.

Written so that a human team or any AI coding harness (Claude Code, Codex, Cursor agents) can pick up a task ID from §18 and execute it without asking questions. Where this plan and the design spec disagree, the spec wins on UX and this plan wins on engineering.

---

## 0. How to use this document

**For an AI agent or harness**

1. Read §1–§3 (constraints, decisions, architecture) once. Read §11 (Redis) and §6 (data model) before touching state.
2. Take one task from the backlog in §18. Each task has an ID, track, dependencies, files it owns, steps, and a "done when" check.
3. Work only inside the directories your track owns (§4.2). Shared contracts in `packages/shared` change only through the Phase 0 owner or a small PR that every track pulls immediately.
4. A task is done only when: typecheck passes, its tests pass, and the "done when" check has been run by hand or by test.
5. Keep the **golden path** (§16.1) green on `main` at all times. If you break it, fixing it beats every other task.

**Rules every agent follows (paste into the repo's `CLAUDE.md` / `AGENTS.md`)**

```text
- Never present mocked or seeded data as real. Anything mocked shows a visible "DEMO" label in the UI and is listed in README > "Seeded & mocked".
- Never commit secrets. Read keys from env only. Never log raw audio, phone numbers or addresses.
- AI never decides booking state, prices shown as numbers, or who is free. Code and Postgres do. AI parses, ranks inputs, summarises and phrases.
- Every AI call goes through apps/server/src/ai/llm.ts (or stt.ts / tts.ts / embed.ts) so it is logged, cached, rate-limited and has a fallback.
- Every voice action that has consequences (accept job, confirm price, confirm booking, post review) needs an explicit confirm (tap or "haan"/"theek hai").
- Every screen must work tap-only when AI_MODE=off.
- Small commits, conventional messages (feat:, fix:, chore:). Rebase on main often. Do not reformat files you don't own.
- Do not add features that are not in BUILD_PLAN.md §18 without adding them there first.
```

---

## 1. Context, constraints and how we win

### 1.1 Hard rules from the problem statement

| Rule | Consequence for the build |
|---|---|
| Web app usable on a phone-sized screen; native apps out of scope | Mobile-first responsive SPA (PWA). Design at 390×844. |
| All 5 outcomes, for **both** roles, as **one flow** | The golden path (§16.1) is the only P0 that matters. |
| Payments, govt identity verification: out of scope | Cash-on-completion mock (C9) with a "DEMO, no real payment" label. **No "Verified"/CNIC badges.** Trust comes from job history. |
| No real users; seeded data expected; README must say what is seeded | Every seeded row has `is_seeded = true`; UI shows "seeded" on price sources; D1 lists everything mocked. |
| Mocked features presented as working → penalty | Mocks are labelled in UI and README and said out loud in the demo. |
| AI only where it removes a real barrier; judges ask "what breaks without it?" | Each AI feature has an "if removed" answer (§10) and D1 has an **AI kill switch** to show it live. |
| Every AI service listed in README; AI coding assistants disclosed | README template in §20. |
| Public Git repo; commits after official start | Create a **new** repo now. Keep the Figma plugin and prototype in a separate `design/` repo or outside. |
| Deployed URL **or** local instance ready at the table | Deploy to AWS (§17) **and** keep a local instance with an HTTPS tunnel as plan B. |
| Single day; deadline not stated | **Confirm the deadline with organisers now.** Code freeze 75 minutes before it. |

### 1.2 Judging weights → what we optimise

| Criterion | Weight | Our lever |
|---|---|---|
| Technical execution | 30% | One flawless end-to-end flow; double booking impossible at DB level (live race test in D1); fallbacks for mic, network and AI. |
| Problem understanding | 20% | Voice-first worker flow, Urdu/Roman Urdu, area-only address before acceptance, arrival code, price transparency. |
| Innovation & AI | 20% | Voice interview → profile; describe-by-voice/photo → trade + fair price + ranked free workers; voice review → tags; every answer shows its **source chip**. |
| Usability & accessibility | 15% | Highlight-and-speak guidance, 56 px+ targets, tap-only path, captions, RTL, speed control. |
| Presentation | 15% | Scripted 5-minute demo with D1, prepared Q&A, "if AI removed" shown live. |

**Reliability beats feature count.** P1/P2 work starts only when the golden path is green on the deployed URL.

---

## 2. Key decisions (ADR summary)

| # | Decision | Choice | Why | Rejected |
|---|---|---|---|---|
| D-01 | App shape | One TypeScript monorepo: React SPA + one Node server (REST + Socket.IO) + a jobs process | One language for every agent; WebSockets and timers need a long-running process | Next.js on Vercel (no persistent sockets → extra vendor such as Pusher; cron for timers) |
| D-02 | Voice assistant | **In-app action registry** + Claude structured output `{say, action, args}` executed by the front end | App already knows every button; no DOM guessing; fast; testable. Matches design spec §2 | Screen-driving MCP server (latency, extra hop, flaky in live demo). MCP wrapper = stretch P3 |
| D-03 | Guided onboarding | **Deterministic state machine**; AI only parses answers | Same steps every time = reliable demo; works with AI off | Letting the LLM decide the next step |
| D-04 | Common commands | Local lexicon fast path (haan, theek hai, dobara, wapas, madad…) before any LLM call | Instant, works offline, no AI cost | LLM for every utterance |
| D-05 | Source of truth for bookings | **Postgres exclusion constraint** (`btree_gist`, `tstzrange`) | Double booking impossible even under races; provable in a live test | Redis locks as truth (can diverge from DB) |
| D-06 | Redis role | Timers (BullMQ), realtime fan-out adapter, caches, rate limits, OTP TTL, presence | Ephemeral/fast state only; correctness never depends on Redis (PG sweeper backs every timer) | Redis as primary store |
| D-07 | Vector store | **pgvector inside the same Postgres** + `pg_trgm` hybrid search | Filter by availability/distance/trade and rank in one SQL query; one database to run | Pinecone/Chroma (second store, no joins) |
| D-08 | LLM | Anthropic **Claude Opus 5.5** (`claude-opus-5-5`), effort per route (`low` for voice turns) | Strong Urdu/Roman Urdu understanding, structured outputs, vision in the same model | Several LLM vendors |
| D-09 | Speech-to-text | OpenAI `gpt-4o-transcribe` (env-swappable to any OpenAI-compatible Whisper endpoint), `language: "ur"` forced; Web Speech API fallback | Accepts browser `webm`/`mp4` directly (no ffmpeg); forcing `ur` stops Devanagari (Hindi script) output | Azure STT (needs WAV/OGG transcoding) |
| D-10 | Text-to-speech | Azure AI Speech `ur-PK` neural voices (UzmaNeural / AsadNeural); OpenAI TTS fallback; **all fixed prompts pre-rendered to MP3 and committed** | Native Pakistani Urdu voice; fixed prompts play instantly and offline | Live TTS for everything |
| D-11 | Embeddings | OpenAI `text-embedding-3-small` (1536-d) | Same key as STT; multilingual; cheap | Local model (startup risk), extra vendor |
| D-12 | Vision | Claude (same model) | No extra vendor | Separate vision API |
| D-13 | Hosting (event) | **AWS Lightsail** VM, `us-east-1`, Docker Compose (Caddy + app + jobs + Postgres + Redis), automatic HTTPS | 20-minute deploy, identical to local, HTTPS needed for mic | ECS/RDS/ElastiCache for the event (1–2 h of IAM/VPC with no demo benefit) |
| D-14 | Region | `us-east-1` | A voice turn makes 2–3 chained AI calls to US-hosted APIs; one ~250 ms browser hop from Pakistan is cheaper than paying the intercontinental hop on every AI call. Verify with the `ai_calls` latency log | `me-central-1` / `ap-south-1` |
| D-15 | Plan B hosting | Same compose on a laptop + `cloudflared` quick tunnel (instant HTTPS URL, no account) | Venue Wi-Fi or AWS issues | None |
| D-16 | Auth | Phone + mocked OTP, signed httpOnly JWT cookie, single origin | No CORS, no session store | Real SMS (out of scope) |
| D-17 | Ranking | SQL candidate filter + pure TypeScript scoring function with "why" reasons | Explainable, unit-testable, defensible | LLM ranking |
| D-18 | Prices | Numbers always come from SQL (completed jobs percentiles or rate card), never from the LLM; LLM only phrases them | No invented prices; "source chip" is honest | LLM-estimated prices |
| D-19 | Urdu typography | `Noto Nastaliq Urdu` for Urdu display text ≥ 22 px (team's choice), `Noto Naskh Arabic` for Urdu body/labels (spec: Nastaliq is hard to read small). Both self-hosted. One token each, so the team can switch to Nastaliq everywhere | Brand + readability | Google Fonts CDN at the venue |
| D-20 | AI modes | `AI_MODE = live | fake | off`, switchable at runtime from D1 | `fake` lets every track build before keys work; `off` demonstrates "if AI removed" | Hard dependency on keys |

---

## 3. Architecture

### 3.1 Components

```text
 Phone / laptop browser (React SPA, PWA)
   │  HTTPS (REST /api/*, audio upload)      WSS (Socket.IO /socket.io)
   ▼
 Caddy (TLS, gzip, reverse proxy)  ──────────────────────────────────────────┐
   ▼                                                                         │
 app  (Node 24, Fastify 5 + Socket.IO 4)                                     │
   ├─ modules: auth · workers · requests · offers · threads · bookings ·     │
   │           reviews · assistant · rag · matching · demo                   │
   ├─ ai/: llm.ts (Claude) · stt.ts (OpenAI) · tts.ts (Azure/OpenAI) ·       │
   │       embed.ts (OpenAI) · fake/ fixtures · ai_calls logger              │
   ├─ static: built SPA, /uploads, /tts, /audio (pre-rendered prompts)       │
   ▼                                                                         │
 jobs (same image, BullMQ workers): offer-expiry · hold-expiry ·             │
       review-summary · re-embed · sweeper (every 15 s)                      │
   ▼                         ▼                                               │
 Postgres 17 + pgvector + pg_trgm + btree_gist      Redis 7 (AOF on) ◄───────┘
   (source of truth)                                (timers, pub/sub, caches, limits)

 External: Anthropic API (Claude Opus 5.5) · OpenAI (STT, embeddings, TTS fallback) · Azure AI Speech (ur-PK TTS)
```

### 3.2 Voice turn (sequence)

```text
User holds mic ─► MediaRecorder (webm/opus on Chrome, mp4 on Safari), max 30 s
release ─► POST /api/voice/stt (multipart) ─► OpenAI transcribe (language=ur, vocab prompt)
        ◄─ { text }  → captions line shows transcript immediately
front end: fastPath(text, screen) ── match? ─► execute locally (no LLM)
                                   └ no ────► POST /api/assistant/turn {screenId, role, lang, transcript, allowedActions, elements, state}
                                              server: (optional) RAG for help docs ─► Claude (effort low, structured output)
                                              server validates action ∈ allowedActions, element ∈ screen
                                            ◄─ { say:{ur,roman,en}, action, args, sources[] }
front end: action registry executes (highlight / fillField / navigate / …)
           TTS: pre-rendered mp3 if say matches a prompt id, else GET /api/tts (cached)
```

Latency budget (targets, measure in `ai_calls`): upload 0.3 s · STT ≤ 1.5 s · LLM ≤ 1.5 s · TTS ≤ 0.8 s → **≤ 3 s p50** from release to first audio. Fast path: ≤ 0.2 s after STT.

### 3.3 Booking lifecycle (sequence)

```text
Customer: describe (C3) → matches (C4) → "Baat karen" → offer (pending, 60 s)
Worker:   W8 incoming (plays aloud) → Qabool | Mehnga(counter) | Nahi | timeout
  decline/timeout → offer expired → server proposes next-best worker to customer (auto in emergency mode)
Both:     thread (C6/W9) voice notes + price proposals → "Taye karen"
Server:   agreement card (AI text, price from last accepted proposal) → POST /bookings = HOLD (5 min)
          INSERT guarded by exclusion constraint → 409 if worker just got engaged
Both confirm within 5 min → CONFIRMED (worker disappears from every search list via socket)
Worker:   on_the_way → arrived (arrival code) → in_progress → completed (final amount)
Customer: C9 mock pay → C10 voice review → worker stats + review summary job → C5 shows new summary
Hold not confirmed in 5 min → expired (BullMQ delayed job; sweeper backup) → worker free again
```

---

## 4. Repository layout and ownership

### 4.1 Layout

```text
roshan-rozgar/
├─ apps/
│  ├─ web/                      React 19 + Vite + TS + Tailwind 4 (PWA)
│  │  ├─ public/audio/{ur,roman,en}/*.mp3     pre-rendered prompts (committed)
│  │  ├─ public/img/trades/*.webp             trade photos (credited)
│  │  ├─ public/fonts/*.woff2                 self-hosted, subset
│  │  └─ src/
│  │     ├─ app/ (router, providers, AppShell)
│  │     ├─ screens/worker/W0..W14  screens/customer/C1..C12  screens/demo/D1
│  │     ├─ components/ (design system)
│  │     ├─ voice/ (recorder, player, fastPath, parsers)
│  │     ├─ assistant/ (action registry, highlight overlay, guide engine)
│  │     ├─ api/ (typed client, TanStack Query hooks, socket client)
│  │     ├─ i18n/ (ur.json, roman.json, en.json, useT, dir)
│  │     └─ styles/ (tokens.css)
│  └─ server/
│     └─ src/
│        ├─ index.ts (app) · jobs.ts (BullMQ workers)
│        ├─ db/ (drizzle schema, migrations/, sql/)
│        ├─ modules/{auth,workers,requests,offers,threads,bookings,reviews,demo}/
│        ├─ ai/{llm,stt,tts,embed,cache,log}.ts  ai/fake/  ai/routes/*.ts (one file per AI function)
│        ├─ rag/ (retrieve.ts, priceStats.ts, kb.ts)
│        ├─ matching/ (candidates.sql.ts, rank.ts)
│        └─ realtime/ (socket.ts, rooms.ts)
├─ packages/shared/src/  (zod schemas, types, api contract, socket events, screen & element ids, prompt catalog, constants)
├─ seed/  (areas.json, trades.json, rate_card.json, problem_guide.json, help.json, glossary.json, generators/)
├─ scripts/ (audio-build.ts, seed.ts, eval-triage.ts, race-test.ts)
├─ infra/ (docker-compose.dev.yml, docker-compose.prod.yml, Caddyfile, deploy.sh)
├─ docs/ (BUILD_PLAN.md, DEMO_SCRIPT.md, ai-smoke.md, adr/)
├─ Dockerfile · .env.example · README.md · CLAUDE.md
```

### 4.2 Ownership (prevents merge conflicts between parallel agents)

| Track | Owns | Never edits |
|---|---|---|
| F (Foundation, Phase 0) | root config, `packages/shared`, `apps/server/src/db` (initial), app skeletons | screen internals |
| A Backend core | `apps/server/src/modules/**`, `realtime/**`, later migrations | `ai/**`, `apps/web/**` |
| B Frontend | `apps/web/src/{app,screens,components,styles,i18n,api}/**` | `voice/**`, `assistant/**` internals |
| C Voice & AI | `apps/server/src/ai/**`, `apps/web/src/{voice,assistant}/**`, `scripts/audio-build.ts` | modules business logic |
| D Data & RAG | `seed/**`, `apps/server/src/{rag,matching}/**`, `scripts/{seed,eval-triage}.ts` | UI |
| E DevOps | `infra/**`, `Dockerfile`, `.github/**` | app code |

---

## 5. Stack and configuration

### 5.1 Stack (install latest stable; the lockfile pins exact versions)

| Layer | Choice |
|---|---|
| Runtime | Node 24 LTS (22 LTS also fine), pnpm workspaces, TypeScript strict |
| Web | React 19, Vite, React Router, TanStack Query, Zustand (UI state), Tailwind CSS 4, `vite-plugin-pwa`, `socket.io-client` |
| Server | Fastify 5, `@fastify/{multipart,static,cookie,rate-limit,helmet}`, Socket.IO 4 + `@socket.io/redis-adapter`, pino |
| Data | Postgres 17 (`pgvector/pgvector:pg17` image) with `vector`, `pg_trgm`, `btree_gist`; Drizzle ORM + drizzle-kit; raw SQL for constraints and indexes |
| Queue/cache | Redis 7 (`redis:7-alpine`, AOF), BullMQ, ioredis |
| Validation | zod (use the major version the Anthropic SDK's `helpers/zod` supports; check its peer dependency) |
| AI SDKs | `@anthropic-ai/sdk`, `openai` (STT/embeddings/TTS fallback), `microsoft-cognitiveservices-speech-sdk` **or** Azure TTS REST |
| Map (P2) | Leaflet + react-leaflet, OSM tiles with attribution |
| Tests | Vitest (unit + integration against docker Postgres), Playwright (golden path e2e, `AI_MODE=fake`) |
| Infra | Docker, Docker Compose, Caddy 2, AWS Lightsail, `cloudflared` (plan B) |

### 5.2 `.env.example`

```bash
NODE_ENV=development
PORT=8080
PUBLIC_URL=http://localhost:5173
DOMAIN=                         # prod: rr.example.com or <ip-with-dashes>.sslip.io
DATABASE_URL=postgres://rr:rr@localhost:5432/rr
REDIS_URL=redis://localhost:6379
SESSION_SECRET=change-me-32-bytes
DEMO_KEY=change-me              # protects /demo and /api/demo/*
UPLOAD_DIR=./data/uploads
TTS_DIR=./data/tts
CITY_DEFAULT=islamabad
TZ=Asia/Karachi

AI_MODE=fake                    # live | fake | off  (D1 can override at runtime)
ANTHROPIC_API_KEY=
LLM_MODEL=claude-opus-5-5
OPENAI_API_KEY=
STT_BASE_URL=https://api.openai.com/v1   # any OpenAI-compatible transcription endpoint
STT_MODEL=gpt-4o-transcribe
EMBED_MODEL=text-embedding-3-small
EMBED_DIM=1536
TTS_PROVIDER=azure              # azure | openai
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
TTS_VOICE_UR=ur-PK-UzmaNeural   # or ur-PK-AsadNeural
TTS_VOICE_EN=                   # pick an Azure English neural voice
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

---

## 6. Data model

### 6.1 Extensions and core DDL (raw SQL migration `0001_init.sql`; Drizzle schema mirrors it)

```sql
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
```

Status columns use `text + CHECK` instead of enums on purpose: the exclusion constraint's `WHERE` predicate stays trivially immutable.

### 6.2 Booking state machine (enforced in `modules/bookings/transitions.ts`, unit-tested)

| From | To | Who | Guard / side effect |
|---|---|---|---|
| — | `held` | system on "Taye karen" | INSERT in a transaction that first expires stale holds for that worker; SQLSTATE `23P01` (exclusion_violation) → HTTP 409 `WORKER_ENGAGED` |
| `held` | `confirmed` | second of the two confirms | both `*_confirmed_at` set before `hold_expires_at`; generate `arrival_code`; reveal `address_detail` to worker; emit `worker:visibility {visible:false}` |
| `held` | `expired` | jobs (BullMQ delayed) or sweeper | `hold_expires_at < now()`; notify both; offer next-best worker |
| `confirmed` | `on_the_way` → `arrived` → `in_progress` | worker | `arrived` requires the arrival code (mock check, labelled) |
| `in_progress` | `completed` | worker (amount) + customer confirm | `final_amount` set; worker becomes visible again (auto-return to Free); enqueue stats + review prompt |
| `held`/`confirmed` | `cancelled` | either party | reason required; notify the other side |

Offer statuses: `pending` (60 s) → `accepted` | `countered` | `declined` | `expired`. On `declined`/`expired` the server emits `request:next_worker` with the next ranked candidate (auto-sends it in emergency mode, up to 5 hops).

### 6.3 "Who is free" (the single query used by search, emergency and D1)

```sql
-- candidates for a request at (:lat, :lng) for :trade within :radius km, free now
SELECT w.user_id, u.name_ur, u.name_roman, w.rate_min, w.rate_max, w.rating_avg, w.rating_count,
       w.jobs_completed, w.tag_counts, w.review_summary, w.auto_respond,
       haversine_km(:lat, :lng, u.lat, u.lng) AS km,
       1 - (w.embedding <=> :qvec) AS sim
FROM workers w JOIN users u ON u.id = w.user_id
WHERE w.availability = 'free'
  AND w.profile_complete
  AND EXISTS (SELECT 1 FROM worker_trades t WHERE t.worker_id = w.user_id AND t.trade_slug = :trade)
  AND NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.worker_id = w.user_id
      AND b.status IN ('held','confirmed','on_the_way','arrived','in_progress')
      AND b.slot && tstzrange(now(), now() + interval '2 hours'))
  AND haversine_km(:lat, :lng, u.lat, u.lng) <= LEAST(w.service_radius_km, :radius)
ORDER BY km
LIMIT 100;
```

For scheduled requests, replace the `tstzrange(now(), …)` with the requested window and also require an overlapping `worker_slots` row.

---

## 7. API contract (all JSON, prefix `/api`, zod schemas in `packages/shared/src/api.ts`)

| Method & path | Body → Response | Used by |
|---|---|---|
| POST `/auth/otp/start` | `{phone, role}` → `{demoCode}` (mock: shown in UI, labelled DEMO) | W2, C1 |
| POST `/auth/otp/verify` | `{phone, code}` → sets cookie, `{user}` | W2, C1 |
| GET `/me` | → `{user, worker?}` | all |
| POST `/voice/stt` | multipart `audio`, `lang` → `{text, lang, ms}` | everywhere |
| GET `/tts?text&lang&rate` | → `audio/mpeg` (cached by hash) | everywhere |
| POST `/assistant/turn` | `{screenId, role, lang, transcript, allowedActions[], elements[], state}` → `{say, action, args, sources[]}` | everywhere |
| POST `/onboarding/extract` | `{question, transcript, lang}` → `{value, display:{ur,roman,en}, confidence}` | W3, W4 |
| POST `/onboarding/correct` | `{profile, transcript}` → `{patch, readBack:{ur,roman,en}}` | W5 |
| PUT `/workers/me/profile` | profile fields → `{worker}` (re-embed job enqueued) | W5 |
| POST `/workers/me/photos` | multipart `image`, `kind` → `{photo:{url, ai_tags}}` | W6 |
| POST `/workers/me/voice-intro` | multipart `audio` → `{url}` | W4/W6 |
| PUT `/workers/me/availability` | `{availability}` → `{worker}` + socket | W7 |
| POST `/workers/me/slots/parse` | `{transcript}` → `{slots[], readBack}` | W7 |
| PUT `/workers/me/slots` | `{slots[]}` → `{slots}` | W7 |
| GET `/workers/:id` | → public profile, stats, review summary, recent reviews (no phone) | C5 |
| POST `/requests/triage` | `{text?, audioUrl?, photoUrl?, lang}` → `{triage, price, safetyTip, followUps[], sources[]}` | C3 |
| POST `/requests` | `{triage, answers, areaId|lat,lng, when, mode, addressDetail?}` → `{request}` | C3, C2 emergency |
| GET `/requests/:id/matches` | → `{workers:[{…, score, reasons[], etaMin}], price, sources[]}` | C4 |
| POST `/requests/:id/offers` | `{workerId}` → `{offer}` + `offer:new` to worker | C4, C5 |
| POST `/offers/:id/respond` | `{action: accept|counter|decline, price?}` → `{offer, threadId?}` | W8 |
| GET `/threads/:id` · POST `/threads/:id/messages` | message (text / voice multipart / price) → stored message with translations | C6, W9 |
| POST `/threads/:id/agreement` | → `{agreement}` (AI text + structured fields from state) | C6, W9 |
| POST `/bookings` | `{threadId, agreement}` → `{booking}` (held) or 409 `WORKER_ENGAGED` | C7 |
| POST `/bookings/:id/confirm` | → `{booking}` | C7, W9 |
| POST `/bookings/:id/status` | `{status, arrivalCode?, finalAmount?}` → `{booking}` | W10, W11, C8 |
| POST `/bookings/:id/cancel` | `{reason}` → `{booking}` | C8, W10 |
| POST `/bookings/:id/review/extract` | `{transcript, ticks}` → `{tags, stars, summary}` (preview) | C10 |
| POST `/bookings/:id/review` | `{stars, tags, summary, transcript, audioUrl, photoUrl?}` → `{review}` | C10 |
| GET `/me/bookings` | → upcoming/past | C11, W7 |
| GET `/me/earnings` | → today/week totals, recent jobs | W12 |
| POST `/rag/price` | `{taskText|taskSlug, city}` → `{min, max, median, n, source}` | W8, W9, C6, help |
| POST `/demo/*` (header `x-demo-key`) | `reset`, `simulate-request`, `flip-availability`, `race-test`, `ai-mode`, `auto-respond` · GET `/demo/ai-log`, `/demo/seeded` | D1 |
| GET `/healthz` · `/readyz` | liveness · DB + Redis + key presence | ops |

Error envelope: `{error: {code, message, retryable}}`. Codes: `VALIDATION`, `UNAUTHORIZED`, `NOT_FOUND`, `WORKER_ENGAGED`, `HOLD_EXPIRED`, `AI_UNAVAILABLE`, `RATE_LIMITED`.

### 7.1 Socket.IO events (`packages/shared/src/events.ts`)

Rooms joined on connect (cookie-authenticated): `user:{id}`; plus `search:{city}` while a customer views C4; `thread:{id}` while in a thread.

| Event (server → client) | Payload | Consumer |
|---|---|---|
| `offer:new` | offer + request card (area only, distance, summary, price guide, photo) | W8 (plays aloud) |
| `offer:updated` | `{offerId, status, counterPrice?}` | C4/C5/C6 |
| `request:next_worker` | `{requestId, worker}` | C4/C7 |
| `thread:message` | message | C6, W9 |
| `booking:updated` | booking | C7–C11, W9–W11 |
| `worker:visibility` | `{workerId, visible}` | C4 lists remove/add cards live |

Client → server: none needed beyond REST (keeps logic in one place). Socket.IO's long-polling fallback covers bad venue Wi-Fi.

---

## 8. Voice system

### 8.1 Capture

- `voice/recorder.ts`: `MediaRecorder` with the first supported of `audio/webm;codecs=opus`, `audio/mp4`. Hold-to-talk with pointer events (works for mouse and touch); 30 s hard cap; minimum 400 ms or discard.
- Level meter for W1 via `AudioContext` + `AnalyserNode`.
- **Autoplay rule:** browsers block audio until a user gesture. W0 starts with one giant "▶ شروع کریں · Shuru karein · Start" button; that tap unlocks the `AudioContext` and plays the greeting. Never rely on auto-play before the first tap.
- Mic permission denied → banner + switch to tap-only mode (persisted), W1 explains with a picture.
- Mic needs a secure context: `https://` or `http://localhost`. Phones must use the deployed HTTPS URL or the tunnel.

### 8.2 Speech-to-text

- `ai/stt.ts`: OpenAI SDK `audio.transcriptions.create` with `model = STT_MODEL`, `language = "ur"` for `ur` and `roman` users (Roman Urdu is a way of writing; the speech is Urdu), `"en"` for English, and a short vocabulary `prompt` to bias spelling: `"geyser, AC, wiring, plumber, electrician, motor, tanki, G-9, G-10, F-7, I-8, Saddar, Rawalpindi, Islamabad, theek hai, dobara"`.
- Upload size ≤ 2 MB. Return text in Urdu script; display transliteration for Roman users comes from the downstream AI call (each AI schema returns `{ur, roman, en}` display strings).
- Fallback: if the API errors or times out (8 s), the client retries once, then offers Web Speech API (`webkitSpeechRecognition`, `lang: "ur-PK"`) where the browser supports it, then the tap path.

### 8.3 Fast path (no LLM) — `voice/fastPath.ts`

Normalise (lower-case, strip punctuation, map Urdu/Eastern digits to Western), then match longest phrase first:

| Intent | Urdu | Roman / English |
|---|---|---|
| `confirm` | ٹھیک ہے · جی ہاں · ہاں · جی · بالکل | theek hai, thik hai, haan, han, ji, jee, bilkul, ok, okay, yes |
| `deny` | نہیں · نہیں جی | nahi, nahin, na, no |
| `retry_answer` | دوبارہ | dobara, phir se, again |
| `repeat_prompt` | دوبارہ بولو · پھر سے بولو | dobara bolo, phir bolo, repeat |
| `back` | واپس · پیچھے | wapas, peeche, back |
| `help` | مدد | madad, help |
| `next` | آگے · اگلا | aage, agla, next |

If `confirm`/`deny` arrives while a confirmation is pending, execute immediately. Anything else goes to the screen's extractor or to `/assistant/turn`.

### 8.4 Deterministic parsers (unit-tested; LLM is the fallback, read-back always follows)

**Numbers / prices** (`voice/parsers/number.ts`)
- Map Eastern Arabic-Indic digits `۰–۹` (U+06F0–U+06F9) and Arabic-Indic `٠–٩` (U+0660–U+0669) to `0–9`; strip `Rs`, `روپے`, `rupay`, commas.
- Multipliers: `سو/sau` ×100, `ہزار/hazaar/hazar` ×1000, `لاکھ/lakh` ×100000.
- Fractional prefixes: `سوا/sawa` ×1.25, `ڈیڑھ/dedh` = 1.5, `ڈھائی/dhai/dhaai` = 2.5, `ساڑھے/saadhe X` = X + 0.5, `پونے/paune X` = X − 0.25.
- Tests: "pandra sau" → 1500 (via LLM if the word table lacks 15), "1500" → 1500, "۱۵۰۰" → 1500, "dedh hazaar" → 1500, "dhai hazaar" → 2500, "saadhe teen hazaar" → 3500, "baara sau rupay" → 1200, "mehnga hai 1500 lagega" → counter 1500.
- Number words 1–99 are irregular in Urdu: if the parser can't resolve a number word, call the `parse_offer` AI route.

**Time expressions** (`voice/parsers/time.ts`, timezone `Asia/Karachi`, UTC+5, no DST)
- Day: `آج/aaj` +0, `کل/kal` +1 (availability context is always future), `پرسوں/parson` +2.
- Part of day: `صبح/subah` 08–12, `دوپہر/dopahar` 12–15, `سہ پہر/sehpehar` 15–17, `شام/shaam` 17–20, `رات/raat` 20–23, `ابھی/abhi` now → +2 h.
- "X baje": 7–11 → AM unless `shaam/raat`; 1–6 → PM.
- Tests: "kal subah free hun" → tomorrow 08:00–12:00; "aaj shaam" → today 17:00–20:00; "abhi" → now–now+2h.

### 8.5 Action registry and highlight-and-speak (the onboarding "highlighted icon" feature)

**Registration.** Every screen calls `useScreen(spec)`:

```ts
// packages/shared/src/screens.ts
export type ActionName =
  | "navigate" | "highlight" | "fillField" | "selectOption" | "toggle"
  | "startRecording" | "confirm" | "goBack" | "repeatPrompt" | "showHelp" | "none";

export interface ScreenSpec {
  id: ScreenId;                       // "W4" | "C3" | ...
  promptId: PromptId;                 // spoken on entry (pre-rendered mp3)
  elements: { id: ElementId; label: { ur: string; roman: string; en: string } }[];
  actions: ActionName[];              // allowed on this screen
  fields?: { id: string; type: "text" | "number" | "choice"; options?: string[] }[];
}
```

Interactive elements are wrapped: `<Target id="W4.mic">…</Target>` registers a ref in the registry. Element ids are constants in `packages/shared` (`W4.mic`, `W4.retry`, `W4.next`, `W5.ok`, `W5.redo`, `W5.edit.name`, `W7.toggle`, `W8.accept`, `W8.counter`, `W8.decline`, `C2.mic`, `C2.camera`, `C2.emergency`, `C3.submit`, `C4.card.0.talk`, …).

**Executor** (`assistant/registry.ts`): runs only actions in `spec.actions`, on element ids present in the registry; anything else is ignored and logged. It never executes money/booking actions directly: `confirm` on a consequential screen opens the confirmation step (tap or spoken "haan").

**Highlight overlay** (`assistant/Highlight.tsx`), per spec §5:
- Flat dark overlay at 60% over the whole screen (solid `rgba(17,24,39,0.6)`, no gradient), with a cut-out around the target built from a `box-shadow: 0 0 0 9999px` ring.
- 4 px solid accent outline (`--accent`) around the target, 12 px radius, a pointing-hand icon next to it, and a gentle pulse (disabled under `prefers-reduced-motion`).
- Scrolls the target into view, moves keyboard focus to it, and announces its label through an `aria-live="polite"` region.
- Clears on tap of the target, on the next action, or after 10 s.

**Guide engine** (`assistant/guide.ts`): deterministic steps for guided mode (default for new workers).

```ts
type GuideStep = {
  screen: ScreenId; promptId: PromptId; highlight: ElementId;
  expect: "speech" | "tap";
  extractor?: AiRoute;                  // e.g. "extract_name"
  onSilenceMs: 6000;                    // replay prompt at 0.85× speed, then highlight the tap path
  next: ScreenId | ((state) => ScreenId);
};
```

Worker guide: W0 (start) → W0 language → W0 role → W1 mic check → W2 phone → W3 trades → W4 name → W4 years → W4 jobs → W4 areas → W4 rate → W5 read-back → W6 photos (skippable) → W7 home (highlight Free toggle).

**Persistent shell** (every screen, spec §6): speaker "repeat" button at top, captions line (always visible text of what was said and heard), mic bottom centre, "Wapas" back with word + arrow, speed control (0.85× / 1× / 1.15×) in the speaker long-press menu and W14.

### 8.6 Text-to-speech

- **Fixed prompts** live in `packages/shared/src/prompts.ts` (id → `{ur, roman, en}`; Appendix A). `scripts/audio-build.ts` renders `public/audio/{lang}/{id}.mp3` once (Urdu voice for `ur` and `roman`; English voice for `en`) and the files are committed. Zero runtime dependency.
- **Dynamic sentences** (names, prices, AI summaries): `GET /api/tts` → `ai/tts.ts` (Azure SSML with `<prosody rate>` for speed; OpenAI TTS fallback), cached on disk by `sha256(text|voice|rate)`, index in Redis.
- Player (`voice/player.ts`): single queue, interrupt on new prompt, volume and speed honoured, captions updated in sync.
- Prompts avoid first-person verbs so the voice's gender never clashes with Urdu verb agreement (e.g. "آواز نہیں آئی" instead of "میں سن نہیں سکا").

---

## 9. RAG and matching

### 9.1 Knowledge base (all seeded, `kb_docs`)

| kind | ref_id | Content | Serves |
|---|---|---|---|
| `rate_card` | task slug | task names in 3 scripts, synonyms ("nal", "tonti", "tap"), range, typical minutes | price guide fallback, task detection |
| `problem_guide` | guide id | symptom phrases in 3 scripts, trade, task, urgency, check-first, safety tip, 3 follow-ups with tap options | C3 triage, safety tip |
| `help` | element id + screen id | "what this button does", how-to, Urdu glossary terms | assistant help, W14/C12 help mic |
| `glossary` | term | term in 3 scripts + plain explanation | help answers |
| `worker_profile` | worker id | generated profile text | semantic skill match (also in `workers.embedding`) |
| `review_summary` | worker id | latest summary | profile Q&A |

`search_text` = all three script variants + synonyms, lower-cased, so trigram matching catches Roman Urdu spellings ("nalka", "nal kharab", "pani tapak raha").

### 9.2 Retrieval (`rag/retrieve.ts`)

1. Embed the query (`ai/embed.ts`, Redis cache).
2. Two candidate lists for the requested `kind`s: vector top-20 by `embedding <=> :q`, trigram top-20 by `word_similarity(:qtext, search_text)`.
3. Fuse with Reciprocal Rank Fusion: `score = Σ 1 / (60 + rank)`; return top-k with `{id, kind, ref_id, title, score}`.
4. Unit test: "paani tapak raha hai", "nal kharab", "geyser garam pani nahi de raha", "AC thandi hawa nahi deta", "bijli ka short circuit" each return the right guide in the top 3.

### 9.3 Triage (C3): retrieve, then reason

1. Retrieve top-8 `problem_guide` + top-5 `rate_card` docs for the transcript (plus photo description if a photo exists, from the `vision_problem` route).
2. Claude (`triage` route, effort `medium`) receives the transcript and **only those docs**, and must choose `trade_slug` and `task_slug` from the provided ids (enums built per request), set urgency, write `summary {ur, roman, en}`, pick 2–3 follow-ups from the guide, the safety tip id, and `cited_doc_ids`.
3. Price comes from §9.4, never from the model.
4. Response shows source chips: "Problem guide · Leaking tap" · "Rate card (seeded)" · "23 past jobs · Islamabad (seeded)".

### 9.4 Price statistics (`rag/priceStats.ts`)

```sql
SELECT count(*) AS n,
       percentile_cont(0.25) WITHIN GROUP (ORDER BY final_amount) AS p25,
       percentile_cont(0.50) WITHIN GROUP (ORDER BY final_amount) AS p50,
       percentile_cont(0.75) WITHIN GROUP (ORDER BY final_amount) AS p75
FROM bookings
WHERE status = 'completed' AND task_slug = :task AND city = :city
  AND completed_at > now() - interval '180 days';
```

If `n ≥ 5`: range `p25–p75` rounded to Rs 50, label "{n} jobs · {city} (seeded)". Else: rate card range, label "Rate card (seeded)". The fair-price helper (C6/W9) offers: accept, counter, or split the difference `round50((a+b)/2)`.

### 9.5 Ranking (`matching/rank.ts`, pure function, unit-tested)

Inputs: candidates from §6.3, triage, mode.

```text
skill      = 0.6·[task in worker_tasks] + 0.4·max(0, sim)                    (sim = cosine vs problem embedding)
proximity  = 1 − min(km, R)/R                                                (R = 10 km)
quality    = (bayes(rating) − 1)/4,  bayes = (5·4.2 + Σstars)/(5 + n)
reliability= (tag_counts.on_time + 2)/(tag_counts.n + 3)
price_fit  = 1 if [rate_min, rate_max] overlaps the fair range else 0.5
score      = 0.35·skill + 0.25·proximity + 0.20·quality + 0.10·reliability + 0.10·price_fit
emergency  : proximity weight 0.45, skill 0.30, quality 0.15, reliability 0.10, price_fit 0
```

Each result carries `reasons[]` rendered as chips: "Free now ✓", "1.2 km · ~14 min (estimate)", "On time 18/20", "Fair price", "Did this job 9×". ETA = `km / 20 km/h + 10 min`, labelled estimate.

### 9.6 Evaluation (`scripts/eval-triage.ts`, task D-06)

30 labelled utterances (10 Urdu script, 10 Roman Urdu, 10 English; include code-switching like "geyser ka thermostat kharab hai") → expected trade and task. Script prints accuracy and confusion pairs. Run it with `AI_MODE=live`, put the measured number in README and the demo. Never quote a number you didn't measure.

---

## 10. AI functions catalog

### 10.1 LLM wrapper (`apps/server/src/ai/llm.ts`) — every Claude call goes through it

```ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

const client = new Anthropic(); // ANTHROPIC_API_KEY from env

export async function llmJSON<S extends z.ZodTypeAny>(o: {
  route: AiRoute;                       // for logging, caching, fake fixtures
  schema: S;
  system: string;                       // static per route → cacheable; no timestamps or ids in here
  content: Anthropic.MessageParam["content"]; // volatile: transcript, screen state, current time, docs
  effort: "low" | "medium" | "high";
  cacheKey?: string;                    // sha256 of normalised input → Redis ai:{route}:{key}, 24 h
}): Promise<z.infer<S>> {
  // 1. AI_MODE: off → throw AiOff (caller uses tap fallback); fake → return fixture for route
  // 2. Redis cache hit → return
  const res = await client.messages.parse(
    {
      model: env.LLM_MODEL,             // "claude-opus-5-5"
      max_tokens: 16000,                // cap only; outputs are small, thinking counts toward it
      cache_control: { type: "ephemeral" },
      system: o.system,
      messages: [{ role: "user", content: o.content }],
      output_config: { effort: o.effort, format: zodOutputFormat(o.schema) },
    },
    { timeout: 12_000, maxRetries: 1 },
  );
  if (res.stop_reason === "refusal") throw new AiRefused(res.stop_details?.category ?? null);
  if (res.stop_reason === "max_tokens" || !res.parsed_output) throw new AiBadOutput(o.route);
  // 3. log ai_calls (latency, usage.input_tokens, output_tokens, cache_read_input_tokens), set cache
  return res.parsed_output;
}
```

Notes for the implementer:
- Claude Opus 5.5 always thinks; depth is controlled by `output_config.effort` (its default is `medium`, so set it explicitly). Do not send `thinking: {type: "disabled"}` or `budget_tokens` (400). No assistant prefill (400); use structured outputs.
- Forced `tool_choice` (`any`/`tool`) returns 400 on Opus 5.5. That is one reason the assistant uses structured output with a global action enum (§10.2) rather than per-screen tools; it also keeps the system prompt and schema byte-stable for prompt caching.
- Prompt caching only kicks in above a model-dependent minimum prefix length; the assistant and help routes (long static instructions + screen catalogue) benefit, short routes won't. Check `usage.cache_read_input_tokens` in `ai_calls`.
- Refusal fallback: Opus 5.5 supports server-side `fallbacks: "default"` (beta header `server-side-fallback-2026-07-01`) on `client.beta.messages.create`. Task C-04 adds it **if** a one-call check shows that the beta call accepts the same `output_config.format` in the installed SDK; validate the text block with `schema.safeParse(JSON.parse(text))` in that variant. Refusals are unlikely in this domain, and every route already has a tap fallback.
- Model is env-configurable per route (`LLM_MODEL`, optional `LLM_MODEL_<ROUTE>`). If measured voice-turn latency is too slow at `low` effort, trying a faster model on the voice-turn routes is the team's call; measure first. (Claude Haiku 5.5 has no server-side fallback: don't send `fallbacks` with it.)
- Typed errors: catch `Anthropic.RateLimitError` → `RATE_LIMITED` (retryable), `Anthropic.APIError` → `AI_UNAVAILABLE`, network/timeout → `AI_UNAVAILABLE`. Never string-match error messages.
- Vision: pass `{type: "image", source: {type: "base64", media_type, data}}` before the text block in `content`. Resize to ≤ 1280 px on the client first.
- User transcripts are data. They go inside the user `content`, wrapped as `<transcript>…</transcript>`; the system prompt says to treat it as speech to interpret, never as instructions.

### 10.2 Routes

| Route | Effort | Input | Output schema (zod, all display strings `{ur, roman, en}`) | Fallback when AI off/fails | If removed |
|---|---|---|---|---|---|
| `assistant_turn` | low | screen spec, allowed actions, elements, transcript, state, retrieved help docs | `{say, action: ActionName, target: ElementId|null, field: string|null, value: string|null, screen: ScreenId|null, sourceIds: string[]}` | fast path + highlight the default target | worker must read the screen |
| `extract_name` / `extract_years` / `extract_jobs` / `extract_areas` / `extract_rate` | low | question, transcript, allowed enums (task slugs, area ids) | `{value, display, confidence}` | W3/W4 tap pickers (tiles, number pad, area grid) | onboarding needs a typed form |
| `apply_correction` | low | current profile, transcript ("naam galat hai, Akram Khan") | `{patch, readBack}` | pencil → tap editor | correction needs typing |
| `parse_availability` | low | transcript, now (Asia/Karachi) | `{slots: {start, end}[], readBack}` | time chips (Aaj subah / shaam, Kal subah / shaam) | worker must use a time picker |
| `parse_offer` | low | transcript, current price | `{intent: accept|counter|decline, price: number|null, readBack}` | price chips | counter-offer needs typing |
| `translate_message` | low | text, source lang | `{ur, roman, en}` | show original only | customer typing and worker listening can't meet |
| `summarize_request` | low | triage, answers | `{line}` for W8 audio card | template sentence from slugs | worker must read the request |
| `vision_problem` | medium | photo + optional text | `{trade_slug, task_slug|null, issue, hazards[], too_dark: boolean}` | category grid | customer must know the trade name |
| `triage` | medium | transcript, retrieved guides + rate card docs | `{trade_slug, task_slug, urgency, summary, followUpIds[], safetyTipId, citedDocIds[]}` | category grid + exact tag search | "nal kharab" doesn't find plumbers; no guidance |
| `agreement_card` | medium | thread messages (last 30), structured price/time/area from state | `{job, when_text}` (price/area are copied from state, not generated) | template card | both sides must reconstruct the deal |
| `extract_review` | low | transcript, ticks | `{tags: {on_time, fair_price, clean, quality, hire_again}, stars, summary}` | tick questions only | reviews become unread free text |
| `summarize_reviews` | medium | last 30 reviews + SQL tag counts | `{strengths[], complaints[], one_liner}` | show counts only | next customer can't skim trust |
| `tag_work_photo` (P2) | low | photo, allowed task slugs | `{task_slugs[], caption}` | no tags | photos stay unlabeled |

Fake fixtures: `ai/fake/<route>.json` keyed by a few demo inputs plus a generic default, so the golden path runs end to end with `AI_MODE=fake`.

### 10.3 Where AI is deliberately **not** used (say this to judges)

Booking holds, availability, double-booking prevention, offer cascade timers, price numbers, ranking arithmetic, arrival code, authentication. These are rules plus real-time state.

---

## 11. Redis: where, when and why

| Use | Structure / key | TTL | Why Redis (not Postgres) | Phase |
|---|---|---|---|---|
| Offer countdown (60 s) and hold expiry (5 min) | BullMQ queues `offers`, `holds` with delayed jobs (`jobId = offerId/bookingId`, idempotent) | per job | durable timers that survive app restarts and fire on time; drives "auto-offer next worker on timeout" | P0 |
| Realtime fan-out | `@socket.io/redis-adapter` pub/sub | — | lets more than one app container broadcast `worker:visibility`, `offer:new`; on one VM it is a five-line no-op that makes scale-out possible | P0 |
| Rate limiting AI and upload endpoints | `@fastify/rate-limit` Redis store, per user + IP | window | a public URL must not burn API credit | P0 |
| OTP (mock) | `otp:{phone}` | 5 min | TTL semantics; becomes the real OTP store later | P0 |
| Runtime config | `cfg:ai_mode`, `cfg:auto_respond` | none | D1 flips AI mode / simulated responders without restart | P0 |
| AI response cache | `ai:{route}:{sha256}` → JSON | 24 h | repeatable demo answers, lower latency and cost | P1 |
| Embedding cache | `emb:{model}:{sha256}` | 7 d | D1 "reset" re-seeds without re-paying | P1 |
| TTS cache index | `tts:{sha256}` → file path | 30 d | names and prices repeat | P1 |
| Presence | `presence:{userId}` refreshed by socket connect/heartbeat | 45 s | "online now" dot; prefer connected workers in the live demo | P2 |
| Idempotency | `idem:{key}` | 10 min | double-tapped "confirm" on flaky networks returns the first result | P2 |

**Not in Redis, on purpose:** bookings and holds (the exclusion constraint is the only arbiter), sessions (signed cookie), vectors (pgvector), anything that must survive Redis loss.

**Correctness never depends on Redis:** the jobs process runs a sweeper every 15 s that expires `pending` offers past `expires_at` and `held` bookings past `hold_expires_at`, and emits the same events. The hold INSERT also expires stale holds for that worker inside its own transaction.

---

## 12. Screens → features → outcomes (build traceability)

Priority: **P0** golden path · **P1** differentiator · **P2** polish. Outcomes: 1 Onboarding · 2 Discovery · 3 Communication · 4 Booking · 5 Trust.

### 12.1 Worker

| Screen | Route | Build | Endpoints / AI | Out. | Pri |
|---|---|---|---|---|---|
| W0 Welcome, language, role | `/` | Start button (audio unlock), 3 language buttons with speaker icons, 2 role cards | prompts `p.welcome`, `p.lang`, `p.role` | 1 | P0 |
| W1 Mic check | `/w/mic` | big mic, live level meter, "Kuch bolein", "Tap se chalayen" → tap-only mode | stt | 1 | P0 |
| W2 Phone and code | `/w/phone` | big number pad, digits read aloud, speak the number; DEMO code auto-filled | otp, stt, parse number | 1 | P0 |
| W3 Trade tiles | `/w/trades` | 8 photo tiles, multi-select with tick overlay, voice "main plumber hun aur geyser bhi theek karta hun" | `extract_jobs` | 1 | P0 |
| W4 Voice interview | `/w/interview/:q` | one question per screen, progress dots, highlighted hold-to-talk mic, big live transcript, extracted value chip, "Dobara" / "Aage"; optional voice intro recording | `extract_*`, voice-intro upload | 1 | P0 |
| W5 Review my profile | `/w/profile-review` | AI-built card read aloud; pencil + mic per field; "Theek hai" / "Dobara bolein" | `apply_correction`, PUT profile | 1 | P0 |
| W6 Photos | `/w/photos` | face + up to 3 work photos, skip allowed, AI tags as chips | photos, `tag_work_photo` | 1, 5 | P2 |
| W7 Home | `/w/home` | giant Free/Busy toggle (green + tick + "Free" / red + cross + "Busy"), voice slots, today's jobs, pulsing request badge, tabs Kaam · Kamai · Mera Profile, "Madad" mic, sun/moon | availability, `parse_availability` | 4 | P0 (toggle) / P1 (voice slots) |
| W8 Incoming request | overlay on `offer:new` | plays aloud + vibrate, problem audio + text, photo, area only, distance, AI summary line, price range with source chip, 60 s countdown ring, Qabool · Mehnga · Nahi | `summarize_request`, `/rag/price`, respond | 2, 3 | P0 |
| W9 Talk and price | `/w/thread/:id` | voice-note bubbles with transcripts, price chips, speak a number, fair-range helper, "Taye karen" card, confirm | messages, `translate_message`, `parse_offer`, agreement | 3 | P0 |
| W10 Job in progress | `/w/job/:id` | 4 big steps Rawana · Pohanch gaye · Kaam shuru · Mukammal; call; arrival code entry (DEMO) | status | 4 | P0 |
| W11 Job done | `/w/job/:id/done` | confirm amount by voice or pad, finished-work photo, back to Free | status | 4, 5 | P0 |
| W12 Earnings | `/w/earnings` | today / week totals read aloud, recent jobs | earnings | 5 | P2 |
| W13 Reputation | `/w/reputation` | stars, badge row from counts, "Customers say…" read aloud | worker profile | 5 | P1 |
| W14 Settings & help | `/w/settings` | language, voice speed, text size, light/dark, help mic, family helper mode | — | 1 | P2 |
| States | — | mic denied, offline (queued banner), request expired, job cancelled, profile incomplete | — | — | P1 |

### 12.2 Customer and demo

| Screen | Route | Build | Endpoints / AI | Out. | Pri |
|---|---|---|---|---|---|
| C1 Sign-up & location | `/c/signup` | name/phone by voice or typing, DEMO OTP, "use my location" / area grid / speak area | otp, stt | 2 | P0 |
| C2 Home | `/c/home` | big "Kya kharab hai?" mic + camera, red "Abhi chahiye" emergency, category photo grid, recent bookings | — | 2 | P0 |
| C3 Describe the problem | `/c/describe` | voice/photo/text, live transcript; result: trade, urgency, price range + sources, estimated time, 2–3 tap follow-ups, safety tip | `/requests/triage`, `vision_problem` | 2, 3 | P0 (voice/text) / P1 (photo) |
| C4 Available workers | `/c/request/:id/workers` | ranked cards: photo/initials, name, trade chips, distance + ETA estimate, green Free badge, stars, price range, one-line review summary, reason chips, play intro; filters Free now · Today · Pick time; live removal on `worker:visibility` | matches, offers | 2 | P0 (list) / P2 (map) |
| C5 Worker profile | `/c/worker/:id` | voice intro, work photos, AI review summary (strengths/complaints), completed + repeat counts, price history, reviews with audio, Baat karen · Book karen | worker | 2, 5 | P0 |
| C6 Chat and price | `/c/thread/:id` | text + voice notes with transcripts and translation, fair-price card, accept / counter / split, "Taye karen" | messages, agreement | 3 | P0 |
| C7 Confirm booking | `/c/booking/:id/confirm` | AI job card, 5-minute hold timer, both confirm, auto "next best worker" on decline/timeout, arrival code, share-with-family link (P2) | bookings | 4 | P0 |
| C8 Track job | `/c/booking/:id` | status timeline, ETA estimate, call, report problem / SOS | booking, socket | 4 | P0 |
| C9 Pay | `/c/booking/:id/pay` | cash on completion, confirm amount, label "DEMO, no real payment" | status | 4 | P0 |
| C10 Review | `/c/booking/:id/review` | tick questions, 20 s voice review, optional photo, preview of AI tags + summary before posting | review extract/post | 5 | P0 |
| C11 My bookings | `/c/bookings` | upcoming/past, "Dobara bulayen" rebook | me/bookings | 4, 5 | P2 |
| C12 Settings & help | `/c/settings` | language, speed, text size, light/dark, help mic | — | 2 | P2 |
| D1 Demo panel | `/demo?key=` | reset data, simulate incoming request, flip a worker, **race test**, **AI mode live/fake/off**, simulated responders on/off, AI call log (latency, model, cached), seeded/mocked list | `/demo/*` | all | P1 |
| States | — | no worker free (later slots / widen radius), declined, location denied, offline, photo too dark (client-side luminance check before upload) | — | — | P1 |

### 12.3 Golden path ↔ outcomes ↔ demo minute

| Minute | Action | Outcome |
|---|---|---|
| 0:00–1:30 | New worker: start → language → role → mic check → trades by voice → 5 spoken answers → read-back → "theek hai" | 1 |
| 1:30–2:00 | Worker taps Free; says "kal subah bhi free hun" | 2, 4 |
| 2:00–3:00 | Customer speaks "kitchen ka nal tapak raha hai" + photo → trade, price range with source, ranked free workers (new worker near top) | 2 |
| 3:00–4:00 | Customer voice note; worker hears audio card, says "mehnga hai, 1500 lagega"; fair-price helper; "Taye karen"; both confirm; worker vanishes from a second customer's list live | 3, 4 |
| 4:00–4:40 | Worker completes job; customer speaks review → tags preview → post → profile summary updates | 5 |
| 4:40–5:00 | D1: race test (one 201, one 409), AI kill switch shows the tap fallback, seeded/mocked list | all |

---

## 13. Seed data (`seed/`, deterministic, every row `is_seeded = true`)

| File | Content | Notes |
|---|---|---|
| `areas.json` | ~25 Islamabad + Rawalpindi areas (F-6…F-11, G-6…G-13, I-8…I-10, E-11, Bahria Town, DHA, Saddar, Satellite Town, Chaklala, Westridge) with `name_ur`, `name_roman`, lat/lng | Geocode once with OpenStreetMap Nominatim (≤ 1 request/s, custom User-Agent), commit the result, credit "© OpenStreetMap contributors (ODbL)" |
| `trades.json` | 8 trades: پلمبر plumber · الیکٹریشن / بجلی والا electrician · اے سی ٹیکنیشن AC technician · بڑھئی carpenter · مکینک mechanic · رنگ ساز / پینٹر painter · راج مستری mason · دیگر other | photos: Unsplash/Pexels, credited, compressed to webp ≤ 60 KB |
| `rate_card.json` | ~40 tasks (e.g. tap repair, pipe leak, geyser install/repair, flush repair, motor install, drain unblock; wiring fault, switchboard, fan install, UPS install, breaker; AC gas refill, service, install; door/lock, cabinet; battery, puncture, bike service; room paint; tile repair, plaster, waterproofing) with ranges in PKR | **Illustrative, labelled "seeded"; not market data** |
| `problem_guide.json` | ~40 symptom entries in 3 scripts → trade, task, urgency, check-first, safety tip, 3 follow-ups with tap options | e.g. "pani tapak raha hai" → plumber.tap_repair, tip "main valve band kar dein" |
| `help.json` | per screen/element: what it does, how to use, in 3 scripts | feeds the assistant and help mic |
| `glossary.json` | ~40 terms | |
| `generators/` | seeded PRNG (fixed seed) builds: 60 workers (≈ 7–8 per trade, 70% free), 40 customers, ~600 completed jobs over 90 days with `final_amount` drawn inside rate-card ranges, ~400 reviews with tags and short texts in 3 scripts, worker profile texts | Text content may be drafted with an LLM once and committed as JSON (disclose in README). Avatars: initials or illustrated, never photos of real people |
| demo accounts | worker "Akram (demo)" is **not** seeded (created live in the demo); customer "Sara (demo)" and a second customer for the live-removal moment | |

`pnpm db:seed` truncates and reloads everything, recomputes worker stats and price data, embeds `kb_docs` and worker profiles (embedding cache makes repeats free). D1 "reset" calls the same code.

Simulated responders: seeded workers with `auto_respond = true` accept or counter after 4–8 s with a price inside their range so judges can test any worker. UI shows "Simulated worker (seeded)" on their cards and messages. D1 can switch this off.

---

## 14. Front end

### 14.1 Tokens (`styles/tokens.css`, from design spec §5; solid colours only)

```css
:root {
  --bg:#FFFFFF; --surface:#F3F5F8; --text:#111827; --muted:#4B5563; --border:#CBD5E1;
  --primary:#0B6E4F; --on-primary:#FFFFFF;     /* go, accept, confirm, "Free" */
  --accent:#1D4ED8;  --on-accent:#FFFFFF;      /* mic, highlight ring */
  --warning:#B45309; --danger:#C62828;          /* counter/pending · decline/busy/SOS */
  --overlay:rgba(17,24,39,.6);
  --font-ur-display:"Noto Nastaliq Urdu", "Noto Naskh Arabic", serif;
  --font-ur-text:"Noto Naskh Arabic", serif;
  --font-latin:Inter, system-ui, sans-serif;
  --radius:12px; --tap:56px; --btn:64px;
}
[data-theme="dark"] {
  --bg:#0F172A; --surface:#1E293B; --text:#F1F5F9; --muted:#CBD5E1; --border:#334155;
  --primary:#34D399; --on-primary:#052E1F; --accent:#60A5FA; --on-accent:#0B1530;
  --warning:#FBBF24; --danger:#F87171; --overlay:rgba(0,0,0,.6);
}
```

Check contrast for every text/background pair (≥ 4.5:1 body, ≥ 3:1 large UI) before the demo. Default theme light; dark via W14/C12 and a sun/moon icon on W7.

### 14.2 Rules

- Base text 18 px; Urdu text ≥ 20 px, line-height ≥ 1.9 (Nastaliq display ≥ 22 px, line-height 2.0). Roman Urdu in the Latin font. Western digits for prices.
- `dir="rtl"` on `<html>` for `ur`; `ltr` for `roman`/`en`. Use Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `start-*`) so layouts mirror. Arrows flip with direction. Every text node sets `lang`.
- Never colour alone: Free = green + tick + "Free/فارغ", Busy = red + cross + "Busy/مصروف".
- Every button: icon + photo or pictogram + short word. Primary 64 px tall, full width. At most one question and two big buttons per screen.
- Components (B-01): `BigButton`, `PhotoTile`, `FreeBusyToggle`, `Card`, `Chip`, `SourceChip`, `ProgressDots`, `CountdownRing`, `MicButton` (hold-to-talk with level ring), `SpeakerButton`, `CaptionsBar`, `Highlight`, `Banner` (offline / DEMO / AI mode), `Toast`, `NumberPad`, `AreaGrid`, `DemoLabel`.
- PWA (P2): app shell, fonts, trade photos and `/audio/**` precached; images lazy-load; offline queue in IndexedDB for availability toggles with a "queued" banner.
- Fonts self-hosted and subset (Urdu + Latin glyphs used), `font-display: swap`, preloaded on W0.

---

## 15. Security and privacy

- Exact address (`address_detail`) and phone numbers are returned to the worker **only after `confirmed`**; before that the API serializer sends area + distance only. Phone numbers are masked in all lists.
- Cookie: httpOnly, `SameSite=Lax`, `Secure` in prod; JWT signed with `SESSION_SECRET`; role checked on every route.
- Uploads: type sniffing, audio ≤ 2 MB / 30 s, images ≤ 5 MB (client resizes to ≤ 1280 px webp), random file names, served from a dedicated path with `Content-Disposition` safe headers.
- Rate limits: AI routes 30/min/user, uploads 20/min/user, demo routes need `x-demo-key`.
- Prompt injection: transcripts and messages are data; assistant output is constrained by schema and validated against the screen's allowed actions and element ids; consequential actions require explicit confirmation in code.
- Logs: pino with redaction of `phone`, `address_detail`, auth headers; no audio or transcripts at info level.
- Secrets only in `.env` on the server (`chmod 600`); `.env` in `.gitignore`.

---

## 16. Testing and quality gates

### 16.1 Golden path (must stay green)

Playwright e2e with two browser contexts (worker, customer) and `AI_MODE=fake`, following §12.3 end to end, asserting: profile complete; worker in matches; offer arrives; counter → agreement; hold → both confirm; worker gone from a third context's list; completion; review posted; worker summary updated. Run on every merge to `main` and against the deployed URL before the demo.

### 16.2 Required unit / integration tests

| Area | Test |
|---|---|
| Booking | transitions table; **race**: 2 concurrent holds for the same worker/slot → exactly one succeeds, the other gets `WORKER_ENGAGED` (also exposed as D1 race test) |
| Timers | offer expiry and hold expiry fire via BullMQ; with Redis stopped, the sweeper still expires them |
| Parsers | number and time cases in §8.4; fast-path lexicon |
| Ranking | weights, emergency mode, reasons |
| Retrieval | §9.2 queries return the right guide in top 3 |
| Price | n ≥ 5 uses percentiles; n < 5 uses rate card; rounding |
| AI wrapper | off/fake modes; refusal and bad output map to fallbacks; cache hit path |
| Privacy | address/phone absent from pre-confirmation payloads |

### 16.3 Manual device checks (Phase 4)

Android Chrome (primary), iOS Safari: mic permission, recording, playback after first tap, RTL layout, 390 px width, slow 3G throttle, airplane mode banner, AI off mode.

---

## 17. Deployment

### 17.1 Local development

```bash
docker compose -f infra/docker-compose.dev.yml up -d   # postgres(pgvector) + redis
pnpm i && pnpm db:migrate && pnpm db:seed
pnpm dev                                               # vite :5173 (proxies /api, /socket.io, /uploads, /tts) + server :8080 + jobs
```

### 17.2 Event deployment (AWS Lightsail, ~20 minutes)

1. Lightsail → Create instance → Linux/Unix, **Ubuntu 24.04 LTS**, region **us-east-1 (Virginia)**, 2 GB RAM / 2 vCPU plan (4 GB if seeding is slow). Attach a **static IP**. Networking: allow TCP 22, 80, 443 only.
2. SSH in: `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker ubuntu` (re-login).
3. Domain: point an A record at the static IP, or use `<ip-with-dashes>.sslip.io` (for example `3-91-10-20.sslip.io`). Set `DOMAIN` in `.env`.
4. `git clone <public repo> && cd roshan-rozgar && cp .env.example .env && nano .env` (fill keys, `NODE_ENV=production`, `AI_MODE=live`, `PUBLIC_URL=https://$DOMAIN`), `chmod 600 .env`.
5. `docker compose -f infra/docker-compose.prod.yml up -d --build`
6. `docker compose -f infra/docker-compose.prod.yml exec app node dist/scripts/migrate.js && … exec app node dist/scripts/seed.js`
7. Check `https://$DOMAIN/readyz`, run the golden path e2e against the URL, open on two phones.
8. Redeploy: `infra/deploy.sh` = `git pull && docker compose … up -d --build app jobs`.

`infra/docker-compose.prod.yml` (outline):

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    environment: [DOMAIN=${DOMAIN}]
    volumes: [./infra/Caddyfile:/etc/caddy/Caddyfile:ro, caddy_data:/data, caddy_config:/config]
    depends_on: [app]
  app:
    build: { context: ., dockerfile: Dockerfile }
    command: ["node", "dist/index.js"]
    env_file: .env
    environment: [DATABASE_URL=postgres://rr:${PG_PASSWORD}@postgres:5432/rr, REDIS_URL=redis://redis:6379]
    volumes: [data:/app/data]
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
  jobs:
    build: { context: ., dockerfile: Dockerfile }
    command: ["node", "dist/jobs.js"]
    env_file: .env
    environment: [DATABASE_URL=postgres://rr:${PG_PASSWORD}@postgres:5432/rr, REDIS_URL=redis://redis:6379]
    volumes: [data:/app/data]
    depends_on: { postgres: { condition: service_healthy }, redis: { condition: service_healthy } }
  postgres:
    image: pgvector/pgvector:pg17
    environment: [POSTGRES_USER=rr, POSTGRES_PASSWORD=${PG_PASSWORD}, POSTGRES_DB=rr]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U rr"], interval: 5s, retries: 20 }
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes: [redisdata:/data]
    healthcheck: { test: ["CMD", "redis-cli", "ping"], interval: 5s, retries: 20 }
volumes: { caddy_data: {}, caddy_config: {}, data: {}, pgdata: {}, redisdata: {} }
```

`infra/Caddyfile`:

```text
{$DOMAIN} {
  encode zstd gzip
  reverse_proxy app:8080
}
```

Caddy obtains the TLS certificate automatically and proxies WebSockets without extra config. Postgres and Redis publish no ports.

`Dockerfile`: multi-stage on `node:24-slim`: install with pnpm, build `apps/web` (Vite) and `apps/server` (tsup) plus `scripts/`, copy the web `dist` into the server's static dir, run as non-root.

### 17.3 Plan B and plan C

- **B: laptop + tunnel.** Set `DOMAIN=:80` in `.env` (Caddy then serves plain HTTP on port 80, no certificate), run `docker compose -f infra/docker-compose.prod.yml up -d`, then `cloudflared tunnel --url http://localhost:80` → prints a `https://….trycloudflare.com` URL; phones use it (mic works because the tunnel is HTTPS). No uptime guarantee; fine as backup.
- **C: laptop only.** Open `http://localhost:8080` in two browser windows (localhost counts as secure for the mic). Bring a phone hotspot in case venue Wi-Fi blocks API calls.
- Recording a backup video is fine, but if you play it, say it's a recording.

### 17.4 Production path (for the "does it scale?" question; not built today)

Same containers on ECS Fargate behind an ALB (sticky sessions on, because Socket.IO long-polling needs them; the Redis adapter handles cross-node broadcast), RDS Postgres with pgvector, ElastiCache (Redis/Valkey), S3 + CloudFront for uploads, audio and the SPA, Secrets Manager, CloudWatch logs and alarms, real SMS OTP, payment provider integration, and server-side identity checks. The app code doesn't change; only `UPLOAD_DIR` becomes an S3 storage driver.

### 17.5 Cost (event day)

Lightsail 2 GB instance: low tens of dollars per month, billed hourly. AI: a few cents per full demo run (Claude Opus 5.5 is $4 / $20 per million input/output tokens; a voice turn is a few thousand tokens). Set a spending limit on every AI account before going public.

---

## 18. Execution plan

### 18.1 Phases and clock

Times are offsets from "T0 = when Phase 0 starts". The plan assumes about 7 hours to the deadline; if you have less, apply the cut lines earlier. **Code freeze = deadline − 75 min.**

| Phase | Clock | Goal | Exit check |
|---|---|---|---|
| 0 Foundation | T0 → T+0:45 | repo, contracts, DB, skeletons, AI smoke test | `pnpm dev` boots; migrations run; every route renders a placeholder; `docs/ai-smoke.md` GO/NO-GO |
| 1 Core flows (parallel tracks A–D) | T+0:45 → T+3:30 | golden path working tap-only with `AI_MODE=fake` | Playwright golden path passes locally |
| 2 Live AI + RAG | T+2:30 → T+4:30 (overlaps) | voice onboarding, triage + price, voice notes, review extraction with real APIs | golden path by voice on a phone via tunnel |
| 3 Deploy + harden | T+4:00 → T+5:00 | AWS live, seed prod, device checks, fallbacks drilled | golden path e2e green against the URL |
| 4 Differentiators (P1) | T+4:30 → freeze | highlight guidance everywhere, D1 race test + AI switch, emergency mode, photo triage, reputation | each item demoable twice in a row |
| 5 Freeze + rehearse | freeze → deadline | README, demo script ×3, Q&A prep | submission done 15 min early |

**Checkpoints and cut lines**
- T+2:00: if any golden-path screen is still missing, stop all P1/P2 work and swarm on it.
- T+3:30: if the golden path isn't green with fake AI, drop W6, W12–W14, C11–C12, map, PWA from scope.
- T+4:30: if live Urdu STT is unreliable in the smoke test, demo voice with clear speech and keep the tap path prominent; say so honestly.
- Freeze: only fixes to the golden path after this point.

### 18.2 Backlog

Format: **ID · track · priority · depends on** — what to do. *Done when …*

**Phase 0 (one agent, sequential)**

- **F-01 · F · P0 · —** Create the public repo, pnpm workspace (`apps/web`, `apps/server`, `packages/shared`), strict `tsconfig` base, ESLint + Prettier, `.editorconfig`, `.gitignore` (incl. `.env`, `data/`), `.env.example` (§5.2), `CLAUDE.md` with §0 rules. *Done when `pnpm -r typecheck` passes.*
- **F-02 · F · P0 · F-01** `infra/docker-compose.dev.yml` (pgvector pg17, redis 7 AOF) and root scripts: `dev`, `db:migrate`, `db:seed`, `test`, `e2e`, `audio:build`, `eval:triage`. *Done when `pnpm dev` starts web, server and jobs with hot reload.*
- **F-03 · F · P0 · F-01** `packages/shared`: zod schemas + types for every entity (§6), API request/response (§7), socket events (§7.1), AI output schemas (§10.2), `ScreenId`/`ElementId`/`ActionName`/`PromptId` constants (§8.5), prompt catalog skeleton (Appendix A), error codes. *Done when web and server import from it and typecheck.*
- **F-04 · F · P0 · F-02** Drizzle schema + raw SQL migration from §6.1 (extensions, exclusion constraint, indexes, `haversine_km`). *Done when a fresh DB migrates and `\d bookings` shows `no_double_booking`.*
- **F-05 · F · P0 · F-03** Server skeleton: Fastify, cookie/JWT auth plugin, error envelope, pino with redaction, helmet, rate limit (Redis), static serving, `/healthz`, `/readyz`, Socket.IO attached with cookie auth and Redis adapter, BullMQ connection, `jobs.ts` with the 15 s sweeper. *Done when `/readyz` reports DB + Redis OK.*
- **F-06 · F · P0 · F-03** Web skeleton: Vite + React + Tailwind with tokens (§14.1), router with every route from §12 as a placeholder, AppShell (speaker, captions, mic, Wapas), i18n loader (`ur`, `roman`, `en`) with `dir` switching, self-hosted fonts, API client + TanStack Query, socket client. *Done when every route renders in all 3 languages and RTL flips.*
- **F-07 · F · P0 · F-05** AI layer interfaces (`llm.ts`, `stt.ts`, `tts.ts`, `embed.ts`), `AI_MODE` switch (env + Redis `cfg:ai_mode`), fake fixtures for every route in §10.2, `ai_calls` logger, Redis cache helper. *Done when every route returns a fixture in fake mode.*
- **F-08 · F/C · P0 · F-07** Live smoke test with real keys: 10 Urdu/Roman phrases through STT (record accuracy and whether output is Urdu script), one structured Claude call per effort level (latency), 3 Urdu sentences through Azure and OpenAI TTS (choose by ear). Write `docs/ai-smoke.md` with GO/NO-GO per provider. *Done when the file exists and providers are chosen.*

**Track A · Backend core**

- **A-01 · P0 · F-05** Mock OTP (`otp:{phone}` 5 min, code returned as `demoCode` and shown with DEMO label), verify, cookie, `/me`, role guard. *Done when worker and customer can log in from two browsers.*
- **A-02 · P0 · F-04** Worker profile CRUD, trades/tasks/areas, availability toggle (emits `worker:visibility`), slots CRUD, re-embed job enqueue, profile completeness rule. *Done when W5 save makes the worker appear in §6.3 query.*
- **A-03 · P0 · A-02, D-05** Requests: create (with triage payload), matches endpoint (candidates SQL + `rank.ts`), address hiding. *Done when a request returns ranked free workers with reasons.*
- **A-04 · P0 · A-03** Offers: create (60 s, BullMQ delayed expiry), respond accept/counter/decline, next-worker proposal, emergency auto-cascade (≤ 5 hops), simulated responders for `auto_respond` workers. *Done when declining shows the next worker within 1 s.*
- **A-05 · P0 · A-04** Threads + messages (text, voice upload, price proposal/accept, system), `thread:message` events, translation hook (C-07). *Done when voice notes appear on the other device with transcript.*
- **A-06 · P0 · A-05** Bookings: hold INSERT transaction (expire stale holds → insert → map `23P01` to 409), confirm (both, within hold), status transitions (§6.2), arrival code, completion, auto-return to Free, hold expiry job + sweeper path, `booking:updated`/`worker:visibility` events. *Done when the race test passes 20/20 and an expired hold frees the worker.*
- **A-07 · P0 · A-06** Reviews: extract preview (C-07), post, update worker stats + `tag_counts` in the same transaction, enqueue `summarize_reviews`. *Done when posting a review changes C5.*
- **A-08 · P1 · A-06** Demo endpoints: reset (calls seed), simulate incoming request to a chosen worker, flip availability, race test (2 parallel holds, returns both results), AI mode, auto-respond toggle, AI log, seeded/mocked list. *Done when D1 can run each action.*
- **A-09 · P2** Earnings endpoint, my bookings, rebook.

**Track B · Front end**

- **B-01 · P0 · F-06** Design-system components (§14.2) with RTL and dark support, Storybook-free (one `/dev/components` route). *Done when every component renders in ur/roman/en, light/dark.*
- **B-02 · P0 · B-01, A-01** W0–W5 tap paths (tiles, number pad, area grid, field editors) wired to API. *Done when a worker can finish onboarding by taps only.*
- **B-03 · P0 · B-01, A-02, A-04** W7 home (toggle, request badge), W8 incoming overlay (countdown ring, 3 buttons), W9 thread, W10/W11 job steps. *Done when the worker side of the golden path works by taps.*
- **B-04 · P0 · B-01, A-03…A-07** C1–C10 customer screens (C4 live removal, C7 hold timer + next-worker, C9 DEMO pay). *Done when the customer side of the golden path works by taps/typing.*
- **B-05 · P0 · B-03, B-04** Playwright golden path (§16.1). *Done when it passes locally in fake mode.*
- **B-06 · P1 · A-08** D1 demo panel UI. *Done when every D1 action is one tap and shows its result.*
- **B-07 · P1** Error/empty states listed in §12 (mic denied, offline, expired, cancelled, no worker free, location denied, photo too dark).
- **B-08 · P2** W12, W13, W14, C11, C12, map toggle on C4, PWA + offline queue, family helper mode, safety share page.

**Track C · Voice & AI**

- **C-01 · P0 · F-07** Recorder (format detection, hold-to-talk, 30 s cap, level meter), `/voice/stt` with language forcing + vocab prompt + timeout + Web Speech fallback; MicButton integration. *Done when speech appears in the captions bar on Android Chrome and iOS Safari.*
- **C-02 · P0 · F-03** Prompt catalog (Appendix A, all screens), `scripts/audio-build.ts`, player queue with speed/volume and captions sync, audio unlock on W0, `/api/tts` with disk + Redis cache. *Done when every screen speaks its prompt on entry after the first tap.*
- **C-03 · P0 · F-03** Fast-path lexicon + number + time parsers with the tests in §8.4. *Done when tests pass.*
- **C-04 · P0 · F-07, F-08** Live `llm.ts` per §10.1 (effort per route, cache, logging, typed errors, refusal path; add server-side `fallbacks: "default"` if the one-call check passes). *Done when `ai_calls` shows live calls with latency and tokens.*
- **C-05 · P0 · C-04** Onboarding extractors (`extract_*`), `apply_correction`, read-back text; wire W3–W5. *Done when the 5-question interview builds a profile by voice.*
- **C-06 · P0 · C-01, C-02, C-03** Action registry, `Target` wrapper, Highlight overlay, guide engine with the worker guide (§8.5) and 6 s silence handling, `/assistant/turn` (+ help retrieval from D-04). *Done when the worker guide runs W0→W7 hands-free except for answers.*
- **C-07 · P0 · C-04** `parse_offer`, `parse_availability`, `translate_message`, `summarize_request`, `agreement_card`, `extract_review`, `summarize_reviews`. *Done when each route is wired into its screen and has a fallback.*
- **C-08 · P1 · C-04** `vision_problem` (C3 photo) with client-side luminance "too dark" check; P2 `tag_work_photo` (W6).

**Track D · Data & RAG**

- **D-01 · P0 · F-04** Author `areas.json` (geocoded), `trades.json`, `rate_card.json`, `problem_guide.json`, `help.json`, `glossary.json` in 3 scripts. *Done when JSON validates against shared schemas.*
- **D-02 · P0 · D-01** Generators + `scripts/seed.ts` (truncate, load, generate, recompute stats, embed with cache). *Done when `pnpm db:seed` runs in < 2 min and C4 shows realistic workers.*
- **D-03 · P0 · D-02, F-07** Embedding pipeline for `kb_docs` and worker profiles; re-embed job on profile change. *Done when every row has an embedding.*
- **D-04 · P0 · D-03** `retrieve.ts` (hybrid + RRF), `priceStats.ts`, `/requests/triage` (retrieve → `triage` route → price → sources), `/rag/price`. *Done when §9.2 tests pass and C3 shows sources.*
- **D-05 · P0 · D-04** `rank.ts` with reasons + unit tests (§9.5). *Done when tests pass and C4 order makes sense to a human.*
- **D-06 · P1 · D-04** `eval-triage.ts` with 30 utterances; record accuracy in README. *Done when the number is measured.*

**Track E · DevOps (any free agent after Phase 0)**

- **E-01 · P0 · F-05** Dockerfile, `docker-compose.prod.yml`, Caddyfile, `deploy.sh`. *Done when the prod compose runs locally.*
- **E-02 · P0 · E-01** Lightsail instance, static IP, domain, `.env`, first deploy, seed, golden path against the URL. *Done when two phones complete the golden path on the URL.*
- **E-03 · P1** GitHub Actions: typecheck + unit tests on push (not deploy).
- **E-04 · P1** Plan B rehearsal: laptop compose + `cloudflared` URL tested on a phone.

**Stretch (P3, only after everything above is demoable)**

- **S-01** MCP wrapper: an MCP server (TypeScript MCP SDK) exposing `list_screen_actions` and `perform_action`, relayed over Socket.IO to a browser session paired by a 6-digit code. Story: "any agent can operate our app through the same registry".

### 18.3 Parallelisation

```text
T0 ──F-01─F-02─F-03─F-04─F-05─F-06─F-07─F-08──►
                     │
     ┌───────────────┼───────────────┬───────────────┐
     A: A-01→A-02→A-03→A-04→A-05→A-06→A-07→A-08
     B: B-01→B-02→B-03→B-04→B-05→B-06→B-07
     C: C-01, C-02, C-03 (parallel) → C-04 → C-05 → C-06 → C-07 → C-08
     D: D-01→D-02→D-03→D-04→D-05→D-06
     E: (after F-05) E-01 → E-02 (once A-06 & B-05 pass) → E-04
```

With fewer than 4 agents: merge B into A (backend + screens per feature slice) and D into C. Never run two agents on the same track at once.

---

## 19. Demo script and judge Q&A

### 19.1 Script (5 minutes; two phones or two browser windows, D1 on a laptop)

Follow §12.3. Narrate the barrier each step removes ("he can't type, so he talks"; "she doesn't know the word 'plumber', so she describes it"). Say "DEMO" out loud when the OTP, payment and arrival code appear. End on D1: race test, AI kill switch, seeded/mocked list.

### 19.2 Prepared answers

| Question | Answer |
|---|---|
| What breaks without the AI? | Flip the AI switch in D1 and show it: onboarding falls back to a tap form (still no typing, but slower and needs reading), "nal kharab" stops finding plumbers (exact tags only), no price guidance, chat can't translate, reviews become unread text. |
| How do you guarantee a worker isn't double-booked? | A Postgres exclusion constraint on (worker, time range) for active statuses. Two simultaneous confirms: one wins, the other gets 409 and the customer is offered the next worker. Show the race test. |
| Why Redis if Postgres is the truth? | Durable timers for the 60 s offer and 5 min hold, realtime fan-out across containers, rate limits, caches. If Redis dies, a Postgres sweeper still expires holds; nothing becomes inconsistent. |
| Why not an MCP that controls the screen? | The app already knows every button, so the LLM picks from a typed list of actions and the app executes them. That's faster, testable and can't click the wrong pixel. MCP fits as an outer interface (stretch), not as the core. |
| How accurate is Urdu speech recognition? | Quote the measured smoke-test and eval numbers. Mitigations: forced Urdu language, vocabulary hints, read-back confirmation, "Dobara", and the tap path. |
| Where do prices come from? | Seeded completed jobs (percentiles, with the count shown) or the seeded rate card. The AI never invents a number. Both are labelled seeded. |
| What is mocked or seeded? | OTP, payment, arrival code check, ETAs, simulated responders, all workers/jobs/reviews/rate card/areas. It's in D1 and the README. |
| How does it scale? | §17.4: same containers on ECS behind an ALB, RDS, ElastiCache, S3/CloudFront; the Redis adapter already handles multi-node sockets. |
| Privacy and safety? | Exact address and phone only after both confirm; arrival code at the door; SOS; share-with-family link (if built). |
| Why the US region? | Each voice turn chains 2–3 AI calls to US-hosted APIs; one browser round trip from Pakistan costs less than paying that distance on every AI call. We measured latency in the AI log. |

---

## 20. README template (required by the rules)

```markdown
# Roshan Rozgar (روشن روزگار)
One-line pitch. Demo URL. Demo video (optional, labelled as recording).

## Run it
Prereqs, `cp .env.example .env`, keys needed, `docker compose … up`, `pnpm db:seed`, open URL. Demo panel: /demo?key=…

## Stack
(§5.1 table)

## AI services and models used
- Anthropic Claude Opus 5.5 (`claude-opus-5-5`): understanding, extraction, triage, translation, summaries, vision
- OpenAI `gpt-4o-transcribe` (speech-to-text), `text-embedding-3-small` (embeddings), `gpt-4o-mini-tts` (TTS fallback)
- Azure AI Speech `ur-PK` neural voice (text-to-speech, pre-rendered prompts and live sentences)
- Browser Web Speech API (STT fallback)
- AI coding assistants used to build this project: <list, e.g. Claude Code>

## Seeded & mocked
Seeded: areas (geocoded via OpenStreetMap Nominatim), trades, rate card (illustrative prices), problem guide, help texts, 60 workers, 40 customers, ~600 past jobs, ~400 reviews.
Mocked: OTP (code shown on screen), payment (cash on completion, no real payment), arrival code check, ETAs (distance-based estimate), simulated responses from seeded workers. No identity verification.

## Measured
Triage accuracy on 30 utterances: X/30 (date, AI_MODE=live). Voice turn latency p50: X s.

## Known limitations
Urdu STT accuracy drops in noise; ... ; single-region deployment.

## Credits
Libraries, fonts (Noto Nastaliq Urdu, Noto Naskh Arabic, Inter — SIL OFL), photos (Unsplash/Pexels authors), map data © OpenStreetMap contributors.
```

---

## 21. Risk register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Urdu STT misses words | Medium | High | forced `ur`, vocab prompt, read-backs, Dobara, tap path, quiet corner for the demo | C |
| Audio doesn't play on first load | High if ignored | High | W0 start button unlocks audio | C |
| Mic blocked on phone (no HTTPS) | Medium | High | deployed HTTPS URL or tunnel; never LAN `http://` | E |
| Venue Wi-Fi blocks or is slow | Medium | High | phone hotspot; Socket.IO long-polling; pre-rendered audio | E |
| AI latency feels slow | Medium | Medium | fast path, effort `low`, caches, captions shown instantly, measure in `ai_calls` | C |
| API key limit or outage mid-demo | Low | High | spending limits set, AI kill switch turns it into the "if AI removed" story honestly | C |
| Merge conflicts between agents | Medium | Medium | directory ownership (§4.2), contracts frozen in Phase 0 | all |
| Running out of time | High | High | cut lines (§18.1), golden path first, freeze at −75 min | lead |
| Presenting mocks as real | Low | High (penalty) | DEMO labels, D1 list, README, say it out loud | lead |
| Seed data looks fake | Medium | Medium | 3-script content, plausible names/areas, counts shown honestly as seeded | D |
| Nastaliq rendering heavy/slow | Medium | Low | subset fonts, Naskh for body text, preload | B |

---

## 22. Known differences from the earlier Figma prototype ("Hunarmand")

The Figma plugin and web prototype made earlier today were a fast visual draft. Build from the design spec and this plan, not from the prototype, where they differ:

| Prototype | Build |
|---|---|
| Name "Hunarmand" | Roshan Rozgar (روشن روزگار) |
| Orange mic/voice colour, green `#0A7A4F` | Spec tokens: accent blue `#1D4ED8` for mic and highlight, primary `#0B6E4F` |
| "Verified" shield, CNIC photo step | **Remove.** Identity verification is out of scope; showing it as real risks the mocked-as-real penalty. Trust comes from jobs completed, repeat customers, review tags |
| JazzCash / Easypaisa payouts | Payments out of scope → cash on completion, labelled DEMO |
| Face rating | Spec C10: tick questions + voice review + AI tags preview (faces may stay as a visual for the overall rating) |
| No mic check, no phone pad, no guide engine | W1, W2 and the highlight-and-speak guide engine are P0 |

---

## Appendix A. Prompt catalog (fixed prompts, pre-rendered)

Prompts avoid first-person verbs so the voice's gender never conflicts with Urdu verb agreement. Add the remaining screen prompts in the same style; keep each under ~12 words.

| id | Urdu | Roman Urdu | English |
|---|---|---|---|
| `p.start` | شروع کرنے کے لیے بڑا بٹن دبائیں۔ | Shuru karne ke liye bara button dabayein. | Press the big button to start. |
| `p.welcome` | روشن روزگار میں خوش آمدید۔ اپنی زبان چنیں۔ | Roshan Rozgar mein khush aamdeed. Apni zabaan chunein. | Welcome to Roshan Rozgar. Choose your language. |
| `p.role` | کیا آپ کو کام چاہیے، یا آپ کو کاریگر چاہیے؟ | Kya aap ko kaam chahiye, ya aap ko kaarigar chahiye? | Do you want work, or do you need a worker? |
| `p.mic_check` | مائیک کا بٹن دبا کر رکھیں اور کچھ بولیں۔ | Mic ka button daba kar rakhein aur kuch bolein. | Press and hold the mic and say something. |
| `p.mic_ok` | آواز آ رہی ہے۔ شاباش! | Awaaz aa rahi hai. Shabash! | We can hear you. Well done! |
| `p.mic_fail` | آواز نہیں آئی۔ کوئی بات نہیں، بٹن دبا کر چلائیں۔ | Awaaz nahi aayi. Koi baat nahi, button daba kar chalayein. | No sound came through. That's fine, use the buttons. |
| `p.phone` | اپنا موبائل نمبر بولیں یا بٹن دبا کر لکھیں۔ | Apna mobile number bolein ya button daba kar likhein. | Say your mobile number or tap it in. |
| `p.otp_demo` | کوڈ خود بخود آ گیا ہے۔ آگے چلیں۔ | Code khud ba khud aa gaya hai. Aage chalein. | The code was filled in for you. Continue. |
| `p.trade` | آپ کیا کام کرتے ہیں؟ تصویر دبائیں یا بول کر بتائیں۔ | Aap kya kaam karte hain? Tasveer dabayein ya bol kar batayein. | What work do you do? Tap a picture or say it. |
| `q.name` | آپ کا نام کیا ہے؟ | Aap ka naam kya hai? | What is your name? |
| `q.years` | آپ یہ کام کتنے سال سے کر رہے ہیں؟ | Aap yeh kaam kitne saal se kar rahe hain? | How many years have you done this work? |
| `q.jobs` | آپ کون کون سے کام کرتے ہیں؟ مثلاً گیزر، نل یا پائپ۔ | Aap kaun kaun se kaam karte hain? Maslan geyser, nal ya pipe. | Which jobs do you do? For example geyser, tap or pipe. |
| `q.areas` | آپ کن علاقوں میں کام کرتے ہیں؟ | Aap kin ilaqon mein kaam karte hain? | Which areas do you work in? |
| `q.rate` | ایک عام کام کے آپ کتنے پیسے لیتے ہیں؟ | Aik aam kaam ke aap kitne paise lete hain? | How much do you usually charge for a job? |
| `p.readback` | یہ آپ کی پروفائل ہے۔ ٹھیک ہے تو «ٹھیک ہے» کہیں، ورنہ «دوبارہ» کہیں۔ | Yeh aap ki profile hai. Theek hai to "theek hai" kahein, warna "dobara" kahein. | This is your profile. Say "theek hai" if it's right, or "dobara" to change it. |
| `p.silence` | آواز نہیں آئی۔ دوبارہ بولیں، یا نیچے والا بٹن دبائیں۔ | Awaaz nahi aayi. Dobara bolein, ya neeche wala button dabayein. | We didn't hear you. Speak again, or tap the button below. |
| `p.home_free` | آپ اب حاضر ہیں۔ نیا کام آتے ہی اطلاع ملے گی۔ | Aap ab haazir hain. Naya kaam aate hi ittila milegi. | You are now available. You'll be told as soon as a job comes. |
| `p.new_job` | نیا کام آیا ہے۔ | Naya kaam aaya hai. | A new job has come in. |
| `p.confirm_price` | (dynamic) کیا یہ کام {price} روپے میں طے ہے؟ | (dynamic) Kya yeh kaam {price} rupay mein tay hai? | (dynamic) Is this job agreed at Rs {price}? |
| `p.c_home` | کیا خراب ہے؟ بول کر بتائیں یا تصویر کھینچیں۔ | Kya kharab hai? Bol kar batayein ya tasveer khenchein. | What's broken? Say it or take a photo. |
| `p.c_review` | کام کیسا رہا؟ بیس سیکنڈ بول کر بتائیں۔ | Kaam kaisa raha? Bees second bol kar batayein. | How was the work? Tell us in 20 seconds. |

## Appendix B. Command lexicon

See §8.3. Store it in `packages/shared/src/lexicon.ts` as data (intent → phrases per script) so the fast path and tests share one list.

## Appendix C. Glossary seed (excerpt)

| Roman | Urdu | English |
|---|---|---|
| nal / tonti | نل / ٹونٹی | tap |
| geyser | گیزر | water heater |
| tanki | ٹینکی | water tank |
| motor | موٹر | water pump |
| bijli | بجلی | electricity |
| taar / wiring | تار / وائرنگ | wire / wiring |
| kaarigar | کاریگر | skilled worker |
| mistri | مستری | craftsman / mason |
| theek hai | ٹھیک ہے | okay / confirmed |
| dobara | دوبارہ | again |
| wapas | واپس | back |
| madad | مدد | help |
| abhi chahiye | ابھی چاہیے | needed now (emergency) |
