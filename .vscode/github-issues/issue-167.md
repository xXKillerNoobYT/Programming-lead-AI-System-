---
id: 4296936261
number: 167
title: >-
  feat(dashboard): Phase 3 §D.3.d Coding-tab RelayFooter (in_progress threads —
  textarea + Ctrl+Enter send)
state: closed
created_at: '2026-04-20T15:48:23Z'
updated_at: '2026-04-20T16:10:09Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/167
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/167'
closed_at: '2026-04-20T16:10:09Z'
---
# feat(dashboard): Phase 3 §D.3.d Coding-tab RelayFooter (in_progress threads — textarea + Ctrl+Enter send)

## Context

Next §D.3 backbone leaf. Per `Docs/Plans/Part 6 UI Master Plan.md` §7.1 line 246:
> "'Relay specific instruction to this agent' (Part 1 §4.1) is a footer textarea on any active thread; sends as a Lead-side message that gets MCP-delegated."

The user should be able to type a message at the bottom of an **active** HandoffThread (`status: 'in_progress'`) and relay it to the agent. For v1 the submit action is a stub (the real MCP-delegate wiring lands when the WebSocket feed does); UI + keyboard shortcut + local-optimistic append should all work.

Scope of this leaf is the UI surface only. Out of scope: real MCP delegation, WebSocket broadcast, server round-trip.

## Acceptance Criteria

### 1. `RelayFooter` component

- [ ] Create `dashboard/app/_components/coding/RelayFooter.tsx` (`'use client'`):
  - Props: `{ threadId: string; onSend: (text: string) => void; disabled?: boolean; placeholder?: string }`.
  - Layout: `<textarea>` + send `<button>` in a flex row pinned to bottom of the thread card.
  - Keyboard: `Cmd/Ctrl + Enter` submits; plain `Enter` inserts newline (standard chat-input UX).
  - Submit disabled when textarea value is empty/whitespace OR `disabled` prop is true.
  - After submit: clear the textarea, keep focus on it (so user can send a follow-up immediately).
  - Accessible name: `<label class="sr-only" htmlFor="relay-{threadId}">Relay instruction to {agent}</label>` (parent thread passes agent name; accept an optional `agent?: string` prop).

### 2. Render `RelayFooter` only on active threads in `HandoffThread`

- [ ] `HandoffThread.tsx`: when `thread.status === 'in_progress'`, render `<RelayFooter>` INSIDE the expanded thread card after the message list.
- [ ] Don't render on `status: 'done' | 'blocked' | 'failed'` — only `in_progress` is active.
- [ ] Plumb a new optional `onRelaySend?: (threadId: string, text: string) => void` prop through `HandoffThread`.

### 3. Wire through `CodingTabContent`

- [ ] Add optional `onRelaySend` prop to `CodingTabContent`.
- [ ] When `RelayFooter` calls `onSend(text)`, `HandoffThread` calls `onRelaySend(thread.id, text)`, `CodingTabContent` calls its parent's `onRelaySend` if provided.
- [ ] For v1 in `ProjectTabContent` (still a server component), don't wire a real callback; the internal `useState` in a client wrapper (or just a console.log stub) is fine. Document that the real wire-up happens when the WebSocket lands.

### 4. Accessibility + polish

- [ ] Textarea is `aria-label`ed OR wrapped in an `sr-only` `<label>` (latter preferred — matches FilterBar pattern).
- [ ] `aria-keyshortcuts="Control+Enter"` on the send button so AT announces the shortcut.
- [ ] Placeholder text: e.g., `"Relay instruction to Roo (Ctrl+Enter to send)"` — compose from `agent` prop.
- [ ] Visual: match the existing HandoffThread dark-mode palette; textarea bg slightly darker than card bg; send button primary-colored when enabled, muted when disabled.

### 5. Tests (≥ 6 new)

- [ ] `dashboard/__tests__/relay-footer.test.tsx` (new file) covers:
  1. Renders textarea + send button.
  2. Send button disabled when textarea empty.
  3. Send button enabled when textarea has non-whitespace content.
  4. Ctrl+Enter (or Cmd+Enter) submits via `onSend`.
  5. Plain Enter does NOT submit; just inserts newline.
  6. After submit, textarea is cleared and focus stays on it.
- [ ] `coding-tab.test.tsx` extension: integration test that `RelayFooter` is NOT rendered on `status='done' | 'blocked' | 'failed'` threads AND IS rendered on `status='in_progress'`.
- [ ] Dashboard count ≥ 172 (current 165 + 6 new + 1 integration).

### 6. Gates green

- [ ] `cd dashboard && npm test` — all green.
- [ ] `cd dashboard && npm run build` — green; bundle delta < 2 kB.
- [ ] `node dashboard/scripts/check-arch.js` — 3/3 PASS.
- [ ] `node dashboard/scripts/check-guardrail-coverage.js` — exit 0.

## Design notes

- No real MCP delegation wired up this tick — stub via `onRelaySend` callback that's `undefined` by default in `ProjectTabContent`. Real wiring is a Phase 4 WebSocket leaf.
- Textarea uses `react` controlled state, not an uncontrolled ref.
- Keep the component PRESENTATIONAL — no data fetching, no timers. Parent owns any state.

## Decision-log anchors

- Precedent: D-20260420-002 (§D.3.c diff rendering), D-20260420-003 (§D.3.b a11y v2).
- Part 6 §7.1 line 246.
- Part 1 §4.1.

## Links

- Parent epic: §D.3 Coding tab.
- Sibling leaves: §D.3.e syntax highlighting (#167 — filed in same tick).


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T15:48:23Z
**Updated:** 2026-04-20T16:10:09Z
**Closed:** 2026-04-20T16:10:09Z
**Labels:** type:task, status:in-progress, phase:3, priority:high
