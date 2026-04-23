---
id: 4286643694
number: 13
title: >-
  Dashboard app/page.tsx contains stale Run-2 content + Docker/Ollama refs
  violating no-Docker preference
state: closed
created_at: '2026-04-18T04:09:48Z'
updated_at: '2026-04-18T06:13:23Z'
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
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/13
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/13'
closed_at: '2026-04-18T06:13:23Z'
---
# Dashboard app/page.tsx contains stale Run-2 content + Docker/Ollama refs violating no-Docker preference

**Captured per Polsia Rule 2 during heartbeat D-20260417-008 audit (superpowers code-review feedback).**

## Observation
`dashboard/app/page.tsx` still renders hardcoded references to an earlier Run-2 MVP state that don't match current reality:

| Line | Stale content |
|---|---|
| 114 | `<div className="text-sm text-gray-400">Run 2: Phase 1 MVP</div>` — header subtitle |
| 123 | `Chat interface with Roo Code delegation (MCP connected)` — Coding Relay tab placeholder |
| 125 | `Model: Qwen3.5-32B via Ollama` — hardcoded model, no longer accurate since user switched to Claude Code as lead |
| 257 | `Infrastructure for Run 2 Phase 1 MVP • Docker + Ollama + MCP • See plans/main-plan.md and GitHub #2` — footer, contradicts CLAUDE.md §6 no-Docker preference |

Issue #11 captured the **test failures** caused by this UI drift (the mocked DOM in preferences.test.tsx still expects old text). This issue captures the **UI content itself**.

## Acceptance criteria
- [ ] Header subtitle: replace with something that reflects current state (e.g., current run number or leave dynamic / remove)
- [ ] Coding Relay tab placeholder: remove 'Roo Code' (replaced by Claude Code per D-20260417-006)
- [ ] Remove hardcoded model text 'Qwen3.5-32B via Ollama' — model should come from `preferences.modelMappings` or be generic placeholder
- [ ] Footer: remove 'Docker + Ollama' wording; replace with local-Node-only language consistent with no-Docker preference
- [ ] After edits: re-run `npm run build` + `npm test` to confirm no regression, update Issue #11's test expectations in tandem

## Related
- #11 (test mocking failures — same file, test side of this)
- #4 (run-numbering — 'Run 2' ref in page.tsx is one more dangling stale reference to reconcile)

## Source
Found by code-reviewer agent during heartbeat D-20260417-008 audit, after Issue #9 closed.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:09:48Z
**Updated:** 2026-04-18T06:13:23Z
**Closed:** 2026-04-18T06:13:23Z
**Labels:** type:task, status:backlog, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T06:13:23Z

Closing per D-20260418-003 (Run 26 heartbeat, first tick of the /loop /heartbeat).

## AC walkthrough
- [x] Header subtitle — `Run 2: Phase 1 MVP` → `Autonomous Programming Lead` (matches SOUL.md core identity)
- [x] Coding Relay placeholder — `Chat interface with Roo Code delegation (MCP connected)` → `Chat relay from the delegating coding agent (MCP streaming)` (Roo Code abandoned D-20260417-006)
- [x] Hardcoded model text — `Qwen3.5-32B via Ollama` → `configured via Preferences` (defers to `preferences.modelMappings`)
- [x] Footer — `Docker + Ollama` wording gone → `Local-Node infrastructure • MCP + Next.js 15` (no-Docker per D-20260417-005)
- [x] Rebuild + tests clean
- [x] Issue #11 test pairing — not affected; Run 12 already rewrote preferences.test.tsx with no assertions on these strings

## TDD regression guards added
5 new tests in `dashboard/__tests__/preferences.test.tsx` under `describe('Dashboard content freshness (Issue #13)', …)`. Each asserts absence of a specific stale string — will re-fail red if any regresses:
- `Run 2: Phase 1 MVP`
- `Roo Code`
- `Qwen3.5-32B via Ollama`
- `Docker`
- `Ollama`

## Verified (command output, not claims)
```
$ npm test (dashboard/)
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total

$ npm test (repo root)
ℹ tests 24 / ℹ pass 24 / ℹ fail 0

$ npm run build (dashboard/)
✓ Generating static pages (4/4)
```

Report: `reports/run-26-summary.md`.

