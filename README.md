# Roshan Rozgar (روشن روزگار)

A planned mobile-first service connecting skilled workers and customers through Urdu, Roman Urdu, and English voice and tap flows.

**Current state: planning and continuation setup only. No application code, deployment, or completed build phase yet.**

Repository: https://github.com/Abdur-Rehman-Nezami/roshan-rozgar

## Start here

- [BUILD_PLAN.md](BUILD_PLAN.md): engineering source of truth, architecture, contracts, backlog, and acceptance checks.
- [PROGRESS.md](PROGRESS.md): phase status, task checklist, validation evidence, and checkpoint history.
- [HANDOFF.md](HANDOFF.md): current context and a copyable prompt for another account or model.
- [AGENTS.md](AGENTS.md): implementation rules and the commit/handoff workflow.

## Build phases

| Phase | Goal | Exit check |
|---|---|---|
| 0 — Foundation | Monorepo, shared contracts, database, app skeletons, AI interfaces and smoke tests | Development boots, migration runs, routes render, provider GO/NO-GO recorded |
| 1 — Core flows | Worker/customer golden path using taps and fake AI | Local Playwright golden path passes |
| 2 — Live AI + RAG | Voice onboarding, retrieval, triage, source-backed prices, voice notes and reviews | Golden path works by voice on a phone through HTTPS |
| 3 — Deploy + harden | AWS deployment, seeded database, device and fallback checks | Golden path passes against the deployed URL |
| 4 — Differentiators | Guided highlights, demo panel, race test, AI switch, emergency mode, photo triage and reputation | Each included feature demonstrated twice consecutively |
| 5 — Freeze + rehearse | Final README, demo script, three rehearsals and judge Q&A | Submission ready 15 minutes before the deadline |

The plan overlaps phases 1–4; track tasks by their IDs, and record which exit checks remain. Complete the core path before P1/P2 work. The event deadline is not supplied; relative times are planning estimates.

## Commits and continuation

Make small task commits and a distinct completion commit for every phase, with updated progress and handoff files. Push checkpoints so another account can clone them. Record incomplete work honestly; creating this documentation does not complete Phase 0.

## Run it

There are no runnable app scripts yet. Implement F-01 first, then follow BUILD_PLAN.md §17.1 once its prerequisites exist. Do not treat planned commands as tested commands.

## Seeded & mocked

Nothing has been seeded or mocked in code yet. The plan calls for visibly labelled demo OTP, payment, arrival-code checking, ETAs and simulated responders, plus seeded areas, workers, customers, jobs, reviews and rate cards. No identity verification is planned.

## AI services and models used

No runtime AI service has been integrated or measured. BUILD_PLAN.md §2 and §10 list the proposed providers; verify current model availability and SDK support during implementation. AI coding assistant used for this planning and handoff setup: OpenAI Codex.

## Measured and limitations

No application tests, accuracy measurements, latency measurements or device rehearsals have run. The design-spec and problem-statement PDFs referenced by the plan are not present in this workspace. Record missing inputs and external setup in HANDOFF.md.
