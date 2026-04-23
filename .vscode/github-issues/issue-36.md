---
id: 4287089397
number: 36
title: 'Run 32 §B: SOUL.md runtime directive — TDD + delegated-task contract'
state: open
created_at: '2026-04-18T06:46:48Z'
updated_at: '2026-04-20T07:25:38Z'
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
  - id: 10724571764
    name: 'area:heartbeat-pipeline'
    color: 1D76DB
    description: 'Intelligent heartbeat pipeline (TDD, auto-merge, scheduling, skill-chain)'
  - id: 10739055869
    name: 'priority:low'
    color: C5DEF5
    description: Nice-to-have; work on when higher bands empty
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/36
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/36'
---
# Run 32 §B: SOUL.md runtime directive — TDD + delegated-task contract

## Goal

Mirror the CLAUDE.md TDD directive onto the product runtime (`heartbeat.js`) so the autonomous-programming-lead contract applies equally whether work is done by Claude Code (`/loop`) or by the runtime delegating to coding agents via MCP.

## Changes

### SOUL.md
1. Add directive: *"Every task the runtime delegates to a coding agent must require TDD. A task is \`incomplete\` unless the returned artifact includes a red-test log, a green-test log, and the resulting diff."*
2. Bring SOUL.md into sync with reality where needed — but scope-limit this sub-issue to the TDD directive only. Other SOUL.md drift (Roo Code references, Docker references, Ollama/Grok references superseded by D-20260417-005/006) is a separate Issue.
3. Note the mirror: CLAUDE.md §3 Step 4c ↔ SOUL.md runtime directive.

### heartbeat.js task-spec schema (future work within this sub-issue or split)
- Task object gains required fields: `test_red_output`, `test_green_output`, `diff`, `coverage_delta`.
- Completion check rejects tasks missing any of these fields.

## Why this is a dedicated sub-issue
- **SOUL.md is guardrail-locked** (CLAUDE.md §5) — requires a tracked Issue before any edit.
- **Task-schema change touches `heartbeat.js`** — code change, TDD required, lives in its own tick.

## Acceptance

- SOUL.md mentions TDD-required-for-delegated-tasks directive.
- heartbeat.js task-spec schema updated with the four required fields + unit tests (red→green evidence in the tick it lands).
- Decision ID citation on the commit.

## Parent

Parent EPIC: #34

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:46:48Z
**Updated:** 2026-04-20T07:25:38Z
**Labels:** type:task, status:backlog, autonomous-lead, area:heartbeat-pipeline, priority:low
