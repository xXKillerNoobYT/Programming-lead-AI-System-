---
id: 4292504708
number: 146
title: >-
  chore(dashboard): §D.3.a Coding-tab skeleton polish — landmark-nesting + NITs
  (follow-up to #145)
state: closed
created_at: '2026-04-20T00:58:43Z'
updated_at: '2026-04-20T01:41:40Z'
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
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/146
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/146'
closed_at: '2026-04-20T01:41:04Z'
---
# chore(dashboard): §D.3.a Coding-tab skeleton polish — landmark-nesting + NITs (follow-up to #145)

## Context

Follow-up leaf from Issue #145 (§D.3.a Coding tab skeleton). The code-quality
reviewer returned **✅ APPROVED WITH NITS** for PR (to be linked) — one
**IMPORTANT** finding was applied inline on that PR (changed
`CodingTabContent.tsx` outer `<main>` → `<section>` so it no longer nests
inside `MainPanes`'s `<section role="region">` landmark). This follow-up
captures the remaining 3 NITs + the parallel landmark fix in
`ProjectTabContent.tsx`.

## Acceptance Criteria

### 1. Migrate remaining `<main>` usage to `<section>` (+ add a single top-level `<main>`)

- [ ] `dashboard/app/projects/[projectId]/[tab]/ProjectTabContent.tsx:~117` —
  the `else` branch renders `<main>` for non-coding tabs. Change to `<section>`
  for the same landmark-nesting reason.
- [ ] Add exactly one `<main>` to the app-shell root layout
  (`dashboard/app/layout.tsx` or the project-page layout) so the page still
  has a landmark-qualified content region. WCAG 2.1 requires ≥1 `<main>` per
  page; ARIA forbids nesting them.
- [ ] Any `getByRole('main')` assertions in existing tests should continue
  to resolve to the single top-level landmark.

### 2. Drop redundant type assertions

- [ ] `dashboard/app/_components/coding/CodingTabContent.tsx:~72` —
  `(filters as Filters)`: the `isControlled` guard already narrows `filters`
  to `Filters` (not `undefined`) in TypeScript 5's narrowing flow. Drop the
  `as` cast.
- [ ] `dashboard/app/_components/coding/HandoffThread.tsx:~53` —
  `(expanded as boolean)`: same reason, the `isControlled` guard narrows it.

### 3. Simplify FilterBar label/aria redundancy

- [ ] `dashboard/app/_components/coding/FilterBar.tsx` — each native
  `<select>` currently has both a visible `<label htmlFor>` AND an
  `aria-label`. Pick one pattern (prefer the visible label since it doubles
  as sighted-user UX) and delete the duplicate `aria-label`.

### 4. Remove `void within;` unused-import suppressor

- [ ] `dashboard/__tests__/coding-tab.test.tsx:~209` — the test currently uses
  `void within;` to suppress the "unused import" lint error after the
  inline-snapshot block that no longer calls `within`. Either use `within` in
  a real assertion (preferred — test DOM scoping) or drop the import.

## Out of scope

- Any behavior change in the filter predicate or the thread list.
- No new component files.
- Tests expected: no new tests required; existing 132 must still pass.

## Verification

- `cd dashboard && npm test` — 132 green, no new failures.
- `cd dashboard && npm run build` — typecheck passes after dropping the `as`
  casts.
- `node dashboard/scripts/check-arch.js` — still 3/3 PASS.

## Links

- Parent leaf: Issue #145 (closed via D-20260419-042).
- Decision-log section for §D.3.a: D-20260419-042.
- Plan reference: `AI plans/phase-3-plan.md` §D.3.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T00:58:43Z
**Updated:** 2026-04-20T01:41:40Z
**Closed:** 2026-04-20T01:41:04Z
**Labels:** type:task, status:in-progress, phase:3

---

## Comments

### @xXKillerNoobYT - 2026-04-20T01:41:40Z

Auto-closed by PR #149 / D-20260419-043.

4 ACs landed + 1 real-bug inline fix (layout double-`min-h-screen` → semantic-only) + 1 stale-comment fix. 132/132 dashboard tests green, build green, arch 3/3, guardrail-coverage exit 0.

2 remaining NITs (search-input `aria-label` redundancy + `<main>` `aria-label` from `params.tab`) filed as follow-up Issue #148 — 4th close-the-review-loop application (precedents D-036/D-038/D-041/D-042).

Run report: `reports/run-226-summary.md`.

