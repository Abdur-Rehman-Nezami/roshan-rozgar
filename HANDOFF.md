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

## Exact next work

Implement **F-05 backend foundation**. Start with validated environment/session configuration and the Redis-independent database sweeper; then integrate Fastify, cookie auth, error/redaction plugins, Redis/BullMQ and authenticated Socket.IO when dependencies can be installed. Fastify/BullMQ/pino are absent from the cache; do not invent successful imports or full readiness. Existing Node HTTP/jobs entries remain explicitly scaffolded until replacement.

F-01 installation/lint, F-02 complete dev startup and F-04 live DB/Drizzle gates remain open. Continue independent code work per user instruction. F-03 is accepted against cached package checks. Earlier commits: F-01 `4e41968`, F-02 `4fae12c`, F-03 `68b9784`; use Git log for the latest checkpoint. No phase is complete.

## Environment and validation limits

- Node 24.15.0. Pinned pnpm11.25.0 executable is available under `/home/abdur-rehman/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pnpm/bin/pnpm.cjs`.
- Shell cannot resolve GitHub/npm domains. The GitHub integration previously rejected writes with HTTP403; it is now deferred by user instruction.
- Temporary cached dependencies are under `/tmp/rr-verified-packages`, linked from untracked `node_modules`. This is not a pnpm installation. No lockfile exists. ESLint9/typescript-eslint are unavailable offline.
- For cached checks only, invoke pinned pnpm with `--config.verify-deps-before-run=false`; otherwise it attempts installation. This flag is not committed to workspace configuration.
- Use Node native tests with `--test-isolation=none` in this sandbox, so assertions run in the current process and results report individual cases. Vitest/Playwright integration remains future work.
- Compose configuration validation works, but Docker daemon socket access is denied. Local HTTP binding is denied (`listen EPERM`). No development servers or jobs are running.
- Shared/server/web typechecks and builds pass against cached packages. F-02 adds four passing supervisor tests and Compose validation; F-03 adds fourteen contract tests.
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
