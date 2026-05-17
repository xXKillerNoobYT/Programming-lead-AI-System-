---
id: 4288673036
number: 62
title: >-
  Remote heartbeat sessions lack `gh` CLI — harness must prefer GitHub MCP tools
  + prefetch script must not rely on `gh`
state: open
created_at: '2026-04-18T17:14:41Z'
updated_at: '2026-04-20T07:25:41Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/62
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/62'
---
# Remote heartbeat sessions lack `gh` CLI — harness must prefer GitHub MCP tools + prefetch script must not rely on `gh`

## Pattern observed
**Run 28 (PR #60)** — a scheduled remote heartbeat found `gh: command not found`. Every reference to `gh issue list`, `gh pr merge`, `gh api graphql`, `gh pr create` in CLAUDE.md §3 / §6 / §8 and in `.claude/commands/heartbeat.md` is a dead letter in remote sessions.

The session silently degraded: `.claude/scripts/session-prefetch.sh` still shells out to `gh issue list` and prints an error into `session-state.md` instead of a real Issue list. The model had to re-fetch via `mcp__github__list_issues` anyway.

## Impact
- **Session prefetch is partially broken** — the "gh issue list" section is always empty on remote.
- **Docs send the agent down the wrong path** — `gh pr merge --squash --delete-branch` in `.claude/commands/heartbeat.md` (Merge station) will never run on remote.
- **Two code paths** for Issues/PRs on local (`gh`) vs remote (MCP) without the docs saying so.

## Proposed change

### A. `session-prefetch.sh`
Detect at the top: `command -v gh >/dev/null 2>&1` and branch. If absent, skip the `gh issue list` block and write a note: *"gh CLI unavailable — agent should use `mcp__github__list_issues` in Step 1"*.

### B. `CLAUDE.md` §3 / §6 / §8 + `.claude/commands/heartbeat.md`
Everywhere a `gh` command appears, add parenthetical: *"(or `mcp__github__...` tool if `gh` is unavailable — remote sessions don't have the CLI)"*. Don't remove `gh`; it's still correct on local. Just make the dual-path explicit.

### C. `.claude/commands/heartbeat.md` Merge station
The auto-merge step currently reads roughly *"`gh pr merge --squash --delete-branch` on pass"*. Reword as:
> On pass: merge the PR — via `gh pr merge --squash --delete-branch` on local, or `mcp__github__merge_pull_request(..., merge_method: "SQUASH")` on remote. Delete the branch after merge either way.

## Acceptance
- [ ] `session-prefetch.sh` no longer errors on missing `gh`; prints a note instead.
- [ ] `CLAUDE.md` + `.claude/commands/heartbeat.md` name the MCP equivalents next to each `gh` command.
- [ ] A fresh remote session run through the full pipeline succeeds end-to-end without `gh`.

## Related
- #37 (auto-merge gate) — just shipped; its Merge-station wiring (follow-up sub-issue of #34) will be the first real test of the MCP path.
- `superpowers:using-git-worktrees` — worktrees work fine without gh; this is specifically about Issues/PRs.

## Pattern source
Captured by the Run-28 self-improvement pass.

## Labels
`type:task`, `phase:meta`, `status:backlog`

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T17:14:41Z
**Updated:** 2026-04-20T07:25:41Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta, priority:low
