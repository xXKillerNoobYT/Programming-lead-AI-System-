---
id: 4289646441
number: 96
title: >-
  session-prefetch should render compact Issues + PRs tables via GitHub REST
  (avoids `gh` and MCP output-size limits)
state: open
created_at: '2026-04-19T01:24:40Z'
updated_at: '2026-04-20T07:25:54Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/96
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/96'
---
# session-prefetch should render compact Issues + PRs tables via GitHub REST (avoids `gh` and MCP output-size limits)

## Pattern observed

**Run 34 (this session)** — after #62 teaches `session-prefetch.sh` to skip `gh issue list` on remote, the agent still has to fall back to `mcp__github__list_issues`, which returned **56 KB of JSON** for 28 open Issues. That's over the inline tool-output cap, so the result was persisted to disk and required a custom Python one-liner to flatten into a readable 28-row table before the agent could pick a task. Same with `list_pull_requests` (54 KB).

Net effect: **5+ tool calls and ~3 parsing hops** just to see "what Issues are open, in what state, with what labels". On local (with `gh`), `gh issue list --state open --limit 30` is one call and returns the rendered table directly. The remote session pays a tax for having neither `gh` nor a compact-output MCP tool.

## Impact

- Orient is 3–5× more expensive on remote than local for the same information.
- Parsing scripts are re-invented every session (Python one-liners in Run 29, Run 34).
- Large `list_issues` responses consume context-window space that could have been spent on actual work.

## Proposed change

Add a small helper (shell or node) invoked by `session-prefetch.sh` that:

1. **Hits the GitHub REST API directly** using `$GITHUB_TOKEN` (already injected in remote sessions) with `curl` — no `gh` dependency, no MCP tool size limits.
2. **Renders two compact tables** into `.claude/session-state.md`:
   - **Open Issues** (`# | created | labels | title`), sorted oldest-first, one row per line, 28 rows ≈ 2 KB.
   - **Open PRs** (`# | mergeable | head-ref | title`), same shape (closes #90 as a side effect).
3. Gracefully no-ops if `$GITHUB_TOKEN` is missing (falls back to the friendly-note path from #62).

## Acceptance
- [ ] New helper script at `.claude/scripts/fetch-github-tables.{sh,js}` — pick the simplest stack (bash + curl + jq is likely fine).
- [ ] `session-prefetch.sh` calls it after the `## git log` block; writes `## Open Issues` and `## Open PRs` sections with the compact table.
- [ ] A fresh session's `session-state.md` carries the Issue table directly — no MCP call, no Python parse needed to pick a task.
- [ ] Run on a host WITHOUT `$GITHUB_TOKEN` — the helper exits clean and prefetch still succeeds (just no table).
- [ ] If it replaces #90's "Open PRs block" entirely, #90 can be closed as a duplicate.

## Pattern source

Captured by the Run 34 self-improvement pass — see `reports/run-34-summary.md`.

## Related
- #62 (just shipped — friendly-note fallback when `gh` is missing; this Issue goes further by providing *real* data)
- #90 (Open PRs block — likely subsumed by this work)
- #89 (`npm ci` over `npm install` — orthogonal prefetch hardening)

## Labels
`type:task`, `phase:meta`, `status:backlog`

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T01:24:40Z
**Updated:** 2026-04-20T07:25:54Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta, priority:low
