> Latest instruction: time-boxed MVP, roughly 45 minutes. Prioritize the tap-only golden path, simple polling and existing transport; defer production hardening. See BUILD_PLAN.md §21. A-02–A-07/B-02–B-04 MVP implementation is now IN_PROGRESS; original acceptance gates remain tracked below.

# Roshan Rozgar — build progress

Updated: 2026-11-10 (Asia/Karachi).

## Current checkpoint

- Scope: **application implementation authorized**, starting at Phase 0 / F-01.
- Application phases complete: **0 of 6**. Application backlog tasks complete: **1 of 44**.
- Current instruction: continue implementation and local commits; leave GitHub aside. Pending environment checks do not stop independent coding.
- Active implementation task: **finish F-05/F-06/F-07 integration**. F-08 live checks are blocked; source checkpoints are saved. See HANDOFF.md.
- Planning deliverables: original BUILD_PLAN.md preserved, phase breakdown in README.md, this task ledger, HANDOFF.md with a resume prompt, and AGENTS.md/CLAUDE.md with progress and commit rules.
- Repository: `Abdur-Rehman-Nezami/roshan-rozgar`; checkpoint branch: `main`.
- Publication: **BLOCKED**. Shell GitHub access failed DNS resolution. The GitHub connector read the empty repository but rejected file creation with HTTP 403, `Resource not accessible by integration`. No remote commit was created.
- Local recovery: the plan and implementation files are saved in local commits using `.planning-git` as the Git metadata directory because the environment's root `.git` is read-only and empty. A portable `roshan-rozgar-planning.bundle` is generated from that commit. These recovery artifacts are not tracked inside their own commit.

Status vocabulary: NOT_STARTED, IN_PROGRESS, BLOCKED, DONE, DEFERRED. A phase is DONE only after its exit checks pass. A task can be implemented while its verification remains blocked; record this explicitly and keep it out of DONE.

## Phase ledger

The names, relative times and exit gates come from BUILD_PLAN.md §18.1. Phases can overlap. The task groupings below are a navigation aid; §18.2 remains authoritative for scope, dependencies and priorities.

| Phase                 | Planned clock   | Status      | Work and exit gate                                                                                                                                                                                                     | Completion commit |
| --------------------- | --------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 0 — Foundation        | T0–T+0:45       | IN_PROGRESS | F-01–F-08: workspace/contracts, DB migration, server/web skeletons, fake AI interfaces, provider smoke report. `pnpm dev` boots; migration runs; all routes render; `docs/ai-smoke.md` records real GO/NO-GO evidence. | Not created       |
| 1 — Core flows        | T+0:45–T+3:30   | IN_PROGRESS | Core A/B work, deterministic voice helpers and D data/matching support. Tap-only golden path passes locally with `AI_MODE=fake`, including booking race/privacy/expiry checks from §16.                                | Not created       |
| 2 — Live AI + RAG     | T+2:30–T+4:30   | NOT_STARTED | Live C work and D retrieval/embedding/price integration. Voice onboarding, triage, messages and reviews work through real providers. Golden path by voice on a phone via HTTPS tunnel.                                 | Not created       |
| 3 — Deploy + harden   | T+4:00–T+5:00   | NOT_STARTED | E-01/E-02, deployment, seeded production DB and fallback/device checks. End-to-end golden path passes against the deployed URL.                                                                                        | Not created       |
| 4 — Differentiators   | T+4:30–freeze   | NOT_STARTED | Eligible P1 features: guidance, D1 race test and AI switch, emergency mode, photo triage and reputation. Each included feature is demonstrated twice consecutively; §16.3 device checks recorded.                      | Not created       |
| 5 — Freeze + rehearse | Freeze–deadline | NOT_STARTED | README matches reality; demo script rehearsed three times; Q&A prepared; submission done 15 minutes early. Freeze is deadline minus 75 minutes. Deadline is currently unknown.                                         | Not created       |

P1/P2 work waits until the golden path is green on the deployed URL (§1.2). P2/P3 work remains optional; record deliberate deferrals and do not silently treat them as complete. There is no real event clock yet.

## Task ledger

See BUILD_PLAN.md §18.2 for the full dependency list, owned files and each task's "done when" check. Update the evidence column with real commands/results and the committing checkpoint as work proceeds.

| ID   | Scope                                                                               | Status      | Evidence / commit                                                                                                                                                                                                      |
| ---- | ----------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Public repo, pnpm workspace, strict TS, lint/format and environment configuration   | BLOCKED     | Workspace/config/starter implemented; cached typecheck/build PASS; normal install, lockfile and ESLint pending. See docs/verification/F-01.md                                                                          |
| F-02 | Dev Compose and root development/database/test/audio/evaluation scripts             | BLOCKED     | Implementation saved: dev supervisor, web/server/jobs entrypoints and task commands. Four lifecycle tests pass; Compose config and server typecheck pass. Full startup blocked by environment.                         |
| F-03 | Shared entity/API/event/AI schemas, screen/action/prompt IDs and errors             | DONE        | Entity schemas/types, 42 API operations, 6 socket events, 17 AI outputs, 28 screens and prompt/lexicon contracts. 14 contract tests plus 4 supervisor tests pass; workspace typecheck/build pass with cached packages. |
| F-04 | Drizzle schema, SQL extensions, exclusion constraint, indexes and distance function | BLOCKED     | 18-table SQL migration, Drizzle mirror and checksum/transaction migration runner implemented. 8 migration tests pass (26 total). Live PG17/vector and Drizzle runtime checks pending.                                  |
| F-05 | Server, auth skeleton, readiness, sockets, Redis/BullMQ and sweeper                 | IN_PROGRESS | PG/Redis clients, actual readiness, authenticated Socket.IO rooms and Redis-independent jobs sweeper now wired. 62 tests PASS; Fastify/plugins/Redis adapter/queues and live runtime checks remain pending.            |
| F-06 | Web skeleton, routes, shell, i18n/RTL, fonts and API/socket clients                 | IN_PROGRESS | Localized routed shell, welcome/role steps, Tailwind and typed API/socket clients implemented. 8 API tests (43 total), typecheck/build pass. Query provider/fonts/browser verification pending.                        |
| F-07 | AI interfaces, runtime modes, fixtures, logging and cache                           | IN_PROGRESS | 17 validated text fixtures, fake/off/live boundaries, cache/audit/mode adapters and speech/embed interfaces implemented. 13 AI tests (56 total). Real service/provider/HTTP wiring pending.                            |
| F-08 | Live provider smoke tests and documented GO/NO-GO decisions                         | BLOCKED     | docs/ai-smoke.md records NOT_RUN. No credentials, live integration or device recordings; no provider GO or measured results claimed.                                                                                   |
| A-01 | Demo OTP, cookie login, current user and role guards                                | IN_PROGRESS | OTP/Redis TTL and attempts, DB identities, signed cookies, /me and three-language tap forms implemented. 11 new tests; full suite 73/73 and builds PASS. Live Redis/PG and two-browser acceptance pending.             |
| A-02 | Worker profile, availability, slots, completeness and embedding jobs                | NOT_STARTED | —                                                                                                                                                                                                                      |
| A-03 | Requests, ranked matches and address privacy                                        | NOT_STARTED | —                                                                                                                                                                                                                      |
| A-04 | Offers, expiration, next worker, emergency cascade and simulated responses          | NOT_STARTED | —                                                                                                                                                                                                                      |
| A-05 | Threads, voice/text/price messages, sockets and translation hook                    | NOT_STARTED | —                                                                                                                                                                                                                      |
| A-06 | Booking holds, confirmations, state transitions, race protection and expiry         | NOT_STARTED | —                                                                                                                                                                                                                      |
| A-07 | Reviews, transactional statistics/tags and summary jobs                             | NOT_STARTED | —                                                                                                                                                                                                                      |
| A-08 | Demo control endpoints, race test, modes, logs and disclosures (P1)                 | NOT_STARTED | —                                                                                                                                                                                                                      |
| A-09 | Earnings, booking history and rebooking (P2)                                        | NOT_STARTED | —                                                                                                                                                                                                                      |
| B-01 | Accessible design components, RTL and dark theme                                    | NOT_STARTED | —                                                                                                                                                                                                                      |
| B-02 | Worker W0–W5 tap-only onboarding                                                    | IN_PROGRESS | Welcome/role flow, W1 tap continuation and W2 demo phone sign-in implemented. W3–W5 trade/interview/profile flow remains pending.                                                                                      |
| B-03 | Worker home, incoming offers, thread and job steps                                  | NOT_STARTED | —                                                                                                                                                                                                                      |
| B-04 | Customer C1–C10 including matches, booking, demo payment and reviews                | NOT_STARTED | —                                                                                                                                                                                                                      |
| B-05 | Playwright multi-context golden path in fake mode                                   | NOT_STARTED | —                                                                                                                                                                                                                      |
| B-06 | D1 demo panel UI (P1)                                                               | NOT_STARTED | —                                                                                                                                                                                                                      |
| B-07 | Error and empty states (P1)                                                         | NOT_STARTED | —                                                                                                                                                                                                                      |
| B-08 | Remaining screens, maps, PWA/offline queue and helper/safety features (P2)          | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-01 | Recorder, STT, captions and speech fallback                                         | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-02 | Prompt catalog, audio build, playback and cached dynamic TTS                        | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-03 | Local command lexicon and number/time parsers                                       | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-04 | Live LLM wrapper with logging, effort, cache, errors and fallbacks                  | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-05 | Voice onboarding extraction, corrections and read-back                              | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-06 | Action registry, targets, guidance, highlights and assistant turns                  | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-07 | Offer/availability parsing, translation, agreements and review AI                   | NOT_STARTED | —                                                                                                                                                                                                                      |
| C-08 | Photo triage and darkness checks (P1); work-photo tagging (P2)                      | NOT_STARTED | —                                                                                                                                                                                                                      |
| D-01 | Three-script area/trade/rate/guide/help/glossary seed content                       | NOT_STARTED | —                                                                                                                                                                                                                      |
| D-02 | Deterministic generators, seed loader and statistics                                | NOT_STARTED | —                                                                                                                                                                                                                      |
| D-03 | Worker/KB embeddings and re-embedding jobs                                          | NOT_STARTED | —                                                                                                                                                                                                                      |
| D-04 | Hybrid retrieval, price statistics, triage and source attribution                   | NOT_STARTED | —                                                                                                                                                                                                                      |
| D-05 | Pure ranking function with reasons and tests                                        | NOT_STARTED | —                                                                                                                                                                                                                      |
| D-06 | Thirty-utterance live triage evaluation and measured accuracy (P1)                  | NOT_STARTED | —                                                                                                                                                                                                                      |
| E-01 | Production Dockerfile, Compose, Caddy and deploy script                             | NOT_STARTED | —                                                                                                                                                                                                                      |
| E-02 | Lightsail deployment, seed and two-phone golden path                                | NOT_STARTED | AWS access/domain configuration required later                                                                                                                                                                         |
| E-03 | GitHub Actions typecheck and unit tests (P1)                                        | NOT_STARTED | —                                                                                                                                                                                                                      |
| E-04 | Laptop Compose plus HTTPS tunnel rehearsal (P1)                                     | NOT_STARTED | —                                                                                                                                                                                                                      |
| S-01 | Optional MCP interface to the in-app action registry (P3)                           | NOT_STARTED | Stretch only after the planned app is demoable                                                                                                                                                                         |

## Validation log

| Check                                         | Result                         | Evidence                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read original plan and extract phases/backlog | PASS                           | Six phases (§18.1), 44 distinct task IDs (§18.2)                                                                                                                                             |
| Planning consistency and file references      | PASS                           | Python standard-library check: all 44 source task IDs appear once in the ledger; six phase rows; all relative Markdown file links resolve; plan unchanged by SHA-256 comparison              |
| GitHub repository read                        | PASS                           | Connector reports public repository, default branch main; contents API confirms empty before setup                                                                                           |
| Shell remote access                           | BLOCKED                        | `git ls-remote …` → `Could not resolve host: github.com`                                                                                                                                     |
| GitHub connector write                        | BLOCKED                        | `create_file` for BUILD_PLAN.md → HTTP 403 `Resource not accessible by integration`; no commit created                                                                                       |
| Local checkpoint and portable bundle          | PASS                           | `7c4b587` created; `git --git-dir=.planning-git bundle verify roshan-rozgar-planning.bundle` passed; fresh temporary clone recovered all seven files byte-for-byte with a clean working tree |
| F-01 typecheck and builds                     | PASS, cached dependencies only | All three package typechecks passed; shared/server emit and React/Vite production build passed; details in docs/verification/F-01.md                                                         |
| Normal install / lockfile / ESLint            | BLOCKED / NOT_RUN              | Registry metadata fetch failed; no lockfile generated; ESLint dependencies unavailable offline                                                                                               |
| Dev preview / Docker                          | BLOCKED                        | Local Vite bind denied with EPERM; Docker socket access denied                                                                                                                               |
| App-flow tests / migration / e2e              | NOT_RUN                        | F-02 onward not implemented                                                                                                                                                                  |
| Live AI, deployment and device rehearsals     | NOT_RUN                        | No integrations, keys, deployment or device sessions                                                                                                                                         |

## Checkpoint history

| Date       | Checkpoint                                                         | Outcome                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-10 | `7c4b587` — `docs(plan): add phase ledger and cross-model handoff` | Planning files and original plan committed locally on main; portable bundle verified and recovered into a normal checkout with identical files. Remote publication blocked by DNS and connector write permission. No application phase completed. |

| 2026-11-10 | F-01 implementation checkpoint, after `c2e8a6b` | Workspace, strict TS, lint/format config, environment example and React starter implemented. Cached typechecks/builds pass; normal install, lockfile and lint remain blocked. GitHub write retried and still rejected with 403; shell DNS still fails. No phase completed. |

For future checkpoints append date, task/phase, commit ID from the previous committed checkpoint, validation results, branch and push status. Phase completion evidence must state which gates passed, not just that files exist.

### F-02 implementation checkpoint

- Implemented local Compose (pgvector PG17, Redis 7 AOF), three-process watch supervisor, foundation HTTP/jobs entrypoints, and root task commands. Deferred task commands fail explicitly until their owning task exists.
- PASS: `node --test --test-isolation=none scripts/test/*.test.mjs` (4 tests); server TypeScript check; `docker compose -f infra/docker-compose.dev.yml config --quiet`.
- Full `pnpm dev` acceptance remains BLOCKED by dependency installation, denied HTTP binding and denied Docker daemon access. The HTTP listener is intentionally foundation-only; Fastify/auth/sockets/readiness are F-05 work.
- User instruction: defer all GitHub operations. Push commands are in docs/PUSH.md. Previous implementation commit: `4e41968`.

### F-03 contract checkpoint

- Shared schemas validate private/public boundaries, client input ownership, time/rate ranges, registered assistant targets and retrieved triage citations. All plan data entities, API operations, screen IDs, event contracts and AI output routes have schemas/types.
- PASS: native test suite (18 cases), workspace typecheck and builds using cached dependencies. Zod 3.25.75 recovered with cache integrity verification.
- API rationale and naming/serialization notes: docs/adr/0001-shared-contracts.md. Contracts do not implement business routes, authorization, state transitions or voice actions.
- Previous checkpoint: `4fae12c` (F-02). No phase complete; no GitHub operations attempted.

### F-04 database checkpoint

- Implemented 18-table initial migration with extensions, exclusion constraint, lookup/vector indexes, expiry indexes and database-level range/amount checks; Drizzle column/key/check/index mirror; migration tooling/configuration.
- PASS: 26 foundation tests (8 migration-runner cases), migration loader/checksum, mirror syntax check. The missing DATABASE_URL guard fails with an actionable message and no credentials in logs.
- BLOCKED: Docker daemon; local PostgreSQL18 cannot bind even a Unix socket and lacks vector; Drizzle dependency unavailable offline. No live migration or double-booking integration test has run. See docs/verification/F-04.md.
- Previous checkpoint: `68b9784` (F-03). No GitHub operations attempted.

### F-05 backend foundation checkpoint

- Added validated environment config, JOSE sessions/cookie helpers/role guard, dependency readiness helper and Redis-independent DB sweeper/scheduler.
- PASS: 9 new backend tests (35 total) and server typecheck with cached packages. Dependencies now include JOSE6.2.3; 41 cached packages are available locally.
- Full HTTP/auth/socket/queue integration is pending; no working backend routes are claimed. See docs/verification/F-05.md. Previous checkpoint: `bdff3e3` (F-04).

### F-06 frontend checkpoint

- Added React Router route placeholders, three-language dictionaries/preferences/RTL, persistent shell/captions/offline banner, three-step welcome/role selection, Tailwind4, typed fetch client and disconnected Socket.IO client.
- PASS: 8 API-client tests (43 tests total), workspace typecheck/build with cached dependencies. All role pages visibly remain previews; audio is unavailable, not simulated as working.
- Pending: TanStack Query/Zustand setup, self-hosted fonts and browser/RTL/device checks. Earlier handoff cache assumption corrected: TanStack Query and Zustand are not cached. See docs/verification/F-06.md. Previous checkpoint: `3cefe2d` (F-05 partial).

### F-07 runtime and session checkpoint

- Added 17 validated JSON text fixtures, required demo/mode metadata, mode-isolated caching, privacy-safe PostgreSQL audit/Redis TTL adapters, per-caller live allowance hook, STT upload/language boundary, fixture embeddings and honest unavailable TTS fallback.
- PASS: 13 AI-runtime tests; total suite 56 cases. Source typechecks pass with cached dependencies. Server build copies runtime fixture and SQL assets.
- Pending: real SDK/service/HTTP bindings, token usage and timeout/refusal integration, real audio. F-08 smoke report explicitly NOT_RUN; no provider measurement invented. See docs/verification/F-07.md and docs/ai-smoke.md. Previous checkpoint: `d275a9e` (F-06 partial).
- GitHub remains deferred. Push all local commits using docs/PUSH.md; recovery bundle is refreshed after the final commit. No phase has met all exit checks.

### Final verification for this implementation session

- PASS: full native suite, **56/56 cases** (`pnpm test` equivalent with cached tools).
- PASS: workspace builds (shared TypeScript, server TypeScript plus copied runtime assets, React/Vite production bundle) and source typechecks with cached dependencies.
- PASS: Prettier check, Compose configuration validation, Git whitespace checks, original-plan SHA-256 and all 44 backlog IDs/continuation links.
- PASS: compiled server AI runtime loads its copied fixture and returns explicit `mode: fake`, `demo: true` metadata.
- NOT_RUN/BLOCKED: normal registry install/lockfile/ESLint, browser/device QA, live PG17/vector/Redis integration, Drizzle runtime import, providers and deployment. No golden-path success or full phase completion is claimed.
- All work is committed locally; the recovery bundle is regenerated from the final head and verified by cloning it into a clean temporary checkout. No GitHub operations were attempted after the user deferred them.

### F-05 service and realtime checkpoint

- Added bounded PostgreSQL/ioredis connections, current dependency readiness, signed-cookie Socket.IO authentication, database-checked thread membership, same-origin handshake protection, session expiry disconnect and bounded subscriptions. No client event can select another user's notification room.
- Replaced idle jobs scaffold with the 15-second PostgreSQL expiry sweeper; it creates no Redis connection. Expiry fan-out and BullMQ consumers remain pending. HTTP still uses an explicitly temporary Node transport until Fastify/plugins are installed.
- PASS: server TypeScript; complete native suite **62/62** (six new HTTP/security/socket-policy tests, including Socket.IO construction/close without binding). Live socket handshakes/database queries remain NOT_RUN. Recovered ioredis5.3.2/Socket.IO4.8.4 and their dependencies from integrity-checked npm cache; this is still not a normal install.
- Previous checkpoint: `2b31af2`. Main/local only, GitHub deferred. Phase 0 remains IN_PROGRESS.

### A-01 demo authentication checkpoint

- Implemented five-minute mocked OTPs with server-generated six-digit codes, stored HMAC digests, atomic Redis compare/consume and five failed attempts per issued code. Code generation never sends SMS; forms show DEMO disclosures in all three languages.
- Added transactional user/worker creation with immutable existing role, private current-user projection, signed HttpOnly cookie routes, origin checks, bounded JSON bodies and Redis request limits with hashed IP keys. The interim Node transport delegates to reusable domain services/controllers; Fastify remains an open F-05 gate.
- Worker W1 now continues by tap to W2; worker/customer phone forms normalize Pakistani numbers, show the demo code, require an explicit confirm, verify retained cookies through `/api/me`, preserve Urdu/Roman/English labels, and recover from errors. Customer name/location and worker W3–W5 remain pending.
- PASS: **73/73 native cases**, including 11 new auth/body/controller/transaction checks; all workspace production builds with cached dependencies. Redis Lua and SQL execution, two-browser login and visual/device verification remain NOT_RUN; A-01 is IN_PROGRESS.
- Previous checkpoint: `da2e066`. GitHub deferred; no application phase is complete. Recovery bundle refreshed after commit.

### Progress report checkpoint

- Latest implementation: `5d51004` (demo authentication); preceding server/realtime checkpoint `da2e066`.
- Verified task completion is **1/44 = 2.3%**. Phase 0 acceptance is **1/8 = 12.5%**. No phase has met all exit checks (**0/6**). Eight foundation tasks plus A-01/B-02 are tracked as started or externally blocked; 34 tasks remain NOT_STARTED.
- Code-scope estimates: Foundation roughly **65–70%**, early core flow roughly **5–10%**, overall roughly **15%**. These are rough implementation estimates, not measured acceptance or deployment percentages. The complete booking flow has not been built.
- Latest evidence: 73 passing native cases, cached workspace production builds, final server typecheck/build and Prettier PASS. No real-service/browser/device gates passed in this environment. GitHub remains deferred.

### Time-boxed MVP golden-path source checkpoint

- Added shared MVP catalog/command/state schemas and `/api/mvp/state` + `/api/mvp/command`, preserving richer contracts as future targets.
- SQL actions now cover worker profile/availability, customer requests, matching state, timed offers, accept/decline, text/price negotiation, DB-protected holds, both-party confirmation, arrival/job steps, customer-confirmed DEMO cash completion and reviews/statistics.
- Added `scripts/seed.ts` for four areas, eight trades/rate cards and three explicitly DEMO worker accounts. Added localized compact screens for these actions with polling and private-address display rules.
- PASS: shared/server/web builds with cached dependencies. Real SQL/runtime/device checks remain pending. Phase acceptance counts are unchanged; original advanced features are deferred by user instruction.
