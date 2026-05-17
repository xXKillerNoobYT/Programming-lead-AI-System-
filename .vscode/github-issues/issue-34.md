---
id: 4287088237
number: 34
title: 'EPIC: Run 32 — Intelligent heartbeat pipeline (TDD + auto-merge + self-pacing)'
state: open
created_at: '2026-04-18T06:46:18Z'
updated_at: '2026-04-20T07:25:24Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653173
    name: 'type:epic'
    color: '5319E7'
    description: Multi-issue epic
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10724571764
    name: 'area:heartbeat-pipeline'
    color: 1D76DB
    description: 'Intelligent heartbeat pipeline (TDD, auto-merge, scheduling, skill-chain)'
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/34
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/34'
---
# EPIC: Run 32 — Intelligent heartbeat pipeline (TDD + auto-merge + self-pacing)

## Goal

Stand up the full intelligent heartbeat pipeline on both surfaces (Claude Code `/loop` and `heartbeat.js` runtime) so the system works one Issue at a time — branching, TDD-building, verifying, committing, PR-opening, reviewing, auto-merging (gated), recording, and self-pacing the next tick — continuously and with planning ahead.

Per user directive 2026-04-18:
> *"a whole bunch of smart heartbeat steps taking advantage of your smart systems and so on for continuous intelligent development working on one issue at a time from Github with Branching and merging all being done intelligently. On a loop that happens once an hour or 15 minutes after the last one stopped — something smart that keeps working and also keeps planning ahead."*

## Policy decisions locked (D-20260418-006)

| Decision | Answer | Source |
|---|---|---|
| TDD scope | **Pragmatic default** — backbone code requires TDD (`heartbeat.js`, `dashboard/`, `lib/`, MCP servers, prod-ship `scripts/`). Exempt: one-offs, fixtures, docs, config. Revisit via sub-issue F at tick 30. | User: "todo smart default old-to-new" |
| Auto-merge | **Gated (Option B)** — auto-merge only if all 5 gates pass (tests green, no silent-failure findings, no blocker review findings, no conflicts, Issue labeled `auto-merge:ok`). | User: "auto merge policy B" |
| Branch isolation | **Branches, not worktrees (Option A)** — `git checkout -b issue-N/<slug>` per Issue. | User: "lets go with A" |
| Enforcement mechanism | **Hybrid (Option 3)** — text rules in CLAUDE.md + SOUL.md; schema rejection on runtime side; lightweight reminder on agent side. No hard blocking hook. | User: "hybrid seams smart" |

## Pipeline stations (per tick)

1. **Orient** — git/gh/Dev-Q&A/reports/decision-log/memory
2. **Pick** — `issue-triage-picker` subagent
3. **Plan** — `superpowers:brainstorming` + `superpowers:writing-plans` (if multi-step)
4. **Branch** — `git checkout -b issue-N/<slug>` off main
5. **Build** — `superpowers:test-driven-development`; `superpowers:systematic-debugging` on stuck
6. **Capture** — open new Issue for any gap found mid-flight (Polsia Rule 2)
7. **Verify** — `superpowers:verification-before-completion`
8. **Commit** — `commit-commands:commit`
9. **PR** — `commit-commands:commit-push-pr`
10. **Review** — `pr-review-toolkit:review-pr` panel
11. **Merge** — gated auto-merge (see policy above)
12. **Record** — run report + decision-log + MemPalace
13. **Plan ahead** — refill backlog to ≥3; refine plans/ if fuzzy
14. **Next** — `ScheduleWakeup(delay = clamp(ideal, 900, 3600))`

## Acceptance

All six sub-issues closed.

## Sub-issues

- [ ] **A** — CLAUDE.md §3/§5/§6/§9 edits (agent-side pipeline spec)
- [ ] **B** — SOUL.md runtime directive (TDD + delegated-task contract)
- [ ] **C** — Auto-merge gate implementation (check script + CI integration)
- [ ] **D** — Self-scheduling via ScheduleWakeup (clamp 15min-60min)
- [ ] **E** — Pipeline skill-chain wiring in `/heartbeat` command
- [ ] **F** — Revisit TDD scope at tick 30 (TODO)

Decision ID: **D-20260418-006**

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:46:18Z
**Updated:** 2026-04-20T07:25:24Z
**Labels:** type:epic, status:backlog, autonomous-lead, area:heartbeat-pipeline, priority:medium
