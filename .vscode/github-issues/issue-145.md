---
id: 4292435770
number: 145
title: 'Phase 3 §D.3.a: Coding tab skeleton (FilterBar + HandoffThread + AgentBadge)'
state: closed
created_at: '2026-04-20T00:29:24Z'
updated_at: '2026-04-20T01:05:06Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/145
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/145'
closed_at: '2026-04-20T01:03:42Z'
---
# Phase 3 §D.3.a: Coding tab skeleton (FilterBar + HandoffThread + AgentBadge)

Per `AI plans/phase-3-plan.md` §D.3 and `Docs/Plans/Part 6 UI Master Plan.md` §7.1. First §D leaf after shadcn scaffold (PR #114, D-20260419-019).

## Scope — §D.3.a structural skeleton only
Part 6 §7.1 describes three concerns:
1. **Filter bar** + live indicator at the top
2. **HandoffThread** card list (collapsible, agent-badged)
3. **Inspector** panel on the right when a line is clicked

This leaf delivers 1 and 2 (left pane of MainPanes) as structural components. Inspector (right pane) is §D.3.b. Real WebSocket feed is §E.5.

## Goal
New structural components that `ProjectTabContent` can mount when `tab === 'coding'`. All components take typed props — no store wiring, no network calls. Mock data demonstrates the shape for tests and visual QA.

## Acceptance criteria

### New components in `dashboard/app/_components/coding/`
- **`AgentBadge.tsx`** — small pill showing an agent name ('RooCode', 'Copilot', 'Claude', 'unknown'). Props: `{ agent: string }`. Pill color differs per known agent, falls back to neutral for unknown.
- **`FilterBar.tsx`** — top-bar row with agent dropdown, task-type dropdown, status dropdown, search input, and a "🔴 Live" indicator. Props: `{ filters: Filters, onChange: (next: Filters) => void, live: boolean }`. Dropdowns + search are controlled; no store internally.
- **`HandoffThread.tsx`** — card rendering one delegation thread. Props: `{ thread: HandoffThreadData, expanded?: boolean, onToggle?: () => void }`. Collapses to a one-line summary when `expanded === false`; shows full message list when true. Per spec: "collapse by default when `status = done`". Each message is a simple `{ timestamp, from, to, text }` row; no diff rendering in this leaf (§D.3.c later).
- **`CodingTabContent.tsx`** — composes `FilterBar` + a list of `HandoffThread`s. Accepts `{ threads: HandoffThreadData[], filters: Filters, onFiltersChange: (f: Filters) => void }`. Reads `filters` to decide which threads to show (simple predicate match: agent/task-type/status/search substring). Renders a placeholder empty state when no threads match.

### Type shapes
Export from a new `dashboard/app/_components/coding/types.ts`:
```ts
export type AgentName = 'RooCode' | 'Copilot' | 'Claude' | string;
export type ThreadStatus = 'in_progress' | 'done' | 'blocked' | 'failed';

export interface HandoffMessage {
  timestamp: string; // HH:mm:ss or full ISO
  from: string;      // e.g. 'Lead', 'Roo', 'GH'
  to: string;        // e.g. 'Roo', 'files', 'Lead'
  text: string;
}

export interface HandoffThreadData {
  id: string;            // e.g. '#128'
  agent: AgentName;
  status: ThreadStatus;
  headline: string;      // e.g. 'restore green baseline'
  decisionId?: string;   // D-YYYYMMDD-###
  issueNumber?: number;
  messages: HandoffMessage[];
}

export interface Filters {
  agent: string;        // '' = any
  taskType: string;     // '' = any
  status: string;       // '' = any
  search: string;       // '' = any
}

export const EMPTY_FILTERS: Filters = { agent: '', taskType: '', status: '', search: '' };
```

### Integration into `ProjectTabContent`
- When `tab === 'coding'`, the operator pane (left side of `MainPanes`) renders `CodingTabContent` with a small mock dataset (3 threads: one in_progress, one done, one blocked).
- Right pane (conversational) continues to render its existing placeholder for now — inspector wiring is §D.3.b.
- When `tab !== 'coding'`, existing behavior unchanged (no regression on guidance/log tabs).

### Tests in `dashboard/__tests__/coding-tab.test.tsx` (Jest + @testing-library/react)
Minimum 10 cases. Use the existing `render` + `screen` pattern from `main-panes.test.tsx`:
1. `AgentBadge` renders the agent name
2. `AgentBadge` uses neutral styling for unknown agents
3. `FilterBar` renders all 4 controls + Live indicator
4. `FilterBar` calls onChange with new filters when a dropdown changes
5. `FilterBar` shows Live indicator only when `live === true`
6. `HandoffThread` shows one-line summary when collapsed
7. `HandoffThread` shows full message list when expanded
8. `HandoffThread` starts collapsed when `status === 'done'` (no `expanded` prop passed)
9. `CodingTabContent` filters threads by agent dropdown
10. `CodingTabContent` filters threads by search substring (case-insensitive match on headline + messages)
11. `CodingTabContent` shows empty state when filters reject all threads

### Verification
- `cd dashboard && npm test` green (133 existing + 11 new ≥ 144)
- `cd dashboard && npm run check:arch` 3/3
- `cd dashboard && npm run check:guardrail-coverage` exit 0
- `cd dashboard && npm run build` green
- `ProjectTabContent` regression-safe on `tab=guidance` and `tab=log` (existing tests still pass)

## Scope — TOUCH ONLY
- `dashboard/app/_components/coding/AgentBadge.tsx` (NEW)
- `dashboard/app/_components/coding/FilterBar.tsx` (NEW)
- `dashboard/app/_components/coding/HandoffThread.tsx` (NEW)
- `dashboard/app/_components/coding/CodingTabContent.tsx` (NEW)
- `dashboard/app/_components/coding/types.ts` (NEW)
- `dashboard/app/projects/[projectId]/[tab]/ProjectTabContent.tsx` (extend to render CodingTabContent on tab=coding)
- `dashboard/__tests__/coding-tab.test.tsx` (NEW)

## Out of scope (future sub-leaves)
- §D.3.b: Inspector panel on right (click-line opens inspector with JSON payload + copy button)
- §D.3.c: Diff rendering in messages (react-diff-view integration)
- §D.3.d: Empty state illustration (only a text placeholder in this leaf)
- §D.3.e: "Relay specific instruction to this agent" footer textarea
- §E.5: Real WebSocket feed (this leaf uses mock data props)

## Design notes (already decided)
1. **Tailwind + shadcn primitives** (Button from PR #114) for any interactive element. No raw `<button>` unstyled.
2. **`Filters` shape**: `'' === any` rather than `undefined/null`. Simpler predicate logic + easier to serialize to URL later.
3. **`HandoffThread` collapsed-by-default for `status === 'done'`**: honor the Part 6 §7.1 spec.
4. **No shadcn Select component yet** — use native `<select>` with Tailwind styling. shadcn Select install is a separate leaf when §D.3.b adds the Inspector's JSON tree.
5. **`AgentBadge` color mapping**: RooCode=blue, Copilot=orange, Claude=purple, any unknown=gray. Keeps visual identity even without shadcn Badge.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T00:29:24Z
**Updated:** 2026-04-20T01:05:06Z
**Closed:** 2026-04-20T01:03:42Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-20T01:05:06Z

Auto-closed by PR #147 / D-20260419-042.

Summary: §D.3.a Coding tab skeleton landed — 7 new files under `dashboard/app/_components/coding/` + 12 Jest tests, `ProjectTabContent.tsx` wired to render `<CodingTabContent>` with 3 mock handoff threads. 132/132 dashboard tests green, `npm run build` green, arch 3/3 PASS, guardrail-coverage exit 0.

Code-quality reviewer's IMPORTANT landmark-nesting finding fixed inline (`<main>` → `<section>` in `CodingTabContent`); 3 cosmetic NITs + the parallel `<main>` → `<section>` migration for `ProjectTabContent.tsx` filed as follow-up Issue #146 per the close-the-review-loop rule (4th application; precedents D-036, D-038, D-041).

Run report: `reports/run-225-summary.md`.

