---
id: 4298163477
number: 176
title: >-
  feat(evals): Phase 4 — Evaluations framework scaffold + first triage fixture
  suite (Part 8 §2.9)
state: open
created_at: '2026-04-20T19:29:56Z'
updated_at: '2026-04-20T19:29:56Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/176
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/176'
---
# feat(evals): Phase 4 — Evaluations framework scaffold + first triage fixture suite (Part 8 §2.9)

## Context

Phase 4 scaffold per `Docs/Plans/Part 8 Intelligent Capability Triggering.md` §2.9. Evaluations are the **continuous-integration for agent behavior** — they catch regressions in the Lead's decision logic that manual spot-checks miss.

Phase 3 noted the gap twice this session: the strict-mode exhaustiveness incident (Run 232) and the multi-line token context incident (Run 235) were both "implementer claim accepted without automated verification." An evals suite prevents both classes.

## Acceptance Criteria

### 1. Evaluations framework scaffold

- [ ] Create `dashboard/evals/` directory (or `evals/` at repo root if it covers both backbone + dashboard).
- [ ] Structure:
  ```
  evals/
    runner.js                # Pure-Node test runner, not Jest (evals are slow + different lifecycle)
    fixtures/
      router/                # Router-v1 fixtures (populated by #175)
      triage/                # Triage-pass fixtures (future)
      decomposition/         # Decomposition fixtures (future)
    scorers/
      exact-match.js         # Did actual === expected?
      key-subset.js          # Did actual include all required keys of expected?
      semantic.js            # LLM-judge scorer (Claude Haiku to grade subjective outputs)
  ```
- [ ] `npm run eval:all` runs every suite. `npm run eval:<name>` runs one.

### 2. First evaluation suite — triage decisions

- [ ] `evals/fixtures/triage/`: 10+ realistic Issue bodies + expected `priority:*` / `estimate:*` / `agent:*` labels.
- [ ] Scorer: `key-subset` (tolerant — as long as label set is SUPERSET of expected, pass).
- [ ] Run via `npm run eval:triage`.
- [ ] Document baseline score in `reports/evals-baseline.json`.

### 3. CI gate

- [ ] GitHub Action on PR: `npm run eval:all`, fail the check run if any score drops below the committed baseline in `evals-baseline.json`.
- [ ] Out-of-scope: auto-update baseline on accepted regressions — humans update baseline manually.

### 4. Tests

- [ ] `tests/evals-runner.test.js`: verify runner loads fixtures, runs scorers, aggregates scores.
- [ ] 6+ new tests.

### 5. Gates

- [ ] `npm test` green.
- [ ] `npm run eval:all` completes in < 2 minutes (synthetic fixtures; no real LLM calls in v1).

## Out of scope

- Semantic LLM-judge scorer (Phase 4.1 polish — deferred; exact-match + key-subset is enough for v1).
- Evaluating the Lead's production prompts against real Claude API (expensive; Phase 5 eval-in-production).
- Fuzz testing the router over thousands of synthetic inputs (Phase 5 stretch).

## Links

- Part 8 §2.9, §3.4 (observability), §5 (success criteria).
- Related Issue #175 (router — first consumer of the eval framework).
- Anthropic guidance: "Evaluations: test and improve Claude's performance with structured evaluations" (https://www.anthropic.com/learn/build-with-claude).


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T19:29:56Z
**Updated:** 2026-04-20T19:29:56Z
**Labels:** type:task, status:backlog, phase:4, priority:medium
