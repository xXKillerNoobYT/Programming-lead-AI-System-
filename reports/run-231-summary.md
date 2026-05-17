# Run 231 — Phase 3 §D.3.c Coding-tab inline diff rendering (closes #154)

**Date**: 2026-04-20 (first tick of the 3-hour cadence post-resume)
**Branch**: `issue-154/d3c-diff-rendering` (off `origin/main`)
**Issue closed**: #154
**Decision**: D-20260420-002
**Tick type**: new-feature backbone leaf (not polish)

---

## What landed

3rd §D backbone-feature leaf this session (after #145 skeleton, #150 inspector panel) + 17th subagent-driven leaf across sessions.

### New files

- `dashboard/app/_components/coding/DiffBlock.tsx` (`'use client'`, presentational). Header (path + `+N/-N` + chevron toggle with `aria-expanded` + `aria-label`). Body `<pre>` with per-line colored `<span>`s (green-400 / red-400 / gray-500 / gray-300). Default collapsed when `added + removed > 50`. Dual-mode controlled/uncontrolled via `expanded !== undefined` discriminator.
- `dashboard/__tests__/diff-block.test.tsx` — 6 unit tests.

### Modified files

- `dashboard/app/_components/coding/types.ts` — new `DiffFile` interface + optional `HandoffMessage.diffs?: DiffFile[]`.
- `dashboard/app/_components/coding/HandoffThread.tsx` — message-row converted from native `<button>` to `<div role="button" tabIndex={0}>` (nested-button HTML invalidity) with Enter/Space activation + Space `preventDefault()`. Diff list wrapped in sibling `<div>` with click + keydown `stopPropagation`.
- `dashboard/app/projects/[projectId]/[tab]/ProjectTabContent.tsx` — handoff-2 second message gains 2 realistic diff fixtures (`lib/guardrails.js` +4/-2, `tests/guardrails.test.js` +3/-1) covering every parser branch.
- `dashboard/__tests__/coding-tab.test.tsx` — +2 integration tests (test 27 renders, test 28 stopPropagation regression guard).

### Tests

- **Tests 154 → 162** (+8: 6 DiffBlock unit + 2 integration).
- **Suites 13 → 14**.

---

## Parser design highlight

`parseDiffLines(patch: string)` is a 20-line pure function with regex-order-sensitive classification:

1. File header (`/^(?:---|\+\+\+)/`) — **MUST be first**; otherwise `--- a/foo` would match `/^-(?!-)/` and paint red.
2. Hunk header (`/^@@/`).
3. Added (`/^\+(?!\+)/`).
4. Removed (`/^-(?!-)/`).
5. Everything else → context.

CRLF-safe (splits on `/\r?\n/`). Empty lines render as `\u00A0` so `<pre>` preserves line height. Named export for future §D.3.e syntax-highlighting reuse.

---

## Subagent pipeline outcomes

| Stage | Verdict | Notes |
|-------|---------|-------|
| Implementer | **DONE** | No concerns. 8 tests (exceeds ≥6). Flagged nested-button pitfall resolution as design call worth reviewing. |
| Spec compliance | **APPROVED** | All 5 ACs met; parser mental-test confirms ordering correct; test quality "substantial". |
| Code quality | **APPROVED WITH NITS** (0 IMPORTANT, 0 inline fixes) | 3 deferred sub-threshold NITs — captured here, not a new Issue. |

## Deferred NITs (sub-threshold, captured per D-044 convention)

1. **`parseDiffLines` exported with no current caller** — YAGNI concern. Kept: narrow + pure + concretely earmarked for §D.3.e syntax-highlighting reuse.
2. **`stopPropagation` wrapper pattern** — potentially fragile if outer click handlers proliferate. Kept: documented with 4-line inline comment; alternative `event.target.closest('.diff-block')` only becomes clearly-better if the pattern repeats.
3. **`aria-label` on diff toggle redundant with visible text** — removing would break test 28's `getByLabelText(/src\/... — \+N \/ -N/i)` query (uses em-dash separator the visible text lacks). Kept.

These are below the "file a consolidated follow-up Issue" threshold (D-044 convention). If §D.3.e or a later tick surfaces sibling NITs, this run report is where they bundle from.

---

## AC walkthrough (Issue #154)

| AC | Met? | Evidence |
|----|------|----------|
| 1. `DiffFile` + `HandoffMessage.diffs` + mock fixture | Yes | `types.ts:27-32`, `ProjectTabContent.tsx` handoff-2 |
| 2. `DiffBlock` component with header/body/toggle, threshold=50, dual-mode | Yes | `DiffBlock.tsx:28-148`; tests 1-4, 6 |
| 3. Render `DiffBlock` inside `HandoffThread`, stopPropagation | Yes | `HandoffThread.tsx:130-151`; test 28 |
| 4. ≥6 new tests, count ≥160 | Yes | 8 new; 162 total |
| 5. All 4 gates green | Yes | Captured below |

## Final gates

- `cd dashboard && npm test` → 162/162 pass (14 suites).
- `cd dashboard && npm run build` → green; `/projects/[projectId]/[tab]` at 12.1 kB (+2 kB for DiffBlock + parser; no new deps).
- `node dashboard/scripts/check-arch.js` → 3/3 PASS.
- `node dashboard/scripts/check-guardrail-coverage.js` → exit 0.

---

## Pattern milestones

- **First tick of 3-hour cadence** post-resume. Delivered a full backbone leaf (not polish) with 8 new tests — rationale: at 8 ticks/day max, each tick should be substantive.
- **3rd component to adopt `!== undefined` controlled-uncontrolled discriminator** (after `CodingTabContent` + `HandoffThread` toggle + `InspectorPanel.selectedMessage`). Pattern is now the session's canonical React-optional-controlled idiom — worth codifying in a future style-guide doc.
- **First use of new `D-20260420-###` numbering** — reflects the parallel-session's D-20260420-001 already on main. D-20260419-046 is retired (the superseded PR #160 situation).

## Next pick

Next wake fires via cron `5c736eb3` at the next :17 past the hour that's ≥ 3 hours from this tick's start. Candidates for that tick, in priority-first order:

1. **priority:urgent** — #158 (compliance-confirmed, waiting for 2026-04-27 auto-close), #161 (collision protocol, meta). Neither is a concrete-leaf pick; informational.
2. **priority:high** — **#159 inspector a11y v2** (status re-announce + informative Copy failed). Close-the-review-loop continuation for §D.3.b.
3. **priority:medium** — #157 `check:peer-deps`, #100 docs sync, #112 stale `.next/`, #113 bug-hunt probe depth.

Natural next: **#159**. §D.3.b + §D.3.c are now the shipped backbone; the a11y v2 polish closes the §D.3.b story to done. After #159, §D.3.d (relay-instruction footer textarea) or §D.3.e (syntax highlighting in diffs) are next backbone candidates — file as Issues in that tick's backlog refill.
