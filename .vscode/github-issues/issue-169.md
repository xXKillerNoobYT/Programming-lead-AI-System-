---
id: 4297028103
number: 169
title: >-
  chore(dashboard): §D.3.d RelayFooter polish — Meta+Enter aria + trim contract
  + disabled prop wire-or-remove (follow-up to #167)
state: open
created_at: '2026-04-20T16:03:23Z'
updated_at: '2026-04-20T16:03:23Z'
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
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/169
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/169'
---
# chore(dashboard): §D.3.d RelayFooter polish — Meta+Enter aria + trim contract + disabled prop wire-or-remove (follow-up to #167)

## Context

Follow-up leaf from Issue #167 (§D.3.d RelayFooter). Code-quality reviewer returned ✅ APPROVED WITH NITS (0 IMPORTANT, 0 inline fixes). This Issue consolidates the 3 non-blocking NITs per the close-the-review-loop rule (9th application across the session).

## Acceptance Criteria

### 1. Include `Meta+Enter` in `aria-keyshortcuts` for Mac users

- [ ] `dashboard/app/_components/coding/RelayFooter.tsx` — change `aria-keyshortcuts="Control+Enter"` to `aria-keyshortcuts="Control+Enter Meta+Enter"`. ARIA 1.2 spec allows space-separated shortcut strings; both variants are valid ARIA syntax. The component's handler already treats `ev.ctrlKey || ev.metaKey` equally, so the AT announcement should match.
- [ ] Optionally add a test confirming Cmd+Enter (metaKey=true) submits, symmetric with the existing Ctrl+Enter test — locks the symmetry against future regressions.

### 2. Decide the `onSend` trim contract

- [ ] Current: `RelayFooter` fires `onSend(value)` with RAW value — includes any trailing newline from pre-submit plain-Enter keystrokes.
- [ ] When the real backbone WebSocket wire-up arrives (Phase 4), the parent handler will slot this text into a chat message payload. Decide:
  - Option A: RelayFooter calls `onSend(value.trim())` — single source of trimming.
  - Option B: RelayFooter passes raw; parent trims at payload-build time.
  - Document the contract in RelayFooter's JSDoc either way.
- [ ] Also decide whether trailing whitespace MID-message (user types "hello  " before Ctrl+Enter) gets trimmed. `.trim()` removes both leading AND trailing whitespace.
- [ ] Recommended default: Option A (trim at source) — simpler parent implementation, matches most chat-input conventions (Slack, Discord, Linear).

### 3. Either wire or remove the `disabled` prop

- [ ] RelayFooter accepts `disabled?: boolean` but no call site passes it. Forward-looking stub.
- [ ] Decision path:
  - Option A: wire it — `HandoffThread` passes `disabled={thread.status !== 'in_progress'}` OR `disabled={submitInFlight}` when backbone-wiring lands.
  - Option B: remove the prop until a real caller needs it — YAGNI cleanup.
- [ ] If kept, add a test that passes `disabled={true}` and asserts the send button is disabled even with text.
- [ ] Recommended: keep but add the test now to lock the contract. When the real wiring lands (Phase 4), the prop is already there to use.

## Out of scope

- Real backbone WebSocket wiring — that's the D-20260419-042 / Phase 4 WebSocket leaf.
- Chat-input slash-commands (Linear-style `/assign`, `/label`) — Part 7 §C.12 future.

## Verification

- `cd dashboard && npm test` — all green (should grow by 1-2 tests if #1 and #3 add the suggested coverage).
- `cd dashboard && npm run build` — green.
- `node dashboard/scripts/check-arch.js` — 3/3 PASS.

## Links

- Parent leaf: Issue #167 (closed via D-20260420-004).
- Plan reference: `Docs/Plans/Part 6 UI Master Plan.md` §7.1 line 246.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T16:03:23Z
**Updated:** 2026-04-20T16:03:23Z
**Labels:** type:task, status:backlog, phase:3, priority:medium
