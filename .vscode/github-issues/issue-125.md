---
id: 4290534305
number: 125
title: 'Phase 3 §C.1.a: heartbeat guardrails module — safe wrappers for outbound calls'
state: closed
created_at: '2026-04-19T10:01:34Z'
updated_at: '2026-04-19T10:10:43Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/125
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/125'
closed_at: '2026-04-19T10:10:43Z'
---
# Phase 3 §C.1.a: heartbeat guardrails module — safe wrappers for outbound calls

Per `AI plans/phase-3-plan.md` §C.1 (first sub-leaf). The detector + auto-file part is split into a follow-up Issue to keep this atomic.

## Goal
Add a single `lib/guardrails.js` module that exposes safe wrappers for the three outbound-call categories the heartbeat must control: HTTP fetch, child-process spawn, and timer/interval. All backbone code (`heartbeat.js`, `lib/**`) routes outbound calls through these wrappers so violations can be detected, audited, and rate-limited in one place.

## Acceptance criteria
- [ ] `lib/guardrails.js` exports:
  - `safeFetch(url, options, { allowHosts })` — wraps `globalThis.fetch`, throws `GuardrailViolation` if `allowHosts` is provided and the URL host is not in the list
  - `safeSpawn(cmd, args, { allowCmds })` — wraps `child_process.spawnSync` with args-array shape (no shell-string interpolation), throws `GuardrailViolation` if `allowCmds` provided and `cmd` not listed
  - `GuardrailViolation` (custom Error subclass with `.kind` ∈ {'fetch', 'spawn'} and `.detail`)
  - `recordGuardrailViolation(violation, { auditDir })` — appends a JSON line to `auditDir/guardrail-violations.jsonl`, never throws
- [ ] No allowlist provided → wrappers pass through (transparent, never throw) — this is the default for now; allowlist enforcement comes online when callers opt in
- [ ] New tests in `tests/guardrails.test.js` (root, `node:test` + `node:assert/strict`) cover:
  - safeFetch passthrough when no allowlist
  - safeFetch throws GuardrailViolation when host not in allowlist
  - safeSpawn passthrough when no allowlist
  - safeSpawn throws GuardrailViolation when cmd not in allowlist
  - safeSpawn refuses string-form args (shell-injection guard)
  - GuardrailViolation has correct `.kind` and `.detail`
  - recordGuardrailViolation appends valid JSONL + survives missing dir
- [ ] Root `npm test` green
- [ ] `cd dashboard && npm run check:arch` still green (`lib/guardrails.js` is backbone — no UI imports)
- [ ] Heartbeat.js NOT yet wired through the wrappers — that's a follow-up sub-leaf so this stays atomic and reviewable

## Out of scope (separate sub-leaves)
- §C.1.b: Auto-detect direct `fetch`/`https`/`spawn` references in backbone source (static scan) + auto-file `type:bug` Issue on detection
- §C.1.c: Migrate `heartbeat.js` and `lib/mcp-client.js` to use the wrappers
- §C.2: Audit trail (separate)
- §C.3: Human-override lockfile (separate)

## Why split this way
"All outbound calls funnel through a single MCP gateway" is the §C.1 long-arc goal; before we can FUNNEL anything, the gateway has to EXIST. This Issue is the gateway. Once it lands, §C.1.b (detector) and §C.1.c (migrate callers) are independent and parallelizable.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T10:01:34Z
**Updated:** 2026-04-19T10:10:43Z
**Closed:** 2026-04-19T10:10:43Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
