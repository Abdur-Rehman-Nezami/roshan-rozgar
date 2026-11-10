# Roshan Rozgar (روشن روزگار)

A planned mobile-first service connecting skilled workers and customers through Urdu, Roman Urdu, and English voice and tap flows.

**Current state: Phase 0 started. F-01 workspace and a React welcome starter are implemented; dependency installation and final acceptance checks are blocked. No completed build phase or deployment yet.**

Repository: https://github.com/Abdur-Rehman-Nezami/roshan-rozgar

## Start here

- [BUILD_PLAN.md](BUILD_PLAN.md): engineering source of truth, architecture, contracts, backlog, and acceptance checks.
- [PROGRESS.md](PROGRESS.md): phase status, task checklist, validation evidence, and checkpoint history.
- [HANDOFF.md](HANDOFF.md): current context and a copyable prompt for another account or model.
- [AGENTS.md](AGENTS.md): implementation rules and the commit/handoff workflow.

## Build phases

| Phase                 | Goal                                                                                             | Exit check                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 0 — Foundation        | Monorepo, shared contracts, database, app skeletons, AI interfaces and smoke tests               | Development boots, migration runs, routes render, provider GO/NO-GO recorded |
| 1 — Core flows        | Worker/customer golden path using taps and fake AI                                               | Local Playwright golden path passes                                          |
| 2 — Live AI + RAG     | Voice onboarding, retrieval, triage, source-backed prices, voice notes and reviews               | Golden path works by voice on a phone through HTTPS                          |
| 3 — Deploy + harden   | AWS deployment, seeded database, device and fallback checks                                      | Golden path passes against the deployed URL                                  |
| 4 — Differentiators   | Guided highlights, demo panel, race test, AI switch, emergency mode, photo triage and reputation | Each included feature demonstrated twice consecutively                       |
| 5 — Freeze + rehearse | Final README, demo script, three rehearsals and judge Q&A                                        | Submission ready 15 minutes before the deadline                              |

The plan overlaps phases 1–4; track tasks by their IDs, and record which exit checks remain. Complete the core path before P1/P2 work. The event deadline is not supplied; relative times are planning estimates.

## Commits and continuation

Make small task commits and a distinct completion commit for every phase, with updated progress and handoff files. Push checkpoints so another account can clone them. Record incomplete work honestly; creating this documentation does not complete Phase 0.

## Run it

Use Node 24 and pnpm 11.25.0 (pinned in `packageManager`). In a normal environment with registry access:

```bash
corepack pnpm install
corepack pnpm -r typecheck
corepack pnpm --filter @roshan/web dev
```

Open the Vite URL to see the welcome starter and three language choices. The full worker/customer flow and backend are not implemented. Shared and server packages currently build TypeScript; the server module does not start an API listener.

Additional workspace commands: `pnpm -r build`, `pnpm lint`, `pnpm format:check`, `pnpm format`. A full installation and lint run are still pending, and `pnpm-lock.yaml` has not been generated. See [F-01 verification](docs/verification/F-01.md) for exact results and environment limitations. The complete development/database commands from BUILD_PLAN.md §17.1 arrive in later foundation tasks.

## Seeded & mocked

Nothing has been seeded or mocked in code yet. The plan calls for visibly labelled demo OTP, payment, arrival-code checking, ETAs and simulated responders, plus seeded areas, workers, customers, jobs, reviews and rate cards. No identity verification is planned.

## AI services and models used

No runtime AI service has been integrated or measured. BUILD_PLAN.md §2 and §10 list the proposed providers; verify current model availability and SDK support during implementation. AI coding assistant used for this planning and handoff setup: OpenAI Codex.

## Measured and limitations

Workspace typechecks and builds passed using integrity-checked cached packages; this was not a normal pnpm installation. Registry DNS prevented full installation and lint, local HTTP binding was denied, and Docker daemon access was denied. No application-flow tests, provider measurements or device rehearsals have run. The referenced design-spec and problem-statement PDFs are not present. See HANDOFF.md for recovery and next steps.
