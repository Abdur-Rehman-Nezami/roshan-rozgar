# Current MVP handoff

The latest user instruction is **a time-boxed MVP, with working breadth over production robustness**. Do not resume infrastructure hardening before the demo is rehearsed. GitHub remains deferred; commit locally.

- Open `roshan-rozgar-demo.html` for the self-contained browser simulation. Full walkthrough: docs/MVP_DEMO.md.
- Source: shared `mvp.ts`, server `mvp/service.ts`, web `MvpWorkspace.tsx` and `demo/store.ts`. Compact state/command API, polling, PostgreSQL transactions/exclusion, and an explicitly separate browser simulation.
- Golden path implemented: profile → request → matches → offer → text/price agreement → hold → both confirmations → arrival/job steps → customer-confirmed DEMO cash completion → review.
- Latest checks: 77 native tests PASS; workspace builds PASS using cached dependencies. Exported script syntax is checked. Browser runtime has no connected browsers; real DB/Redis acceptance remains NOT_RUN.
- Commands: `pnpm dev:web` for frontend demo, `pnpm demo:export` to regenerate HTML. Backend: `pnpm setup:env`, Compose up, migrations, seed, `pnpm dev`.
- Next: open and rehearse the HTML demo in a real browser, fix any UI issue found, then verify PostgreSQL/Redis mode in a normal environment. Live voice/AI, uploads, advanced RAG, BullMQ/production hardening and deployment are deliberately deferred for the MVP.
- Local Git remains `.planning-git`, branch main. Use `git --git-dir=.planning-git --work-tree=. ...`. Last compact SQL/UI checkpoint was `a328382`; use git log for latest. Recovery bundle is refreshed after commits. See docs/PUSH.md.

---

The earlier foundation history below remains useful context; its earlier next-work priorities are superseded by this MVP handoff.

> MVP override: user has ~45 minutes and prioritizes a working version of every golden-path step over production detail. See BUILD_PLAN.md §21 and AGENTS.md. Compact SQL facade + full tap UI are now implemented; next is explicit browser demo mode, happy-path verification and startup commands.

# Roshan Rozgar — session handoff

Updated: 2026-11-10 (Asia/Karachi).

## Current instruction and status

The user explicitly asked to **leave GitHub for now, keep implementing and committing locally, and provide push commands**. Do not retry GitHub. Continue implementation in task order even when environment-only checks on earlier tasks are blocked; keep those checks open. No phase is complete. Phase 1 has begun with A-01 authentication and B-02 tap onboarding, while Foundation gates remain open.

Repository: https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git. Local branch: `main`. Git metadata: `.planning-git` (the root `.git` is a read-only environment mount). Use:

```bash
git --git-dir=.planning-git --work-tree=. status --short
git --git-dir=.planning-git log -5 --oneline
```

The recovery bundle is `roshan-rozgar-planning.bundle`; it is refreshed at session checkpoints. Transfer it before switching accounts if the repository has not been pushed. [docs/PUSH.md](docs/PUSH.md) contains exact workspace and bundle publishing commands. Do not overwrite or force-push remote history.

## Implemented

- F-01: pnpm workspace, strict TypeScript, environment/configuration files, shared constants and a three-language React/Vite starter. Cached typecheck/build/format checks pass. Normal install, lockfile and ESLint are still pending. See [F-01 verification](docs/verification/F-01.md). Commit: `4e41968`.
- F-02: Compose for Postgres17/pgvector and Redis7/AOF; development supervisor starts watchable server/jobs/web processes and stops peers on failure; root task commands; four passing lifecycle tests. Compose config and server typecheck pass. HTTP/jobs entrypoints are foundation scaffolding, not F-05 service implementation. Full runtime gate remains blocked.

- F-03: shared Zod schemas/types for data entities, 42 API operations, six socket events, seventeen AI outputs, 28 screens and three-language prompts/lexicon. Fourteen contract tests plus four supervisor tests pass; workspace typecheck/build pass with cached dependencies. See docs/adr/0001-shared-contracts.md. Task accepted within the cached validation scope; full install/lint remains tracked separately under F-01.

- F-04: initial eighteen-table SQL migration, Drizzle mirror, indexes/range/amount checks and transactional checksum/advisory-lock migration runner implemented. Eight migration tests pass (26 total). Live PG17/vector migration and Drizzle import remain blocked. See docs/verification/F-04.md.

- F-05 partial: config, JOSE session/cookie/role helpers, readiness and Redis-independent database sweeper/scheduler. Nine new tests pass (35 total), server typecheck passes. PG/Redis connections, readiness, cookie-authenticated Socket.IO rooms and the real jobs sweeper are now wired; HTTP remains a temporary Node transport. Fastify/plugins/Redis adapter/queues are pending. See docs/verification/F-05.md.

- F-06 partial: React Router screen placeholders, localized shell/preferences/captions/back/offline status, welcome/role steps, Tailwind4, typed API client and disconnected Socket.IO client. Eight new API tests (43 total); workspace typecheck/build pass. Query provider/fonts/browser acceptance remain open. See docs/verification/F-06.md.

- F-07 partial: seventeen validated JSON text fixtures, demo/mode metadata, typed off/unavailable/error paths, Redis mode/cache and PostgreSQL audit adapters, live allowance hook and STT/TTS/embed boundaries. Thirteen AI tests pass (56 total). Real HTTP/service/provider integration remains pending; docs/ai-smoke.md records live checks as NOT_RUN.

## Exact next work

**Next critical work is real F-05 server integration**, followed by finishing F-06/F-07 wiring and the tap-only core flow. Install Fastify5, its cookie/static/helmet/rate-limit/multipart plugins, Pino, Socket.IO Redis adapter and BullMQ in an environment with registry access. PG/Redis connections, readiness, socket authorization and the jobs sweeper have now been wired. Replace the temporary Node HTTP transport with Fastify, add its plugins/Redis socket adapter/BullMQ consumers, and wire AI runtime and auth routes. A-01 demo OTP/current-user service/controller/routes and tap UI are now implemented; finish live Redis/PG and two-browser acceptance when the environment allows. Next independent slice: A-02 worker profile/trades/areas/availability service and B-02 W3–W5 tap onboarding. Read §6/§11 and the A-02 done-when requirements before changing state. Never expose successful readiness for unavailable dependencies. Continue independent code work if an external check remains blocked, as the user requested.

Still open: normal `pnpm install` and committed lockfile/ESLint (F-01); full development startup (F-02); PG17/pgvector migration and Drizzle runtime validation (F-04); full backend integration (F-05); TanStack Query/Zustand setup, self-hosted fonts and browser checks (F-06); real AI/cache/audit HTTP bindings and live SDK adapters (F-07); credentials/device smoke tests (F-08). No phase is complete. Only F-03 has met its task acceptance checks in the cached validation scope.

Checkpoints: F-01 `4e41968`, F-02 `4fae12c`, F-03 `68b9784`, F-04 `bdff3e3`, F-05 partial `3cefe2d`, F-06 partial `d275a9e`, AI `2b31af2`, server/realtime `da2e066`, authentication `5d51004`. Use the local log for the latest AI/session checkpoint. Do not restart these implementations or overwrite their history.

## Environment and validation limits

- Node 24.15.0. Pinned pnpm11.25.0 executable is available under `/home/abdur-rehman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs`.
- Shell cannot resolve GitHub/npm domains. The GitHub integration previously rejected writes with HTTP403; it is now deferred by user instruction.
- Temporary cached dependencies are under `/tmp/rr-verified-packages`, linked from untracked `node_modules`. This is not a pnpm installation. No lockfile exists. ESLint9/typescript-eslint are unavailable offline.
- For cached checks only, invoke pinned pnpm with `--config.verify-deps-before-run=false`; otherwise it attempts installation. This flag is not committed to workspace configuration.
- Use Node native tests with `--test-isolation=none` in this sandbox, so assertions run in the current process and results report individual cases. Vitest/Playwright integration remains future work.
- Compose configuration validation works, but Docker daemon socket access is denied. Local HTTP binding is denied (`listen EPERM`). No development servers or jobs are running.
- Shared/server/web typechecks and builds pass against cached packages. Current tests: 4 supervisor, 14 contracts, 8 migration-runner, 26 backend/security/realtime/auth, 8 API-client and 13 AI cases (73 total). The current workspace uses 90 integrity-checked cached packages (plus the required nested Engine.IO cookie0.7.2); these are not a normal installation.
- The latest full test suite passes 73/73 cases; workspace builds/asset copying, formatting, Compose config and continuation-file checks pass. A compiled AI runtime fixture smoke check passes.
- A-01: `auth/otp.ts`, `redis-otp.ts`, `controller.ts`, `db/identities.ts`, HTTP body/rate-limit helpers and localized SignIn.tsx are implemented. `/api/auth/otp/start`, `/api/auth/otp/verify` and `/api/me` are wired through the interim Node transport. Eleven adapter/domain tests pass; real Redis Lua/PG execution and two-browser acceptance remain NOT_RUN. See docs/verification/A-01.md.
- No live migrations, provider API calls, deployment, browser or device rehearsals have run. Local PG18 initialization succeeded, but server startup failed on its Unix socket; it is stopped. Build outputs and temporary test data are ignored.

## Missing inputs

The design-spec and problem-statement PDFs referenced by the plan are missing. Deadline/official event start are unknown. No provider credentials, AWS configuration or domain are supplied. Do not invent measurements or mark these external checks passed. Verify model names and SDK behavior against current official docs when implementing integrations.

## Resume prompt

```text
Continue implementing Roshan Rozgar. Read AGENTS.md, HANDOFF.md, PROGRESS.md
and the relevant BUILD_PLAN.md sections. Use the local .planning-git history
(or recover the supplied bundle). Leave GitHub operations aside unless I ask.
Implement the next task listed in HANDOFF.md; do not let environment-only
verification blockers stop independent coding. Keep those checks open.
Update progress/handoff with exact commands/results at each checkpoint, make
small local task commits and a separate commit for every truly completed
phase, and refresh the bundle. Never commit secrets or invent passed checks.
```

## Latest offline dependency audit

All cached tarballs were integrity checked, but that does not establish a valid pnpm resolution. A post-build audit found the cached root Lightning CSS1.33.0 does not match @tailwindcss/node's exact1.32.0 dependency. The Vite build passes with this temporary cache, but a normal locked install is still required. Parser-package export manifests also prevented the simple audit from determining their versions; those audit entries are inconclusive, not established runtime failures. Do not copy this temporary node_modules tree as a reproducible install.

## MVP checkpoint (after 4be0719)

Implemented compact shared MVP schemas/catalog, PostgreSQL command/state service for profiles through reviews, authenticated HTTP facade, a catalog/three-worker seed script, and localized compact React screens for the whole tap path. Normal backend keeps PostgreSQL exclusion/transactions/party guards and address privacy. UI polls every three seconds. Shared/server/web builds PASS using cached tools. Real DB/browser acceptance remains NOT_RUN. This is a source checkpoint, not completion of original production phases.
