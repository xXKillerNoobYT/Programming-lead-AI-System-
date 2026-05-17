---
id: 4289047278
number: 89
title: >-
  session-prefetch.sh should prefer `npm ci` over `npm install` to avoid
  lockfile churn
state: open
created_at: '2026-04-18T20:04:27Z'
updated_at: '2026-04-20T07:25:48Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653121
    name: 'type:task'
    color: 0E8A16
    description: Atomic implementation task
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
  - id: 10739055869
    name: 'priority:low'
    color: C5DEF5
    description: Nice-to-have; work on when higher bands empty
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/89
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/89'
---
# session-prefetch.sh should prefer `npm ci` over `npm install` to avoid lockfile churn

## Pattern observed
Captured by the Run 29 self-improvement pass after shipping #61.

The new `.claude/scripts/session-prefetch.sh` calls `npm install` at SessionStart. When it runs against a repo whose `package.json` and `package-lock.json` disagree (example: dashboard `overrides` absent per #87, or a recently-bumped dep), `npm install` silently **rewrites the lockfile** — producing working-tree drift that:

1. Shows up in the prefetch script's own "git status" block as noise.
2. Risks being accidentally committed into any downstream branch change.
3. Papers over the underlying `package.json ↔ package-lock.json` mismatch instead of surfacing it.

Run 29 hit exactly this: after the install, `package-lock.json` was down 3 lines and `dashboard/package-lock.json` was down 120 lines, entirely from the `overrides` resolution branch being dropped. Had to `git checkout -- package-lock.json dashboard/package-lock.json` before committing.

## Proposed change
Prefer `npm ci` when a lockfile is present; fall back to `npm install` only when it isn't.

```bash
if [ -f "$REPO_ROOT/package-lock.json" ]; then
  ROOT_INSTALL_LOG="$(cd "$REPO_ROOT" && npm ci --no-audit --no-fund 2>&1 | tail -5)"
else
  ROOT_INSTALL_LOG="$(cd "$REPO_ROOT" && npm install --no-audit --no-fund 2>&1 | tail -5)"
fi
# same for dashboard/, with --legacy-peer-deps while #87 is open
```

Benefits:
- `npm ci` errors out if `package.json` ↔ `package-lock.json` disagree — actively surfaces drift instead of hiding it.
- Faster than `npm install` in the warm path.
- Never modifies the lockfile — session-state is read-only from the repo's perspective.

## Acceptance
- [ ] `session-prefetch.sh` uses `npm ci` when a lockfile is present.
- [ ] A deliberate drift test (modify `package.json` without updating lockfile, run the script) fails loudly instead of silently rewriting the lockfile.
- [ ] Cold-state test (delete `node_modules/` only, keep lockfile) → `npm ci` succeeds and leaves `package-lock.json` byte-identical.
- [ ] `.claude/session-state.md` block notes when a fallback to `npm install` happened (flag lockfile-absent state).

## Pattern source
Run 29 self-improvement pass. Issue #61 implementation surfaced the lockfile-churn pattern on first try.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T20:04:27Z
**Updated:** 2026-04-20T07:25:48Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta, priority:low
