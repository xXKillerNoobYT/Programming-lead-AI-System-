---
id: 4292079042
number: 131
title: 'Phase 3 §C.2: audit trail — JSON payload per heartbeat tick'
state: closed
created_at: '2026-04-19T21:31:55Z'
updated_at: '2026-04-19T21:44:18Z'
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
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/131
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/131'
closed_at: '2026-04-19T21:44:18Z'
---
# Phase 3 §C.2: audit trail — JSON payload per heartbeat tick

Per `AI plans/phase-3-plan.md` §C.2: *"every heartbeat writes its full payload (state read, decomposition output, delegation request, agent report, decision IDs, files touched) to reports/audit/<timestamp>.json."*

## Goal
Every heartbeat tick writes a structured JSON audit record next to the existing markdown tick report. Machine-readable audit trail that external tools (cohesion runner, future CI, dashboard Log tab) can query without parsing markdown.

## Current state (heartbeat.js v1)
- `tick()` builds a `state` object with: timestamp, git, issues, latestRun, recentDecisions, mcpStatus, mcpObservations, cohesionGate
- Writes a markdown report via `formatTickReport(state)` + `writeTickReport(timestamp, report)` → `reports/heartbeat-tick-<timestamp>.md`
- Returns `{state, path}` to caller

## Acceptance criteria
- [ ] New module `lib/audit-trail.js` exports `writeAuditRecord({projectRoot, timestamp, state, filesTouched})` returning `{path, skipped?, skipReason?}`
- [ ] JSON schema (v1) — record includes:
  - `schemaVersion`: 1
  - `timestamp`: ISO string
  - `state`: the heartbeat state object (passthrough, no redaction in v1)
  - `filesTouched`: array of absolute paths the tick wrote (tick report markdown + cohesion JSON if any + audit JSON itself goes in after — or nullable for self-reference)
  - `writer`: { name: 'heartbeat.js', version: 'v1' } for forward-compat when a future runtime writes audits
- [ ] `heartbeat.js` `tick()` calls `writeAuditRecord(...)` AFTER the markdown report is written. Threads the audit path into the console one-liner (`... — wrote .md+audit .json`).
- [ ] Writes to `reports/audit/<timestamp>.json` (same timestamp stem as the markdown sibling so they're easy to correlate)
- [ ] Never-throws contract: if the write fails (disk full, permission denied, project root missing), log a warning to stderr + return `{path: null, skipped: true, skipReason: '...'}`. The tick must still complete.
- [ ] Tests in `tests/audit-trail.test.js` (root, `node:test` + `node:assert/strict`):
  - writeAuditRecord writes valid JSON at `reports/audit/<timestamp>.json`
  - record contains schemaVersion, timestamp, state (deep-equals input), filesTouched, writer
  - nested state passthrough preserves cohesionGate fields
  - missing reports/audit dir gets created
  - write failure (tmp path where parent is a file) → returns `{skipped: true}` — does NOT throw
  - timestamp colons replaced with dashes in filename (cross-platform safety, matches existing writeTickReport convention)
- [ ] Tests in `tests/heartbeat.test.js` (extend existing) verify `tick()` produces BOTH a .md tick report AND a .json audit record per invocation
- [ ] Root `npm test` green
- [ ] `cd dashboard && npm run check:arch` still 3/3 green
- [ ] `cd dashboard && npm run check:guardrail-coverage` still exits 0
- [ ] `node heartbeat.js` produces BOTH files per tick (verify by directory listing)

## Scope (TOUCH ONLY)
- `lib/audit-trail.js` (NEW)
- `heartbeat.js` (thread call into tick + updated console line)
- `tests/audit-trail.test.js` (NEW)
- `tests/heartbeat.test.js` (extend)

## Out of scope (future sub-leaves)
- Retention / rotation policy (§C.2.x or §F — audit grows unbounded in v1; acceptable for Phase 3)
- Redaction (MCP observations may contain sensitive data; redaction is a Phase 4 decision)
- Dashboard Log tab integration (§D.5 territory)
- Schema migration (v2 will come when decomposition/delegation fields are added to state)

## Why a separate module
`lib/audit-trail.js` is the second `reports/*` writer (first is the inline `writeTickReport` in heartbeat.js). Extracting keeps heartbeat.js smaller and makes the writer reusable by future runtimes (heartbeat v2 + any future agent that wants audit trails).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T21:31:55Z
**Updated:** 2026-04-19T21:44:18Z
**Closed:** 2026-04-19T21:44:18Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
