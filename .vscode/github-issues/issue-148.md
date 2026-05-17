---
id: 4292607852
number: 148
title: >-
  chore(dashboard): §D.3.a polish round 2 — FilterBar search aria + main
  aria-label (follow-up to #146)
state: closed
created_at: '2026-04-20T01:38:20Z'
updated_at: '2026-04-20T02:16:08Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/148
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/148'
closed_at: '2026-04-20T02:15:47Z'
---
# chore(dashboard): §D.3.a polish round 2 — FilterBar search aria + main aria-label (follow-up to #146)

## Context

Follow-up leaf from Issue #146 (§D.3.a Coding tab skeleton polish — landmark-nesting + NITs). The code-quality reviewer flagged 2 NITs that were scoped beyond #146's ACs — filing here as the next close-the-review-loop ticket.

## Acceptance Criteria

### 1. Remove redundant `aria-label` from the FilterBar search input

- [ ] `dashboard/app/_components/coding/FilterBar.tsx:~103` — the search `<input>` has BOTH an `aria-label="Search"` AND a wrapping `<label>` with a sibling `<span class="sr-only">Search</span>`. The `aria-label` wins in the accessibility tree (ARIA overrides label text) but the `sr-only` span is then dead weight. Choice made for the 3 `<select>`s in #146 was "keep the visible (even if `sr-only`) label, drop the `aria-label`" — apply the same rule here for consistency:
  - Remove `aria-label="Search"` from the `<input>`.
  - Keep the `<span className="sr-only">Search</span>` inside the wrapping `<label>`.
- [ ] Verify via test: `getByLabelText(/search/i)` still resolves (it currently does via the `sr-only` span).

### 2. Add accessible name to the project-tab `<main>` landmark

- [ ] `dashboard/app/projects/[projectId]/[tab]/layout.tsx:~22` — the new top-level `<main>` currently has no `aria-label`. Adding one makes the landmark announce more usefully on AT ("main, Coding AI Relay" vs generic "main"). Next.js 15 layouts can receive `params`, so read `params.tab` and set:
  - `<main aria-label={`${tabTitle(params.tab)} — DevLead MCP dashboard`}>` (or similar).
  - A tiny map from tab slug → display name: `{coding: 'Coding AI Relay', guidance: 'User Guidance', log: 'Execution Log'}`. Fallback to the raw slug.
- [ ] Low priority (one-`<main>`-per-page doesn't strictly require a name per WAI-ARIA APG) but improves multi-landmark navigation.

## Out of scope

- Any layout-height or flex-cascade changes (already fixed inline on #146 PR).
- Any change to how `ProjectTabContent.tsx`'s `else` branch renders.
- New tests beyond updating any a11y assertion that would fail.

## Verification

- `cd dashboard && npm test` — 132 green.
- `cd dashboard && npm run build` — typecheck passes (params destructuring must be correct).
- `node dashboard/scripts/check-arch.js` — still 3/3 PASS.

## Links

- Parent leaf: Issue #146 (closed via D-20260419-043).
- Grandparent: Issue #145 (§D.3.a skeleton, closed via D-20260419-042).
- Code-quality review that flagged these: see PR for #146.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T01:38:20Z
**Updated:** 2026-04-20T02:16:08Z
**Closed:** 2026-04-20T02:15:47Z
**Labels:** type:task, status:in-progress, phase:3

---

## Comments

### @xXKillerNoobYT - 2026-04-20T02:16:08Z

Auto-closed by PR #151 / D-20260419-044. §D.3.a story fully closed across 3 leaves. 139/139 tests green. Next backbone leaf: #150 (§D.3.b inspector panel). Run report: `reports/run-227-summary.md`.

