# Roshan Rozgar — session handoff

Updated: 2026-11-10 (Asia/Karachi).

## Current instruction and status

The user explicitly asked to **leave GitHub for now, keep implementing and committing locally, and provide push commands**. Do not retry GitHub. Continue implementation in task order even when environment-only checks on earlier tasks are blocked; keep those checks open. No phase is complete.

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

- F-05 partial: config, JOSE session/cookie/role helpers, readiness and Redis-independent database sweeper/scheduler. Nine new tests pass (35 total), server typecheck passes. Full HTTP/socket/queue wiring is pending; main/jobs remain scaffolding. See docs/verification/F-05.md.

- F-06 partial: React Router screen placeholders, localized shell/preferences/captions/back/offline status, welcome/role steps, Tailwind4, typed API client and disconnected Socket.IO client. Eight new API tests (43 total); workspace typecheck/build pass. Query provider/fonts/browser acceptance remain open. See docs/verification/F-06.md.

## Exact next work

Implement **F-07 fake/off AI interfaces** with per-route validated fixtures, explicit demo metadata, mode-isolated cache keys and privacy-safe call logs. Keep live provider and HTTP wiring visibly unavailable until implemented. Then document F-08 live-provider smoke tests as not run/blocked, not measured GO decisions.

F-06 still needs TanStack Query/Zustand setup, self-hosted fonts and browser/device checks. The earlier cache assumption was wrong: Query/Zustand are absent. React Router/Socket.IO/Tailwind were recovered, and the UI is a labelled preview with disabled audio, not a working role flow.

F-05 still needs Fastify/auth/error/redaction/rate-limit/static plugins, Socket.IO rooms/adapter, BullMQ and real server/jobs integration. Dependencies are unavailable offline; helpers are tested but not wired.

F-01 installation/lint, F-02 complete dev startup and F-04 live DB/Drizzle gates remain open. Continue independent code work per user instruction. F-03 is accepted against cached package checks. Earlier commits: F-01 `4e41968`, F-02 `4fae12c`, F-03 `68b9784`, F-04 `bdff3e3`, F-05 partial `3cefe2d`; use Git log for the latest checkpoint. No phase is complete.

## Environment and validation limits

- Node 24.15.0. Pinned pnpm11.25.0 executable is available under `/home/abdur-rehman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs`.
- Shell cannot resolve GitHub/npm domains. The GitHub integration previously rejected writes with HTTP403; it is now deferred by user instruction.
- Temporary cached dependencies are under `/tmp/rr-verified-packages`, linked from untracked `node_modules`. This is not a pnpm installation. No lockfile exists. ESLint9/typescript-eslint are unavailable offline.
- For cached checks only, invoke pinned pnpm with `--config.verify-deps-before-run=false`; otherwise it attempts installation. This flag is not committed to workspace configuration.
- Use Node native tests with `--test-isolation=none` in this sandbox, so assertions run in the current process and results report individual cases. Vitest/Playwright integration remains future work.
- Compose configuration validation works, but Docker daemon socket access is denied. Local HTTP binding is denied (`listen EPERM`). No development servers or jobs are running.
- Shared/server/web typechecks and builds pass against cached packages. Current tests: 4 supervisor, 14 contracts, 8 migration-runner, 9 backend foundation and 8 API-client cases (43 total). The current frontend uses 69 integrity-checked cached packages; these are not a normal installation.
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
