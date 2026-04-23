---
id: 4289048002
number: 90
title: >-
  session-prefetch.sh should add "## Open PRs" block to surface stack-drain
  state
state: open
created_at: '2026-04-18T20:04:43Z'
updated_at: '2026-04-20T07:25:50Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/90
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/90'
---
# session-prefetch.sh should add "## Open PRs" block to surface stack-drain state

## Pattern observed
Captured by the Run 29 self-improvement pass.

`session-prefetch.sh` currently renders Issues but **not PRs**. On Run 29 I had to spend ~4 extra tool calls (via `mcp__github__list_pull_requests` + per-PR status) to learn that the repo has **17 open PRs** (~15 conflicting), which critically shapes whether a heartbeat should open yet another PR.

The PR stack is the single most load-bearing piece of context for the "should I open a PR this tick?" decision — and it's invisible at orient.

## Proposed change
After the Issue block, add a PR block:

```bash
echo "## gh pr list --state open --limit 30"
echo '```'
(cd "$REPO_ROOT" && gh pr list --state open --limit 30 \
  --json number,title,mergeable,headRefName \
  --jq '.[] | "\(.number) \(.headRefName) \(.mergeable) \(.title[:60])"' 2>&1 \
  | head -40)
echo '```'
```

On remote sessions (no `gh` CLI — see #62), this block falls back to a note: *"gh CLI unavailable — use `mcp__github__list_pull_requests` in Step 1"*. Same dual-path treatment as #62 recommends for the Issue block.

Bonus: include a one-line summary — *"17 open PRs (15 conflicting, 2 mergeable) — stack-drain in progress, avoid opening new PRs"* — by counting the `mergeable` field. That single line would have saved Run 29's full diagnostic walk.

## Acceptance
- [ ] `session-prefetch.sh` renders an `## Open PRs` block with number, branch, mergeable state, title (truncated).
- [ ] A one-line summary prefaces it (`N open: M conflicting, K mergeable`).
- [ ] `gh` CLI absence is handled gracefully (note for MCP fallback).
- [ ] Verified on a repo with ≥1 open PR — output matches the `gh pr list` shape.

## Related
- #61 (SessionStart npm install — sibling prefetch improvement)
- #62 (gh CLI absent on remote — same dual-path problem)
- #64 (drain-the-stack epic — the exact state this block would surface)

## Pattern source
Run 29 self-improvement pass.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T20:04:43Z
**Updated:** 2026-04-20T07:25:50Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta, priority:low
