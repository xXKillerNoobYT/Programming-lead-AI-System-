# Run 232 — §D.3.b inspector a11y v2 polish (closes #159)

**Date**: 2026-04-20 (2nd tick of the 3-hour cadence)
**Branch**: `issue-159/inspector-a11y-v2` (off `origin/main`)
**Issue closed**: #159
**Follow-up filed**: #165 (strict-mode exhaustiveness + audit)
**Decision**: D-20260420-003
**Tick type**: polish leaf — 8th close-the-review-loop application

---

## What landed

### AC#A — re-announce on rapid Copy clicks

- New `copyNonce` `useState` counter; increments at the top of `handleCopy` (BEFORE the SSR guard, before any branching) so EVERY click bumps it.
- `<span role="status" key={copyNonce}>` triggers fresh DOM mount → polite live region re-announces text that previously coalesced.
- Works uniformly for success AND failure paths.

### AC#B — discriminated failure states

- `CopyStatus` split: `'idle' | 'copied' | 'failed-permission' | 'failed-unavailable'`.
- New `statusMessage()` helper centralizes wording:
  - `'copied'` → "Copied ✓"
  - `'failed-permission'` → "Copy failed — permission denied"
  - `'failed-unavailable'` → "Copy failed — clipboard unavailable"
- `flashStatus` parameter type widened to `Exclude<CopyStatus, 'idle'>` for type-domain cleanup.
- Em-dash `—` (U+2014) chosen over hyphen for tone consistency with `tab-titles.ts`.
- `/copy failed/i` regex still matches both new wordings → no existing test broken.

### Tests

- 162 → 165 (+3): test 29 re-mount via node-identity inequality; test 30 unavailable wording; test 31 permission wording.
- Suites stayed at 14.

---

## Subagent pipeline outcomes

| Stage | Verdict | Notes |
|-------|---------|-------|
| Implementer | **DONE** | No concerns. Used em-dash + `Exclude<CopyStatus, 'idle'>` consistently. Flagged interactive `npm run check:lint` as pre-existing repo-state, out of scope. |
| Spec compliance | **APPROVED** | All ACs met. Test quality "tight and focused." Verified existing 162 still pass + new 3 added cleanly. Noted scope had `.vscode` cache drift that should be excluded from commit (which I always do). |
| Code quality | **APPROVED WITH NITS** (0 IMPORTANT) | Caught a real correctness issue: implementer's claim that `statusMessage()` switch is type-enforced is FALSE because `dashboard/tsconfig.json` has `strict: false`. |

## Tick actions after review

**Inline fix (NIT #4)**: added explicit JSDoc warning to `statusMessage()` documenting the strict-mode gap, citing follow-up #165 + the explicit `default: const _exh: never = status; return _exh;` pattern as the future fix. Without this warning, the implementer's prior comment claiming switch-completeness would silently mislead future maintainers.

**Follow-up filed (NIT #1)**: **Issue #165** at `priority:medium` covers:
1. Tactical: add explicit `never`-exhaustiveness branch to `statusMessage()`.
2. Audit: grep all domain-narrowed switches in `dashboard/`.
3. Strategic: enable `strict: true` codebase-wide (potentially multi-leaf if error count is high).

This is the right scope for a follow-up because the AUDIT + strict-mode change is multi-file work that doesn't fit a polish leaf.

## Final gates (post-inline-fix)

- `cd dashboard && npm test` → 165/165 pass (14 suites).
- `cd dashboard && npm run build` → green; no bundle delta (state-machine refactor, no new deps).
- `node dashboard/scripts/check-arch.js` → 3/3 PASS.
- `node dashboard/scripts/check-guardrail-coverage.js` → exit 0.

---

## Pattern milestones

- **§D.3.b inspector story is FULLY CLOSED** across 3 leaves: #150 skeleton (D-045) → #152 polish (D-20260420-001) → #159 a11y v2 (D-20260420-003).
- **8th close-the-review-loop application** — pattern is fully rote; debt ledger flat across phases.
- **First reviewer-caught silent-correctness issue** of the session: `tsconfig strict: false` quietly disabled the exhaustiveness check the implementer thought they had. Code-quality reviewer's empirical verification (testing the pattern in both modes) caught it before merge. Worth dogfooding into a future `superpowers` skill: "type-system claims must be verified, not assumed."
- **Polish-tick discipline at 3-hour cadence** — delivered focused 2-AC polish in one tick rather than batch with the next backbone leaf. Avoids late-day triage churn.

## Next pick

Cron `5c736eb3` fires at next `:17` past the hour ≥ 3 hours from now. Priority distribution after this tick:

- 🔴 **2 urgent**: #158 (compliance-confirmed; auto-close 2026-04-27), #161 (collision protocol meta).
- 🟠 **0 high** — all priority:high backbone work is now CLOSED (was #154 + #159).
- 🟡 **10 medium** (was 9 — added #165 this tick): #19, #34, #64, #100, #105, #107, #112, #113, #157, #165.
- 🔵 **15 low**.

**Natural next picks** for the next 3-hour tick:
1. **§D.3.d / §D.3.e decomposition**: the §D.3 backbone has Coding-tab skeleton + inspector + diff rendering done. Next sub-leaves per Part 6 §7.1 are: relay-instruction footer textarea, empty-state illustration, syntax highlighting on diffs (where `parseDiffLines` named export gets its first caller). File these as Issues at `priority:high` to refill the high-priority queue.
2. OR pick from `priority:medium` oldest-first: #19 (EPIC dashboard upgrade) is the parent epic — leaves needed. #34 (heartbeat-pipeline EPIC) similar. #64 (stack drain EPIC) similar. #100 docs sync is a leaf.
3. **§D.4** (Guidance tab skeleton — Part 6 §7.2) is the next §D backbone area after §D.3 closes.

My recommendation for next tick: **decompose §D.3.d (relay-instruction footer) + file as Issue at `priority:high`, then pick it**. Keeps the §D.3 momentum until the Coding tab is complete.
