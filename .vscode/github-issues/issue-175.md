---
id: 4298160845
number: 175
title: >-
  feat(lib): Phase 4 — Router v1 deterministic rule engine + evaluations (Part 8
  §3)
state: open
created_at: '2026-04-20T19:29:28Z'
updated_at: '2026-04-20T19:29:28Z'
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
  - id: 10723653672
    name: 'phase:4'
    color: C5DEF5
    description: Phase 4 — production scale
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/175
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/175'
---
# feat(lib): Phase 4 — Router v1 deterministic rule engine + evaluations (Part 8 §3)

## Context

Phase 4 core deliverable per `Docs/Plans/Part 8 Intelligent Capability Triggering.md` §3. **The router is the heart of intelligent capability triggering** — every Lead API call goes through it and gets a decision vector telling it which model, thinking level, cache strategy, delivery mode, output format, and delegation target to use.

This Issue ships the **v1 deterministic rule-based router**. ML-based routing is explicitly Phase 5+.

## Acceptance Criteria

### 1. Router module

- [ ] Create `lib/router.js` exporting `routeLeadCall(input: RouterInput): RouterDecision`.
- [ ] `RouterInput` and `RouterDecision` types per Part 8 §3.1 + §3.2.
- [ ] Pure synchronous function — no I/O inside. Composable + testable.

### 2. Rule engine

- [ ] Implement 9 v1 rules per Part 8 §3.3, priority-ordered, first-match-wins.
- [ ] Each rule is a named function `isRuleN(input)` + `applyRuleN(input): Partial<RouterDecision>`.
- [ ] `routeLeadCall` iterates rules in priority order, applying merges, returns first full decision.
- [ ] Rule #9 (default fallthrough) guarantees every input gets a decision vector.

### 3. Observability

- [ ] Every routing decision appended to `reports/router-trace.jsonl` (timestamp + input + output).
- [ ] Summary log entry in the tick's audit-trail JSON (`reports/audit/<timestamp>.json`).
- [ ] Dashboard "Router Reasoning" inspector is a separate UI Issue (filed later when §D.4 or §D.5 decomposition catches up).

### 4. Evaluations

- [ ] `dashboard/evals/router/` (or `tests/router-evals/`) directory with ≥ 3 fixture cases per rule (27 minimum for 9 rules).
- [ ] `npm run eval:router` runs them; fails if ANY fixture's actual output deviates from expected.
- [ ] Add `eval:router` to CI gate (blocking merge on eval regression).

### 5. Tests

- [ ] `tests/router.test.js` unit-tests each rule in isolation + composition tests for priority ordering.
- [ ] 20+ new tests.
- [ ] Fixtures use realistic inputs (e.g., "trivial typo fix with claude credit at 92%" → expect `third-party:copilot`).

### 6. Gates

- [ ] `npm test` green (root + dashboard).
- [ ] `npm run eval:router` green.
- [ ] Router NOT YET wired into `heartbeat.js` — this Issue ships the LIBRARY. Wiring is a separate follow-up that can land once callers migrate.

## Out of scope

- Wiring into `heartbeat.js` (follow-up Issue).
- Dashboard UI for router-reasoning inspector (separate §D UI Issue).
- ML classifier / weighted rules (Phase 5+).
- Cross-provider unified billing (Part 7 §I separate).

## Links

- Part 8 §3 (router spec).
- Part 7 §I (credit state is an input to rule #1).
- Precedent: `lib/retry-backoff.js`, `lib/tick-timeout.js`, `lib/guardrails.js` — all testable pure-function primitives in the same style.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T19:29:28Z
**Updated:** 2026-04-20T19:29:28Z
**Labels:** type:task, status:backlog, phase:4, priority:medium
