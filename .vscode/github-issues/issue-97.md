---
id: 4289646897
number: 97
title: >-
  session-prefetch.sh: write compact Issue + PR tables so remote heartbeats
  don't hit `mcp__github__list_issues` 56KB truncation
state: open
created_at: '2026-04-19T01:24:54Z'
updated_at: '2026-04-20T07:25:55Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/97
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/97'
---
# session-prefetch.sh: write compact Issue + PR tables so remote heartbeats don't hit `mcp__github__list_issues` 56KB truncation

## Pattern observed
Captured by Run 34 self-improvement pass (per CLAUDE.md §3 Step 3 / remote-session pipeline in the scheduler prompt).

On this remote session (no `gh`), the natural first call to enumerate work — `mcp__github__list_issues(state: OPEN, perPage: 50)` — returned **56 KB of JSON (28 open Issues)**, which exceeded the tool-result token limit. The output was persisted to a `tool-results/*.txt` file with a warning:

> Error: result (56,045 characters) exceeds maximum allowed tokens. Output has been saved to /root/.claude/projects/…/tool-results/…txt

To get a usable Issue list I had to write a small inline `python3` parser to flatten `issues[*].{number,title,createdAt,labels}` into one-line-per-Issue form. **Every future remote heartbeat will repeat this dance.** Local sessions sidestep it because `gh issue list --limit 30 --json …` is already compact — this is purely a remote-MCP cost.

PR #95 (Issue #62, just merged ready) updated `session-prefetch.sh` to detect missing `gh` and print a note telling the agent to use `mcp__github__list_issues`. That closes the "silent stderr" bug, but leaves the 56 KB overflow in place for every remote tick.

## Proposed change
`session-prefetch.sh`: when `gh` is unavailable AND `GITHUB_PERSONAL_ACCESS_TOKEN` (or `GH_TOKEN` — match `.mcp.json` env key) is set, shell out to a tiny Node helper (or inline `curl | jq`) to pull the compact Issue list via REST, and write a one-line-per-Issue table into `session-state.md`. Proposed format:

```
## Open Issues (compact, from REST API)
| #   | Created    | Labels                                | Title                            |
|-----|------------|---------------------------------------|----------------------------------|
| 62  | 2026-04-18 | type:task, phase:meta                 | Remote heartbeat sessions lack…  |
| 64  | 2026-04-18 | type:epic, status:in-progress         | EPIC: Drain open PR stack…       |
…
```

A sibling "## Open PRs (compact)" block closes Issue #90 as a bonus.

If no token is set, fall back to the current #62 note ("agent must use `mcp__github__list_issues` in Step 1") — never hard-fail.

## Acceptance
- [ ] `session-prefetch.sh` produces a `## Open Issues (compact …)` section in `session-state.md` on a remote session with `GITHUB_PERSONAL_ACCESS_TOKEN` set.
- [ ] Fallback path (no token) still exits 0 and still writes the #62 note.
- [ ] On the next remote heartbeat, `mcp__github__list_issues` is *not* the first call — the compact table is sufficient to drive Step 2 pick decisions in most cases.
- [ ] `## Open PRs (compact)` block added alongside (co-closes Issue #90).

## Related
- #62 — just shipped the dual-path note; this is the depth fix.
- #90 — session-prefetch.sh should add an `## Open PRs` block; covered by the sibling table above.
- #89 — session-prefetch.sh should prefer `npm ci` over `npm install` (orthogonal, same file).

## Pattern source
Captured by Run 34 self-improvement pass (D-20260419-001 tick).


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T01:24:54Z
**Updated:** 2026-04-20T07:25:55Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta, priority:low
