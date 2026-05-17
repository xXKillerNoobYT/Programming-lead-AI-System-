---
id: 4286839444
number: 27
title: >-
  Phase 4 §C.2: Add .env.example and dotenv loader (Node 20 built-in) —
  foundation for config portability
state: closed
created_at: '2026-04-18T05:19:42Z'
updated_at: '2026-04-18T09:36:18Z'
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
  - id: 10723653672
    name: 'phase:4'
    color: C5DEF5
    description: Phase 4 — production scale
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/27
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/27'
closed_at: '2026-04-18T09:36:18Z'
---
# Phase 4 §C.2: Add .env.example and dotenv loader (Node 20 built-in) — foundation for config portability

Per `plans/phase-4-plan.md` §C.2 (D-20260417-022). Consumes Issue #17 (mempalace path portability).

## Goal
Nothing in the repo references a per-machine path directly. All per-machine config lives in env vars loaded from `.env`. `.env.example` documents every variable with inline comments. Uses Node 20's built-in `process.loadEnvFile()` — no new runtime deps.

## Acceptance criteria
- [ ] `.env.example` exists at repo root with every required env var listed, grouped by area (MCP, Grok, MemPalace, Logs, Budget), each with a short comment + sensible default where applicable.
- [ ] `.env` is already git-ignored (verify) and `.env.example` is committed.
- [ ] `heartbeat.js` calls `process.loadEnvFile()` (Node 20+ built-in) at startup when `.env` exists; no-op fallback when it doesn't.
- [ ] `dashboard/app/…` reads its own env via `process.env` after Next's built-in `.env.local` loading (no change needed — just document).
- [ ] `.mcp.json.template` introduced alongside `.mcp.json`: same shape but with `${MEMPALACE_PATH}`-style placeholders. `scripts/setup.js` (future, §C.1) will template it — for this Issue, just ship the template.
- [ ] `README.md` gains a "First-time setup" subsection pointing at `.env.example` and the template.
- [ ] `npm test` green at the root (heartbeat tests continue to pass with dotenv loading enabled).

## Dependencies
- Issue #17 (hardcoded mempalace path) — this Issue fully subsumes #17's acceptance; close #17 when this lands.

## Notes
- Do NOT install `dotenv` npm package; Node 20+'s `process.loadEnvFile()` is the zero-dep default (matches D-20260417-015's "no new framework deps at root" preference).
- `.mcp.json` itself stays checked-in for dev convenience (but with parameterized paths via the template pattern).
- Secrets MUST NOT be committed to `.env.example` — only variable names + dummy values.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T05:19:42Z
**Updated:** 2026-04-18T09:36:18Z
**Closed:** 2026-04-18T09:36:18Z
**Labels:** type:task, status:in-progress, phase:4, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T09:36:17Z

Closed per D-20260418-021 (Run 43). All 6 AC items met + sidefix to npm test (24 → 41 tests running). See `reports/run-43-summary.md`.

