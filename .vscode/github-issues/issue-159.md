---
id: 4292897266
number: 159
title: >-
  chore(dashboard): §D.3.b inspector a11y v2 — status re-announce + more
  informative Copy failed message (follow-up to #152)
state: closed
created_at: '2026-04-20T03:24:29Z'
updated_at: '2026-04-20T13:06:06Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/159
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/159'
closed_at: '2026-04-20T13:06:06Z'
---
# chore(dashboard): §D.3.b inspector a11y v2 — status re-announce + more informative Copy failed message (follow-up to #152)

## Context

Follow-up leaf from Issue #152 (§D.3.b inspector polish). Code-quality reviewer returned ✅ APPROVED WITH NITS; the significant NIT (test-regex fragility) was applied inline on PR. This Issue captures the remaining cosmetic / UX-improvement NITs per the close-the-review-loop rule.

Scope is intentionally small — 2 narrow a11y UX improvements to the InspectorPanel's Copy feedback.

## Acceptance Criteria

### 1. Re-announce "Copied ✓" on rapid consecutive clicks

- [ ] Currently: if a user clicks Copy at t=0 → `<span role="status">Copied ✓</span>` mounts, then clicks again at t=1.5s, the element stays mounted (timer resets; same text). Screen readers do NOT re-announce because the DOM didn't change.
- [ ] Fix: briefly toggle the status element off/on via a nonce key (e.g., a counter incremented on each Copy click, used as React `key={copyNonce}` on the status span). The remount triggers a fresh `role="status"` announcement.
- [ ] Alternative: append an invisible ZWSP-like character that flips each click so the text content changes. Less preferable — keying is cleaner.
- [ ] New test: fire 2 Copy clicks with a short gap between them, assert the status element's `key` / mount-counter increments; assert a re-render occurred (can check mount count via a render-prop or jest spy).

### 2. More informative "Copy failed" message

- [ ] Replace the bare "Copy failed" string with "Copy failed — clipboard unavailable" (or split into two branches: "Copy failed — permission denied" when `writeText` rejected, vs "Copy failed — clipboard unavailable" when `navigator.clipboard` missing).
- [ ] Update existing test 25's assertion to `/copy failed/i` regex (already is) so the more specific message doesn't break it.
- [ ] Optional: split the `failed` state into two discriminant values (`'failed-permission' | 'failed-unavailable'`) so future logging can distinguish the paths.

## Out of scope (later leaves)

- StrictMode double-mount focus bounce (dev-only — invisible in prod; won't touch unless adopting a stricter a11y baseline).
- Thread headline as inspector title (requires types.ts + prop-drilling; covered by §D.3.c or later).
- Focus trap / Tab wrapping inside the dialog (overkill for a non-modal right-pane).

## Verification

- `cd dashboard && npm test` — all green (should add ≥ 1 new test; total ≥ 157).
- `cd dashboard && npm run build` — green.
- `node dashboard/scripts/check-arch.js` — 3/3 PASS.

## Links

- Parent leaves: Issue #150 (§D.3.b skeleton, closed via D-045), Issue #152 (this polish, closed via D-046).
- Code-quality review for #152 suggested bundling these as "inspector a11y v2".


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T03:24:29Z
**Updated:** 2026-04-20T13:06:06Z
**Closed:** 2026-04-20T13:06:06Z
**Labels:** type:task, status:in-progress, phase:3, priority:high
