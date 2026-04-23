---
id: 4292848186
number: 154
title: >-
  feat(dashboard): Phase 3 §D.3.c Coding-tab inline diff rendering (DiffBlock
  component)
state: closed
created_at: '2026-04-20T03:06:59Z'
updated_at: '2026-04-20T10:05:47Z'
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
  - id: 10739055690
    name: 'priority:high'
    color: D93F0B
    description: Core backbone / active Phase progression
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/154
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/154'
closed_at: '2026-04-20T10:05:47Z'
---
# feat(dashboard): Phase 3 §D.3.c Coding-tab inline diff rendering (DiffBlock component)

## Context

Next backbone leaf in Phase 3 §D.3 after §D.3.a skeleton (#145), §D.3.a polish (#146 + #148), §D.3.b inspector panel (#150), and §D.3.b polish (#152 — this leaf runs in parallel). Adds **inline diff rendering** called out by `Docs/Plans/Part 6 UI Master Plan.md` §7.1 line 245:

> "Diffs render inline with react-diff-view; large diffs collapse and offer 'open in VS Code' via `vscode://` URI."

Plan reference: `AI plans/phase-3-plan.md` §D.3 line 116 — HandoffThread diff previews.

Out of scope for this leaf: the `vscode://` jump-link (its own sub-leaf once diff rendering is in place), relay-instruction footer textarea, empty-state illustration.

## Acceptance Criteria

### 1. Extend `HandoffMessage` to carry an optional diff payload

- [ ] Update `dashboard/app/_components/coding/types.ts`:
  - Add `DiffFile` interface: `{ path: string; added: number; removed: number; patch: string }` where `patch` is a unified-diff string.
  - Extend `HandoffMessage` with an optional `diffs?: DiffFile[]` field.
- [ ] Update the 3 mock threads in `ProjectTabContent.tsx` → `MOCK_CODING_THREADS`: at least one message in one thread gains a realistic 1-2-file unified-diff `diffs` array so the UI has sample data to render.

### 2. New `DiffBlock` component

- [ ] Create `dashboard/app/_components/coding/DiffBlock.tsx` (`'use client'`):
  - Props: `{ diff: DiffFile }`.
  - Header row: monospace `path` + `+<added> / -<removed>` summary + collapse/expand toggle (button with `aria-expanded`).
  - Body: pretty-printed unified-diff rendered as a `<pre>` with per-line CSS classes (`text-green-400` for `+`, `text-red-400` for `-`, `text-gray-500` for hunk headers / context). Use a tiny in-house parser — DO NOT pull in `react-diff-view` this tick (extra dep + bigger bundle; out-of-scope decision per D-045).
  - Default state: collapsed when `(added + removed) > 50`, expanded otherwise.
  - Dual-mode controlled/uncontrolled via `expanded?: boolean` + `onExpandedChange?: (b) => void` props (same pattern as `HandoffThread`).

### 3. Render diffs inside `HandoffThread` message lines

- [ ] When a `HandoffMessage` has `diffs && diffs.length > 0`, render one `DiffBlock` per file AFTER the message text.
- [ ] Preserve the existing `<button>` interaction for opening the inspector — clicking the DIFF area should NOT also open the inspector. Either use `event.stopPropagation()` on the diff toggle, OR make the message row `<div>` (not `<button>`) when a diff is present and expose a separate "inspect payload" button.
- [ ] Simpler implementation: always make the message-row the click target for the inspector, BUT wrap `DiffBlock` in a `<div onClick={e => e.stopPropagation()}>` so diff toggles don't propagate. This keeps the message-level click target stable.

### 4. Tests

- [ ] Add ≥ 6 new Jest tests (either in `coding-tab.test.tsx` or new `diff-block.test.tsx`):
  1. `DiffBlock` renders path + added/removed counts.
  2. Small diff (< 50 lines) renders expanded by default.
  3. Large diff (> 50 lines) renders collapsed by default.
  4. Clicking the toggle flips expanded state.
  5. Diff lines get correct color classes (`text-green-400` on `+` lines, `text-red-400` on `-` lines).
  6. `HandoffThread` renders `DiffBlock`s when a message has `diffs`.
  7. Clicking the diff toggle does NOT open the inspector (stopPropagation works).
- [ ] Dashboard test count ≥ 155 (current 148 + 6).

### 5. Gates green

- [ ] `cd dashboard && npm test` — all green.
- [ ] `cd dashboard && npm run build` — green; bundle size can go up but should not double.
- [ ] `node dashboard/scripts/check-arch.js` — 3/3 PASS.
- [ ] `node dashboard/scripts/check-guardrail-coverage.js` — exit 0.

## Design notes

- In-house unified-diff line classifier: regex `/^\+(?!\+)/` = added, `/^-(?!-)/` = removed, `/^@@/` = hunk header, `/^(---|\+\+\+)/` = file header, everything else = context. Per-line render inside a `<pre>` with per-line `<span className={cls}>...</span>`.
- Do NOT highlight syntax within the diff (too expensive for a skeleton leaf; a later `§D.3.e`-ish leaf can add Shiki or Prism).
- `DiffBlock` stays a presentational component — no data fetching, no state beyond `expanded`.

## Decision-log anchor

- Precedent: D-042 (skeleton), D-043/044 (skeleton polish), D-045 (inspector).
- Phase-3-plan reference: §D.3 line 116.
- Part 6 reference: §7.1 line 245.

## Links

- Parent epic: §D.3 Coding tab.
- Next leaves after this (rough order): §D.3.d relay-instruction footer, §D.3.e empty-state illustration + `vscode://` jump-link.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T03:06:59Z
**Updated:** 2026-04-20T10:05:47Z
**Closed:** 2026-04-20T10:05:47Z
**Labels:** type:task, status:in-progress, phase:3, priority:high
