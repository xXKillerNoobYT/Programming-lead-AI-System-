---
id: 4289458026
number: 93
title: Filesystem watcher for Dev-Q&A.md → wake-up-on-change (non-LLM idle wait)
state: open
created_at: '2026-04-18T23:21:34Z'
updated_at: '2026-04-20T07:25:52Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/93
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/93'
---
# Filesystem watcher for Dev-Q&A.md → wake-up-on-change (non-LLM idle wait)

## Goal

Per user directive 2026-04-18: *"or actively wait without LLM calls for the file to change I don't know something smart like that."*

When the heartbeat is blocked on an unanswered Dev-Q&A question, the 60s or 270s cadence still burns LLM calls on pure no-ops. A filesystem-watch-based wake-up would eliminate that cost — the loop sleeps without LLM, and wakes only when `Docs/Plans/Dev-Q&A.md` (or `decision-log.md`, or any other indicator) changes.

## Approach options

- **A. Node.js `fs.watch` daemon** — part of `heartbeat.js` runtime; watches files and re-fires the tick. Not applicable to Claude Code `/heartbeat` since that's LLM-driven. Fits the product runtime only.
- **B. Claude Code harness-level event** — extend `ScheduleWakeup` (or add a sibling tool) that accepts `watchPath` args. Not currently supported; would need harness change.
- **C. Polling with long-cadence (implemented via D-153)** — at 3600s, per-hour quota cost is ~24 calls/day. Works today without harness changes.
- **D. Session-level PostToolUse/SessionEnd hook that blocks on inotify** — could work for Linux, not Windows. Cross-platform awkward.

## Acceptance
- Either harness-level filesystem wake-up is available (B), OR documentation explicitly accepts C (long-cadence) as the current answer.
- Issue closes when either path is implemented.

## Interim
D-20260418-153 codifies tier-3 cadence (3600s after 6+ consecutive no-ops) as the polling-based approximation.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T23:21:34Z
**Updated:** 2026-04-20T07:25:52Z
**Labels:** type:task, status:backlog, autonomous-lead, area:heartbeat-pipeline, priority:low
