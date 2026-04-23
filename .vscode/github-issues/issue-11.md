---
id: 4286621549
number: 11
title: 'Fix preferences.test.tsx: 9 failing tests due to React mocking strategy'
state: closed
created_at: '2026-04-18T04:01:43Z'
updated_at: '2026-04-18T04:16:54Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653140
    name: 'type:bug'
    color: D73A4A
    description: Bug to fix
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/11
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/11'
closed_at: '2026-04-18T04:16:54Z'
---
# Fix preferences.test.tsx: 9 failing tests due to React mocking strategy

**Captured per Polsia Rule 2 during heartbeat D-20260417-008 (Issue #9 restoration).**

## Context
Issue #9 restored the dashboard test infrastructure (scripts, setup files, build cache). `npm test` now runs, yielding **2 passed / 9 failed / 11 total**. The 9 failures are all in `dashboard/__tests__/preferences.test.tsx` and are test-implementation problems, not infrastructure or production-code problems.

## Root cause
Lines 13-17 of the test do:
```ts
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
}));
```
This globally replaces React's hooks at module level. The rendered DOM in failing tests shows a **stale Run-2 skeleton** (`'Run 2: Phase 1 MVP'`) rather than the current guidance UI — meaning the mocked `useState` is returning initial values that no longer match what `app/page.tsx` actually renders.

## Representative failures
- `expect(screen.getByText('Preferences saved successfully!')).toBeInTheDocument()` — text not found
- `expect(screen.getByText('User Guidance')).toHaveClass('bg-blue-600')` — received class `bg-gray-800`
- Several tests fail because tab-switching state updates never propagate (hooks are mocked)

## Acceptance criteria
- [ ] Remove the module-level `jest.mock('react', ...)` — use real React + RTL `rerender` / `user-event` instead
- [ ] All 11 tests pass, or reduced/rewritten tests pass with the same/better coverage of the preferences UI
- [ ] `npm test` exit code 0
- [ ] Update `dashboard/__tests__/preferences.test.tsx` to match current `app/page.tsx` structure
- [ ] Run `npm run test:coverage` and record real coverage % in the heartbeat's run report

## Source
Found during heartbeat D-20260417-008 (Run 10 green-baseline restoration).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:01:43Z
**Updated:** 2026-04-18T04:16:54Z
**Closed:** 2026-04-18T04:16:54Z
**Labels:** type:bug, status:backlog, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T04:16:54Z

Closed per D-20260417-010 (Run 12 heartbeat). Commit on branch `run-9/red-baseline`.

AC status:
- [x] Remove module-level `jest.mock('react', ...)` — use real React + RTL `fireEvent`/`waitFor`/`act` instead
- [x] All 12 tests pass
- [x] `npm test` exit code 0
- [x] `dashboard/__tests__/preferences.test.tsx` rewritten to match current `app/page.tsx` structure
- [x] `npm run test:coverage` = 95.45% stmts / 91.66% branch / 92% funcs / 94.59% lines (exceeds >94% target)

Adjacent hardening bundled: `app/page.tsx` useEffect now try/catches `JSON.parse(saved)` so corrupted localStorage falls back to defaults with `console.error` instead of throwing. This made the 'invalid JSON' test assertion meaningful.

Details in `reports/run-12-summary.md`.

