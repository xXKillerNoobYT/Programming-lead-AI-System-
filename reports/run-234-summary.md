# Run 234 — §D.3.d Coding-tab RelayFooter + decision-log restoration (closes #167)

**Date**: 2026-04-20 (4th tick of the 3-hour cadence; overseer's Run 233 already consumed the name)
**Branch**: `issue-167/d3d-relay-footer` (off `origin/main` at `36a2de5`)
**Issue closed**: #167
**Issue filed (backlog refill)**: #168 (§D.3.e syntax highlighting, `priority:high`)
**Issue filed (follow-up)**: #169 (RelayFooter polish — Meta+Enter aria + trim contract + disabled prop)
**Decision**: D-20260420-005

---

## What landed

4th §D backbone-feature leaf this session (after #145 skeleton, #150 inspector, #154 diff rendering) + 19th subagent-driven leaf across sessions. **§D.3 Coding tab is now 4-of-5 leaves landed**; only §D.3.e syntax highlighting remains.

### New files

- `dashboard/app/_components/coding/RelayFooter.tsx` (`'use client'`, ~120 lines):
  - `<textarea>` + send `<button>` flex row.
  - Ctrl/Cmd + Enter submits; plain Enter inserts newline.
  - `value.trim().length === 0 || disabled` predicate.
  - After submit: clear + focus stays on textarea.
  - `sr-only <label>` for AT name; `aria-keyshortcuts="Control+Enter"` on button.
- `dashboard/__tests__/relay-footer.test.tsx` — 6 tests.

### Modified files

- `dashboard/app/_components/coding/HandoffThread.tsx` — status-gated RelayFooter render (only `in_progress`); `onRelaySend` prop plumbed; body wrapper now at `<div id="handoff-thread-body-{id}">` containing both `<ol>` + footer.
- `dashboard/app/_components/coding/CodingTabContent.tsx` — forwards `onRelaySend` prop to every HandoffThread.
- `dashboard/__tests__/coding-tab.test.tsx` — +1 integration test (all 4 statuses → exactly 1 footer).

### Tests

- **Tests 165 → 172** (+7: 6 unit + 1 integration).
- **Suites 14 → 15**.
- Bundle delta: 12.1 → 12.6 kB (+0.5 kB, well under 2 kB budget).

---

## Decision-log restoration (data-loss recovery)

**Incident**: commit `36a2de5` ("docs(agents): weekly self-update per D-20260420-004") by a parallel overseer session rewrote `decision-log.md` and deleted **~60 D-entries** spanning D-20260419-016 through D-20260420-003. The parallel session's commit message acknowledged "D-001/002/003 already used by parallel sessions; this tick uses D-004" but the diff shows `-52 +6` lines — they somehow truncated the file.

**What was lost from the file** (but preserved in git history):
- D-20260419-016 → D-20260419-041 (~26 entries covering all §C.2/C.3/C.4/C.5 backbone work).
- D-20260419-042 → D-20260419-045 (my §D.3.a skeleton + 2 polishes + §D.3.b inspector).
- D-20260420-001 (parallel session's Run 229 §D.3.b polish).
- D-20260420-002 (my Run 231 §D.3.c diff rendering).
- D-20260420-003 (my Run 232 §D.3.b a11y v2).

**Restoration action this tick**: `git show 6497bf7:decision-log.md > decision-log.md` restores to last-known-good (the commit just before `36a2de5`). Then appended:
- D-20260420-004 — preserves the parallel session's weekly-agent-update no-op entry (copied from the corrupted file).
- D-20260420-005 — my new §D.3.d RelayFooter entry (renumbered from D-004 to avoid collision).

**Final decision-log state**: 80 D-entries (was 78 at 6497bf7 + 2 new = 80). No data lost.

**Merge-impact note**: my PR is based on `36a2de5`, so the decision-log hunk in this PR's diff will read as "re-add lines the overseer's 36a2de5 deleted." GitHub's squash-merge handles this cleanly because the restored content is identical to what lived at 6497bf7 — git sees it as "undoing a delete," not a conflict.

**Follow-up**: Issue #161 (collision protocol) is now `priority:urgent` — this incident is the second time a parallel session caused data-loss, and the first time it was destructive rather than just duplicative. Worth escalating #161's AC to include "never commit decision-log.md rewrites to main without fetching first" as a hard rule.

---

## Subagent pipeline outcomes

| Stage | Verdict | Notes |
|-------|---------|-------|
| Implementer | **DONE** | No concerns. Inline `handleKeyDown` with `ctrlKey || metaKey`; synchronous focus-after-submit (no `flushSync` needed). |
| Spec compliance | **APPROVED_WITH_CONCERNS** | Minor: Cmd+Enter not separately tested + `disabled` prop not tested. Non-blocking. |
| Code quality | **APPROVED WITH NITS** (0 IMPORTANT, 0 inline fixes) | 4 NITs; reviewer explicitly recommended ONE consolidated follow-up for NITs 1-3. |

## Follow-up Issue #169

Consolidates 3 NITs at `priority:medium`:
1. `aria-keyshortcuts="Control+Enter"` should include `Meta+Enter` for Mac AT announcement symmetry (ARIA 1.2 space-separated format).
2. Decide `onSend(value)` vs `onSend(value.trim())` contract; document in JSDoc.
3. Either wire or remove the `disabled` prop (currently declared but no call site passes it — forward-looking stub).

NIT #4 (test 5's `fireEvent.keyDown(...) === true` is an indirect newline-preserved proof) captured in this report only — reviewer acknowledged the existing `expect(onSend).not.toHaveBeenCalled()` assertion is stronger; no action needed.

## Backlog refill this tick (Polsia Rule 3)

**Issue #168** filed decomposing §D.3.e syntax highlighting at `priority:high` so next tick has a pickable leaf. Scope: Shiki integration (lazy singleton) + language detection from DiffFile.path + progressive enhancement over the existing DiffBlock plain-text renderer. Per-language grammar load on-demand, <50 kB bundle delta budget.

## Final gates

- `cd dashboard && npm test` → 172/172 pass (15 suites).
- `cd dashboard && npm run build` → green; bundle +0.5 kB on dynamic route.
- `node dashboard/scripts/check-arch.js` → 3/3 PASS.
- `node dashboard/scripts/check-guardrail-coverage.js` → exit 0.

---

## Pattern milestones

- **§D.3 Coding tab is 4-of-5 landed**: skeleton (#145) → inspector (#150) → diff (#154) → relay footer (#167). Only §D.3.e syntax highlighting (#168) remains to complete the tab.
- **9th close-the-review-loop application** — pattern rock-solid.
- **First decision-log data-loss incident** — triggered by the overseer session's destructive rewrite. Restoration was mechanical (git history intact) but exposes a real protocol gap. Issue #161 should be escalated from `priority:urgent` observation to an actionable preventive AC.
- **First time a run report is N+1** of the D-ID (D-005 → Run 234) — because the overseer's D-004 already claimed Run 233. Numbering now diverges by exactly 1, and the run-report file naming wins (matches my D-005).

## Next pick

Next cron wake fires at next `:17` past the hour ≥ 3 hours from now. Priority distribution after this tick:

- 🔴 **2 urgent**: #158 (compliance-confirmed; auto-close 2026-04-27), #161 (collision protocol — **escalate AC scope based on today's incident**).
- 🟠 **1 high**: **#168 (§D.3.e syntax highlighting)** — freshly decomposed, ready-to-pick.
- 🟡 **11 medium** (+1 from #169 this tick).
- 🔵 **15 low**.

**Recommended next tick**: pick **#168 §D.3.e** — finishes the §D.3 Coding tab. After that, the natural next backbone is §D.4 (Guidance tab skeleton per Part 6 §7.2) — would need a new Issue decomposed.

Alternative if credit conservation pushes us toward smaller ticks: **#169 RelayFooter polish** (smaller scope than #168 Shiki integration which adds a dep).
