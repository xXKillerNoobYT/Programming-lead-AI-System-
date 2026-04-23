---
id: 4292656404
number: 150
title: >-
  feat(dashboard): Phase 3 §D.3.b Coding-tab inspector panel (right pane, click
  message → open payload)
state: closed
created_at: '2026-04-20T01:56:51Z'
updated_at: '2026-04-20T02:51:54Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/150
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/150'
closed_at: '2026-04-20T02:51:34Z'
---
# feat(dashboard): Phase 3 §D.3.b Coding-tab inspector panel (right pane, click message → open payload)

## Context

Next leaf in Phase 3 §D.3 after the §D.3.a skeleton (#145 closed via D-042) and the §D.3.a polish (#146 closed via D-043). This leaf adds the **right inspector panel** called out in `Docs/Plans/Part 6 UI Master Plan.md` §7.1:

> "Click a line to open the right inspector with full MCP payload (JSON tree, copy button)."

Plan reference: `AI plans/phase-3-plan.md` §D.3 line 116 — "`HandoffThread`, `AgentBadge`, filter bar, **inspector**."
Layout reference: `Docs/Plans/Part 6 UI Master Plan.md` §6.3 line 103 — "Optional right inspector (320 px, toggleable): context-sensitive details (selected agent report, selected decision, selected metric drill-down)."

Out of scope for this leaf (separate future leaves): diff rendering, VS Code jump-links, relay-instruction footer textarea, empty-state illustration.

## Acceptance Criteria

### 1. New `InspectorPanel` component

- [ ] Create `dashboard/app/_components/coding/InspectorPanel.tsx` (`'use client'`) rendering a fixed-width (320 px `w-80`) right-side panel with:
  - Header row: title of the selected item + close button (aria-label="Close inspector") triggering `onClose`.
  - Body: a pretty-printed JSON tree of the selected `HandoffMessage` payload (use `<pre>` + `JSON.stringify(payload, null, 2)` for v1 — tree widget is a later leaf).
  - Footer: a "Copy JSON" button that writes the payload to clipboard. If the clipboard API is unavailable (e.g., in Jest/JSDOM), the component must gracefully no-op without throwing.
- [ ] Component accepts props `{ message: HandoffMessage; threadId: string; onClose: () => void }`.
- [ ] When `message.text` is empty, the body renders "No payload" instead of throwing on an empty JSON string.

### 2. Wire inspector open/close into `CodingTabContent`

- [ ] Extend `CodingTabContent.tsx` to track `selectedMessage: { threadId: string; message: HandoffMessage } | null` in local state (uncontrolled) or via new optional controlled props (follow the existing filters controlled/uncontrolled shape).
- [ ] Pass a new `onMessageClick(threadId, message)` prop down through `HandoffThread` so each rendered message line can call it. When called, set `selectedMessage` to the payload.
- [ ] When `selectedMessage !== null`, render the `InspectorPanel` to the RIGHT of the thread list using a two-column flex layout (threads scrollable on the left, inspector pinned to the right).
- [ ] When `selectedMessage === null`, the inspector is not rendered — the thread list takes the full width.

### 3. Extend `HandoffThread` to fire click events

- [ ] Add optional `onMessageClick?: (threadId: string, message: HandoffMessage) => void` prop.
- [ ] Each rendered message line (currently a `<div>` inside the thread body) becomes a `<button>` (for keyboard + screen-reader affordance) or a div with `role="button" tabIndex={0}` that fires `onMessageClick(thread.id, message)` on click AND on keyboard Enter/Space.
- [ ] `aria-label` or inner text is human-readable so AT announces the target clearly.

### 4. Keyboard shortcut: Escape closes the inspector

- [ ] `InspectorPanel` adds a `keydown` listener for `Escape` that fires `onClose`. Clean up on unmount.
- [ ] Don't swallow Escape when no inspector is rendered.

### 5. Tests

- [ ] Add 6+ new Jest tests in `dashboard/__tests__/coding-tab.test.tsx` (or a new `inspector.test.tsx` — author's choice):
  - Inspector not rendered when no message selected.
  - Clicking a message line sets `selectedMessage` and renders the inspector.
  - Close button fires `onClose` and inspector unmounts.
  - Escape key closes the inspector.
  - Copy button writes `JSON.stringify(payload, null, 2)` to `navigator.clipboard`.
  - Copy gracefully no-ops when clipboard API is unavailable (mock `navigator.clipboard = undefined`).
- [ ] Dashboard test count MUST reach at least 138 (current 132 + 6 new) — adjust upward if the author writes more.

### 6. Gates green

- [ ] `cd dashboard && npm test` — all green.
- [ ] `cd dashboard && npm run build` — green.
- [ ] `node dashboard/scripts/check-arch.js` — 3/3 PASS.
- [ ] `node dashboard/scripts/check-guardrail-coverage.js` — exit 0.

## Design notes (for implementer)

- Part 6 §7.1 calls this panel "right inspector", 320 px wide, toggleable.
- Use `w-80` (Tailwind = 20rem = 320px).
- Follow the controlled/uncontrolled dual-mode pattern established in `CodingTabContent` for filters (D-042 rationale): optional `selectedMessage` + `onSelectedMessageChange` props for tests; internal `useState` for integration.
- DO NOT pull in a JSON-tree widget library this tick. `<pre>{JSON.stringify(payload, null, 2)}</pre>` is the correct v1; widget is a later leaf.
- DO NOT add `react-diff-view` this tick — diff rendering is §D.3.c per my sub-leaf decomposition.

## Decision-log anchor

- Precedent: D-20260419-042 (skeleton) and D-20260419-043 (polish).
- Phase-3-plan reference: §D.3.
- Part 6 reference: §7.1 + §6.3.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T01:56:51Z
**Updated:** 2026-04-20T02:51:54Z
**Closed:** 2026-04-20T02:51:34Z
**Labels:** type:task, status:in-progress, phase:3

---

## Comments

### @xXKillerNoobYT - 2026-04-20T02:51:54Z

Auto-closed by PR #153 / D-20260419-045. §D.3.b inspector panel landed: new InspectorPanel with role="dialog", w-80 right pane, JSON payload rendering, Escape/close dismissal, thorough clipboard guard. Tests 139→148 (9 new, 3 bonus). 3 follow-up NITs (focus mgmt, copy feedback, null-selection test) filed as Issue #152. Run report: `reports/run-228-summary.md`.

