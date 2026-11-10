# Roshan Rozgar (روشن روزگار)

A mobile-first service connecting skilled workers and customers through Urdu, Roman Urdu and English tap flows.

**Time-boxed MVP:** a compact request-to-review flow is implemented, with an explicitly labelled browser simulation and a PostgreSQL backend. Open `roshan-rozgar-demo.html` to try the simulation without installing services. See [the short demo walkthrough](docs/MVP_DEMO.md). Original production-phase acceptance remains open.

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

**Fastest:** open `roshan-rozgar-demo.html`. Select a language and choose **Try the demo now**. Use the demo bar to switch worker/customer roles. No database or credentials are required for this labelled local simulation.

With Node24 and pnpm11.25.0, run from source:

```bash
pnpm install
pnpm dev:web
```

Choose **Try the demo now** in the browser. Rebuild the self-contained artifact with `pnpm demo:export`.

For the real PostgreSQL/Redis backend, run `pnpm setup:env`, `docker compose -f infra/docker-compose.dev.yml up -d`, `pnpm db:migrate`, `pnpm db:seed`, then `pnpm dev`. Full instructions, demo accounts and the golden-path script are in [docs/MVP_DEMO.md](docs/MVP_DEMO.md). Setup never replaces an existing `.env`.

The MVP uses manual task selection, seeded price guides, text negotiation, timed offers, DB-protected holds, both-party confirmations, job steps, DEMO cash completion and reviews. It polls every three seconds. Live AI/voice, uploads, advanced retrieval and production hardening remain deferred under BUILD_PLAN.md §21.

## Seeded & mocked

Browser mode is a local simulation: eight seeded worker profiles, four areas, eight sample rate cards, mock sign-in and browser storage. Its banner clearly identifies it as DEMO. It makes no provider calls or payments and is not a PostgreSQL concurrency demonstration.

Server mode includes a seed script for four areas, eight trades/rate cards and three marked demo workers; the script has not been run against a live database here. Authentication displays a DEMO code without SMS. Arrival codes and cash payments are DEMO features. Seventeen AI text fixtures, sample STT transcripts and deterministic nonsemantic embedding vectors exist, but the MVP does not rely on them for decisions. No identity verification is claimed.

## AI services and models used

AI interfaces and fake/off runtime behavior are implemented, but no external AI service has been called or measured. BUILD_PLAN.md §2 and §10 list the proposed providers; verify current model availability and SDK support during implementation. AI coding assistant used for this planning and handoff setup: OpenAI Codex.

## Measured and limitations

77 native tests pass, including the browser-simulation golden path through reviews. Workspace builds pass using cached dependencies; a normal install/lockfile/lint remain pending. The HTML export's script is syntax-checked. This environment cannot bind local servers, access Docker or connect a browser, so visual/device and real PostgreSQL/Redis acceptance remain unverified. No external provider calls or live deployment have run. See HANDOFF.md for exact continuation.
