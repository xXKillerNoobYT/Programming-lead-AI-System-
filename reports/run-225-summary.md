# Run 225 — Phase 3 §D.3.a Coding tab skeleton

**Date**: 2026-04-19
**Branch**: `issue-145/coding-tab-skeleton` (off `origin/main`)
**Issue closed**: #145
**Follow-up filed**: #146 (NITs + landmark migration for `ProjectTabContent.tsx`)
**Decision**: D-20260419-042

---

## What landed

First §D (dashboard UI) leaf in this session — 12th subagent-driven leaf overall. Skeleton for the Coding AI Relay tab per `Docs/Plans/Part 6 UI Master Plan.md` §7.1 and `AI plans/phase-3-plan.md` §D.3.a.

### New files

- `dashboard/app/_components/coding/types.ts` — `HandoffMessage`, `HandoffThreadData`, `Filters`, `EMPTY_FILTERS`, `AgentName`, `ThreadStatus`.
- `dashboard/app/_components/coding/AgentBadge.tsx` — agent-colored pill (RooCode=blue, Copilot=orange, Claude=purple, unknown=gray).
- `dashboard/app/_components/coding/FilterBar.tsx` — 3 native `<select>`s (agent / taskType / status) + search input + conditional "🔴 Live" indicator.
- `dashboard/app/_components/coding/HandoffThread.tsx` — collapsible card; default collapsed when `status==='done'`, expanded otherwise; dual-mode controlled/uncontrolled via `expanded` + `onExpandedChange`.
- `dashboard/app/_components/coding/CodingTabContent.tsx` (`'use client'`) — composes FilterBar + filtered HandoffThread list; dual-mode controlled/uncontrolled via `filters` + `onFiltersChange`; filter predicate = agent/status strict-equality + case-insensitive substring on headline + all `message.text` (taskType a commented stub awaiting data-model extension).
- `dashboard/__tests__/coding-tab.test.tsx` — 12 Jest + @testing-library/react tests.

### Modified files

- `dashboard/app/projects/[projectId]/[tab]/ProjectTabContent.tsx` — added `MOCK_CODING_THREADS` (3 threads: handoff-1 RooCode/in_progress, handoff-2 Copilot/done, handoff-3 Claude/blocked); `tab==='coding'` branch now renders `<CodingTabContent threads={MOCK_CODING_THREADS} />`. Server component preserved (client boundary pushed down to `CodingTabContent`).

---

## Subagent-driven-development recap

1. **Implementer subagent** — wrote all 7 files RED→GREEN→REFACTOR per the Issue's AC list. Returned DONE_WITH_CONCERNS flagging that my Issue's estimate of "≥144 tests" was off (baseline confirmed 120 pre-change, so 132/132 post-change is the correct number).
2. **Spec compliance reviewer** — re-verified against Issue #145's 6 AC: all 6 met. Ran `npm test` (132/132), `npm run build` (green), `node dashboard/scripts/check-arch.js` (3/3 PASS), `node dashboard/scripts/check-guardrail-coverage.js` (exit 0). Baseline reconciliation confirmed via `git stash` diff.
3. **Code quality reviewer** — returned ✅ APPROVED WITH NITS:
   - 1 IMPORTANT: landmark-nesting in `CodingTabContent.tsx` (`<main>` inside `MainPanes`'s `<section role="region">` — ARIA forbids).
   - 3 NITs: redundant `as Filters` / `as boolean` casts; duplicate `<label>` + `aria-label` on FilterBar selects; `void within;` unused-import trick in test file.

---

## Tick actions after review

- **Inline fix (IMPORTANT)**: `CodingTabContent.tsx:85` `<main>` → `<section>` with 5-line inline comment explaining why the app-shell should own the single top-level `<main>` (WCAG 2.1 requires exactly one `<main>` per page). Re-ran `npm test` (132/132 still green) + `npm run build` (green) + arch/guardrail checks.
- **Deferred (NITs + parallel `<main>` in `ProjectTabContent.tsx`)**: filed consolidated follow-up Issue **#146** per the close-the-review-loop rule (precedents: D-036 closed §C.2's loop, D-038 closed §C.3's, D-041 closed §C.5.a's).

Convention deepened: **"NITs needing multiple files → follow-up Issue"** is now a stable 4-application pattern (D-036 / D-038 / D-041 / D-042).

---

## Acceptance-criteria walkthrough (Issue #145)

| AC | Met? | Evidence |
|----|------|----------|
| 1. Coding tab renders a FilterBar + a scrollable list of HandoffThread cards. | Yes | `CodingTabContent.tsx:84-107` + `coding-tab.test.tsx` "renders FilterBar + 3 threads" case. |
| 2. At least one thread renders per mock agent (RooCode / Copilot / Claude). | Yes | `ProjectTabContent.tsx` `MOCK_CODING_THREADS` constant; rendering verified in test suite. |
| 3. FilterBar filters the list by agent / status / search (taskType stubbed). | Yes | `matchesFilters` predicate + 4 filter-behavior tests. |
| 4. Empty state shows "No handoffs match the current filters." | Yes | `CodingTabContent.tsx:97-99` + empty-state test. |
| 5. `npm test` green; no regressions. | Yes | 132/132 (baseline 120 + 12 new). |
| 6. `npm run build` green; no typecheck regressions. | Yes | Verified by spec reviewer + post-landmark-fix re-run. |

---

## Checks run

- `cd dashboard && npm test` → 132/132 pass (12 suites).
- `cd dashboard && npm run build` → green.
- `node dashboard/scripts/check-arch.js` → 3/3 PASS (UI↚backbone, backbone↚UI, no-Docker).
- `node dashboard/scripts/check-guardrail-coverage.js` → exit 0 (no uncovered outbound calls).

---

## Next pick

Tier-2 cadence (780s) next wakeup. Candidates for next leaf, in priority order:

1. **§D.3.b inspector panel** — clicking a HandoffThread line opens a JSON payload in a side inspector. Natural continuation of the Coding-tab skeleton.
2. **#146 follow-up polish** — close-the-review-loop tick for §D.3.a (3 NITs + `<main>`→`<section>` migration + top-level `<main>` add).

Oldest-first within these: #146 was filed this tick so it's newer than any queued #D.3.b Issue — but we haven't yet filed an #D.3.b Issue, so decomposition of §D.3.b from the plan is itself the next step before the polish tick runs. Deferring the choice to next wakeup's orient pass.
