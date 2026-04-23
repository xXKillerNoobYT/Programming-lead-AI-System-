---
id: 4287156169
number: 45
title: >-
  Loop commands need SOUL + memory files (extends D-005 pattern to /heartbeat +
  /weekly-agent-update)
state: closed
created_at: '2026-04-18T07:14:41Z'
updated_at: '2026-04-18T07:22:36Z'
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
  - id: 10723653340
    name: 'status:in-progress'
    color: FBCA04
    description: Actively in work
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10724571764
    name: 'area:heartbeat-pipeline'
    color: 1D76DB
    description: 'Intelligent heartbeat pipeline (TDD, auto-merge, scheduling, skill-chain)'
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/45
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/45'
closed_at: '2026-04-18T07:22:36Z'
---
# Loop commands need SOUL + memory files (extends D-005 pattern to /heartbeat + /weekly-agent-update)

## Goal

Per user directive 2026-04-18: *"the loops need a sole and memory files"* — extend the subagent SOUL+memory pattern from D-20260418-005 to the two command-invoked heartbeat loops.

## Files to create

1. \`.claude/commands/heartbeat/SOUL.md\` — identity, mission, numbered rules, output contract for /heartbeat
2. \`.claude/commands/heartbeat/memory.md\` — append-only observation log
3. \`.claude/commands/weekly-agent-update/SOUL.md\` — identity + 7-step protocol distilled as SOUL rules
4. \`.claude/commands/weekly-agent-update/memory.md\` — same log format

## Files to edit

1. \`.claude/commands/heartbeat.md\` — add "Read these BEFORE you execute" block pointing at SOUL + memory
2. \`.claude/commands/weekly-agent-update.md\` — same
3. \`CLAUDE.md\` §6 — add "Only one heartbeat at a time" bullet (encodes concurrent-heartbeat-ban from user's Option D answer to Issue #42) — also referenced in /heartbeat SOUL as load-bearing identity

## Why bundle concurrent-ban here?

User's "Option D: disallow concurrent heartbeats" is naturally part of the /heartbeat loop's SOUL identity: *"I am singular. No peer."* Putting the ban ONLY in CLAUDE.md §6 would leave the SOUL half-done; putting it ONLY in SOUL would leave project-level policy un-documented. Both surfaces are updated.

Also closes Issue #42 (parallel-session D-ID collision protocol) since disallowing parallel heartbeats eliminates the collision class entirely.

## Acceptance

- 4 files created, 3 files edited.
- Both command \`.md\` files point at their SOUL + memory.
- CLAUDE.md §6 has the concurrent-ban bullet.
- Tests still green (root \`node --test\` 24/24; dashboard \`npm test\` 17/17).
- Decision ID recorded.
- Issue #42 closed by reference.

## Not included (explicit out-of-scope)

- heartbeat.js runtime SOUL — already covered by project-level \`SOUL.md\`.
- \`/heartbeat\` command skill-chain rewrite per new pipeline — that's Issue #39's scope.
- ScheduleWakeup wiring — Issue #38's scope.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T07:14:41Z
**Updated:** 2026-04-18T07:22:36Z
**Closed:** 2026-04-18T07:22:36Z
**Labels:** type:task, status:in-progress, autonomous-lead, area:heartbeat-pipeline

---

## Comments

### @xXKillerNoobYT - 2026-04-18T07:22:36Z

Closed by commit (D-20260418-013). Loop SOULs + memory files created at .claude/loops/heartbeat/ and .claude/loops/weekly-agent-update/. Command files reference them. /weekly-agent-update's scope extended to enumerate both subagents AND command-loops. See reports/run-35-summary.md.

