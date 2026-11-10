# Push local commits

GitHub operations are deferred at the user's request. The current workspace stores Git metadata in `.planning-git` because its `.git` is an environment-owned read-only mount. Do not initialize a new history over these commits.

## From this workspace on your machine

Run in your own terminal with network access and your usual GitHub authentication:

```bash
cd /home/abdur-rehman/rmm
git --git-dir=.planning-git --work-tree=. status --short
git --git-dir=.planning-git log -5 --oneline
git --git-dir=.planning-git push https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git main:main
```

This pushes the full local history. If GitHub rejects a non-fast-forward update, inspect and fetch the remote before integrating it; do not force-push.

## From another machine or account

Copy `roshan-rozgar-planning.bundle` to the new machine, then:

```bash
git clone -b main /path/to/roshan-rozgar-planning.bundle roshan-rozgar
cd roshan-rozgar
git remote rename origin recovery-bundle
git remote add origin https://github.com/Abdur-Rehman-Nezami/roshan-rozgar.git
git push -u origin main
```

Once pushed, future sessions can use an ordinary clone of the GitHub repository. Credentials and the temporary cached dependencies are not included in the bundle. Read HANDOFF.md before resuming.
