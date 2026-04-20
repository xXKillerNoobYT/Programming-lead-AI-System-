# Run 229 — Phase 3 §D.3.b inspector polish (closes #152)

**Date**: 2026-04-19
**Branch**: `issue-152/d3b-inspector-polish` (off `origin/main`)
**Issue closed**: #152
**Follow-up filed**: #159 (inspector a11y v2 — `role="status"` re-announce + informative Copy failed)
**Backlog refill filed**: #154 (§D.3.c diff rendering)
**Decision**: D-20260419-046

---

## What landed

7th close-the-review-loop polish tick this session (D-036 / D-038 / D-041 / D-042 / D-043 / D-044 / D-045 / **D-046**) + 16th subagent-driven leaf overall. §D.3.b story now fully closed across 2 leaves (#150 skeleton → #152 polish).

### AC walkthrough

| AC | Summary | Evidence |
|----|---------|----------|
| 1. Focus management | Mount-focus on close button; restore to trigger on unmount. Works for both close-click AND Escape paths via `CodingTabContent` unmount-on-null-selection. | Tests 21/22/23; `InspectorPanel.tsx:61-72`. |
| 2. Copy feedback | `CopyStatus` union + 2s timeout reset; rapid-re-click cancels prior timer; `role="status"` live-region announcement. | Tests 24/25/28; `InspectorPanel.tsx:43-151, 204-213`. |
| 3. `selectedMessage={null}` lock | Test 26 (null → no render) + bonus test 27 (null→populated flip → mount) locks the `!== undefined` discriminator. | `coding-tab.test.tsx:559+577`. |

### Tests

- Jest: **148 → 156** (+8: 3 focus + 2 copy feedback + 2 null-selection + 1 setTimeout-cleanup regression).
- Suites: 13 (unchanged).

---

## Subagent pipeline

| Stage | Verdict | Notes |
|-------|---------|-------|
| Implementer | **DONE** | No concerns. Used `line.focus()` + `fireEvent.click` instead of adding `@testing-library/user-event` dep. Two-layer timer-cleanup. |
| Spec compliance | **APPROVED** | Test quality rated "Excellent". All 3 implementer design choices ACCEPT'd. |
| Code quality | **APPROVED WITH NITS** | 0 IMPORTANT, 7 NITs (6 cosmetic/future-polish, 1 inline-fix-able). |

## Tick actions after review

**Inline fix (from reviewer NIT #5, applied pre-commit)**:
- `coding-tab.test.tsx:640-641` — broadened the setTimeout-cleanup test's unmount-warning substring check from `.includes('unmounted')` to `/unmount/i` regex. Reason: React has reworded this warning before ("after it was unmounted"). Keeps the test machine-checkable against wording drift.

**Verified non-issue (NIT #6)**:
- `handleInspectorClose` in `CodingTabContent.tsx:121` — already wrapped in `useCallback`, not re-created on every render. No action.

**Deferred to Issue #159** (consolidated per close-the-review-loop rule):
- `role="status"` does NOT re-announce on rapid consecutive Copy clicks (element stays mounted; polite live-regions coalesce). Fix: nonce-key remount on each click.
- "Copy failed" message too terse; split into `failed-permission` vs `failed-unavailable` for better SR guidance.

**Not filed as Issue** (dev-only, invisible in prod):
- StrictMode double-mount focus bounce (React 18 dev `useEffect` fires mount→cleanup→mount — captured trigger briefly re-focuses between the two mounts). No prod impact; would only matter if a stricter a11y baseline is adopted.

---

## Backlog refill (Polsia Rule 3 / smart-pipeline)

- **Issue #154** filed this tick: Phase 3 §D.3.c Coding-tab inline diff rendering. New `DiffBlock.tsx` component + `HandoffMessage.diffs` field extension + in-house unified-diff parser (no `react-diff-view` dep) + 6+ tests. Per `Docs/Plans/Part 6 UI Master Plan.md` §7.1 line 245.
- **Issue #159** filed for the 2 deferred NITs from this tick's review.

Backlog depth after this tick: #100 (meta) + #154 (§D.3.c) + #159 (inspector a11y v2) + whatever else is queued — well above the Polsia-3 floor.

## Final gates

- `cd dashboard && npm test` → 156/156 pass (13 suites; same count post-inline-fix).
- `cd dashboard && npm run build` → green; bundle 11.5 kB for `/projects/[projectId]/[tab]`.
- `node dashboard/scripts/check-arch.js` → 3/3 PASS.
- `node dashboard/scripts/check-guardrail-coverage.js` → exit 0.

---

## Pattern milestones

- **7th close-the-review-loop application.** Pattern is fully stable — no session tick has accumulated reviewer debt.
- **First proactive regression-lock tests** (tests 27 + 28) this session. Implementer didn't just fix what was asked; added tests that prevent future refactors from silently reverting the dual-mode discriminator or the setTimeout cleanup.
- **Zero new deps added** despite the polish touching focus + timer + a11y concerns. `line.focus()` + `fireEvent.click` enough without `user-event`; in-house CopyStatus state machine without a toast library.
- **§D.3.b story FULLY CLOSED** across 2 leaves (#150 skeleton → #152 polish). §D.3 Coding-tab is now: skeleton ✓, skeleton polish ✓, inspector ✓, inspector polish ✓. Next: §D.3.c diff rendering.

## Next pick

Next wakeup 780s. Natural candidates:
1. **Issue #154 — §D.3.c diff rendering** (newly-decomposed backbone leaf).
2. **Issue #100** — sync docs baseline across branches (meta; oldest).
3. **Issue #159** — inspector a11y v2 polish (newer; close-the-review-loop round 2 on inspector).

Natural rhythm says **#154** next (drive backbone forward; polish ticks have caught up). Oldest-first deviation (per CLAUDE.md §6 backbone-over-meta exception) justified since #100 is housekeeping.
