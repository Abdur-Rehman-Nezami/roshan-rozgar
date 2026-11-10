# Roshan Rozgar — session handoff

Updated: 2026-11-10 (Asia/Karachi).

## Current state and authorization

The user requested a phase breakdown, separate commits for completed phases, and progress/handoff files so another model or account can resume. They clarified this session's scope as **"Plan and contiuation"**. Only planning and continuation documentation has been prepared. No app implementation is complete and Phase 0 has not started.

Repository: https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git

Branch: `main` for the local planning checkpoint. **GitHub publication is blocked; the remote repository is still empty.** The connector rejected the attempted write with HTTP 403 `Resource not accessible by integration`. PROGRESS.md records the original backlog and phase exit gates.

## Recover this checkpoint before switching accounts

The current workspace has no usable root `.git`. The local checkpoint uses separate metadata in `.planning-git`; do not edit the environment's protected `.git` mount. A portable bundle, `roshan-rozgar-planning.bundle`, contains the committed planning files and history. Transfer that bundle to the next machine/account if GitHub publication has not been completed. Local files alone are not automatically accessible to another account.

In this workspace, inspect the saved checkpoint using:

```bash
git --git-dir=.planning-git --work-tree=. log -5 --oneline
git --git-dir=.planning-git --work-tree=. status --short
git --git-dir=.planning-git bundle verify roshan-rozgar-planning.bundle
```

On a machine with normal network access and GitHub write authorization, recover and publish the bundle:

```bash
git clone -b main /path/to/roshan-rozgar-planning.bundle roshan-rozgar
cd roshan-rozgar
git remote rename origin planning-bundle
git remote add origin https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git
git ls-remote origin
# Only if the remote still has no commits:
git push -u origin main
```

If the remote has acquired commits, fetch and reconcile the histories deliberately; do not force-push. After publishing, update this handoff and PROGRESS.md with the actual remote commit and verified push status. Alternatively, an authorized connection can publish the local files, but it must preserve their exact contents and report the resulting history honestly.

## Resume procedure

1. First recover/publish the bundle above if the remote is still empty. Once publication is verified, use a real clone of the repository. On a new machine/account:

   ```bash
   git clone https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git
   cd roshan-rozgar
   git status --short --branch
   git log -5 --oneline
   ```

   For an existing checkout, inspect local changes before fetching or integrating remote commits. Do not overwrite local work. Prefer `git pull --ff-only` only after confirming the working tree and branch are suitable.

2. Read AGENTS.md, this file, PROGRESS.md, then BUILD_PLAN.md §0–§3 and §18. Read §6 and §11 before stateful code.
3. Check the user's current scope. For a request to begin implementation, start **F-01**, not a later phase. Dependencies and task acceptance checks are in §18.2. Do not mark the public-repository portion of F-01 as a completed workspace setup.
4. Inspect available tools and network access. Install the package manager and dependencies only in an implementation session. Verify versions and commit the resulting lockfile.
5. Keep the progress/handoff files current at every task checkpoint. Commit and push each completed phase separately; if stopping partway through a phase, checkpoint the actual partial state without claiming phase completion.

## Exact next work when implementation is requested

**F-01 — Phase 0 Foundation.** Set up the pnpm TypeScript monorepo with `apps/web`, `apps/server`, and `packages/shared`; strict TypeScript, ESLint/Prettier, editor configuration, ignore rules and `.env.example`. Preserve the plan and continuation instructions. The task's exit check is `pnpm -r typecheck` passing for the workspace; dependencies and real code must exist before reporting that result.

Continue F-02 through F-08 sequentially. The public repository already exists. No code, database schema, fake AI fixtures, application screens or infrastructure files have been implemented here.

## Environment observations from the planning session

These describe this session only; recheck them in a new session:

- Workspace: `/home/abdur-rehman/rmm`; BUILD_PLAN.md was the only project file initially present.
- `git status` failed because the workspace's `.git` is an empty, read-only environment mount. It is not a usable checkout. Do not change permissions or treat this folder as a normal clone.
- Shell `git ls-remote https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git` failed: `Could not resolve host: github.com`.
- The connected GitHub API could read the target repository and reported it public and empty, with `main` as its default branch. A `create_file` write was attempted for BUILD_PLAN.md and failed with HTTP 403 `Resource not accessible by integration`. Nothing was published. The displayed repository permissions did not guarantee this integration had content-write access.
- Node `v24.15.0`, npm, Git `2.53.0`, Docker and gh executables were present. `pnpm` was not installed. Docker daemon access, registry connectivity and gh authentication were not tested.
- No dependencies installed, app processes started, database migrations run or provider calls made. No deployment attempted.

## Missing inputs and decisions

- `Roshan Rozgar Product & Figma Design Spec.pdf` and `Roshan_Rozgar_Problem_Statement.pdf` are referenced but not present. Use the plan's available details to progress; obtain the PDFs before claiming design-spec fidelity or problem-statement verification.
- Event deadline/official start time and submission details are unknown. The build plan's seven-hour schedule is relative; do not invent a deadline or an official-start compliance claim.
- No API keys, AWS credentials, domain or deployment target configuration have been supplied. F-08 and live/deployed gates require those resources; record blocked checks and continue independent work.
- Model names, provider behavior and cost claims in the original plan have not been verified. Verify current official docs and smoke-test during integration; record any necessary engineering change.

## Pending work and verification

All application tasks are NOT_STARTED; see PROGRESS.md. No application validations are applicable to this documentation-only checkpoint. Planning-file validation and publication evidence belong in PROGRESS.md. There are no running app processes, database changes or local implementation edits to recover.

## Copyable prompt for another model/account

```text
Continue Roshan Rozgar from https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git.
The initial planning session could not publish to GitHub. If it is still empty,
recover the supplied roshan-rozgar-planning.bundle using HANDOFF.md first.
Begin implementation now. Read AGENTS.md, HANDOFF.md and PROGRESS.md, then
BUILD_PLAN.md sections 0–3, 6, 11 and 18. Inspect branch, working tree and
recent commits before changing files. Start the next dependency-ready task
listed in HANDOFF.md (currently F-01; no application phase is complete).
Follow BUILD_PLAN.md and keep the golden path green once implemented.
Update PROGRESS.md and HANDOFF.md at each durable checkpoint, recording
exact validation results, blockers and the next action. Make small task
commits and a separate honest completion commit for each finished phase;
push checkpoints so another account can resume. Never mark a phase complete
without its exit checks. If stopping mid-phase, commit/push the partial
checkpoint and state exactly what remains. Never put secrets in the repo.
```

This prompt requests implementation for the next session. If you only want more planning, change "Begin implementation now" accordingly before sending it.
