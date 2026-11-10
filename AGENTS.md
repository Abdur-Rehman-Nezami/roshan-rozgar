# Repository instructions

## Read before working

Read HANDOFF.md, PROGRESS.md, then BUILD_PLAN.md §0–§3 and §18. Read §6 and §11 before changing state. The root BUILD_PLAN.md is the canonical engineering plan; do not create a divergent copy in docs/. The referenced design specification wins on UX when available; the plan wins on engineering.

The latest user scope is **plan and continuation setup only**. Application implementation has not been requested for this planning session. A later explicit request to continue the build authorizes work from the next task in HANDOFF.md.

## Product and engineering rules (BUILD_PLAN.md §0)

- Never present mocked or seeded data as real. Anything mocked shows a visible "DEMO" label in the UI and is listed in README > "Seeded & mocked".
- Never commit secrets. Read keys from env only. Never log raw audio, phone numbers or addresses.
- AI never decides booking state, prices shown as numbers, or who is free. Code and Postgres do. AI parses, ranks inputs, summarises and phrases.
- Every AI call goes through apps/server/src/ai/llm.ts (or stt.ts / tts.ts / embed.ts) so it is logged, cached, rate-limited and has a fallback.
- Every voice action that has consequences (accept job, confirm price, confirm booking, post review) needs an explicit confirm (tap or "haan"/"theek hai").
- Every screen must work tap-only when AI_MODE=off.
- Small commits, conventional messages (feat:, fix:, chore:). Rebase on main often. Do not reformat files you don't own. Do not rewrite shared history or discard another person's uncommitted work.
- Do not add features that are not in BUILD_PLAN.md §18 without adding them there first.

Use the ownership boundaries in §4.2 if multiple contributors are active. The parallel-track diagram describes an option, not a requirement to spawn agents.

## Durable progress and commits

1. At session start inspect the current branch, working tree and recent commits. Fetch remote state when available. Read the two continuation files before choosing work.
2. Select a dependency-ready task from §18.2 and mark it IN_PROGRESS in PROGRESS.md before substantial work. Phase 0 tasks are sequential. Later phases can overlap as the plan permits.
3. A task is DONE only after its implementation, relevant typecheck/tests, and its specific "done when" check pass. Record exact commands and results; distinguish PASS, FAIL, BLOCKED and NOT_RUN. Missing keys or devices do not count as a passed check.
4. Commit small coherent units with task IDs, for example `feat(foundation): F-01 initialize pnpm workspace`. Include updated PROGRESS.md and HANDOFF.md with each durable checkpoint. Stage specific reviewed files and check for secrets.
5. When every exit check for a phase passes, make a separate commit `chore(phase-N): complete <phase name>` containing the phase's completion evidence in PROGRESS.md. Do not create empty or misleading completion commits. If blocked, record `chore(handoff): checkpoint phase-N at <task ID>` and keep the phase open.
6. Push checkpoints and phase commits to the repository's working branch. Record whether push was verified. Never say "pushed" for a local commit. If main is protected, use a branch/PR and record its name and URL. Do not force-push.
7. Before ending a session, switching models, or running low on context, checkpoint early. Update the handoff with the exact next task, touched files, commands and results, blockers, pending changes, and any process/migration state. Do not wait for a token-limit interruption to do this.

Commit IDs belong in the next checkpoint's history, or can be obtained with `git log`; never invent the hash of the commit currently being written. Use HANDOFF.md to identify the branch and PROGRESS.md for status. If they disagree with the code, inspect the history, reconcile them and rerun necessary checks.

## Environment and verification

Do not assume credentials, browser sessions, installed tools, services or local paths transfer to another account. Keep configuration names and setup instructions in the repository; transfer secrets separately through the user's secure mechanism. Verify API model names, pricing and SDK behavior against current official documentation when implementing integrations; untested claims in the plan are design inputs, not measured facts.

Keep the golden path (§16.1) green once implemented. Before the full app exists, run the checks appropriate to the implemented tasks and explicitly record that the end-to-end path is not yet available.
