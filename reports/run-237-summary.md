# Run 237 — §D.3.e Shiki multi-line token fix (closes #171)

**Date**: 2026-04-20 (6th tick of the 3-hour cadence)
**Branch**: `issue-171/shiki-multiline-fix` (off `origin/main`)
**Issue closed**: #171
**Follow-up filed**: #178 (5 cosmetic NITs bundled at `priority:medium`)
**Decision**: D-20260420-008
**Tick type**: user-visible bug-fix (refactor of #168's Shiki integration to preserve grammar state across lines)

---

## What landed

Refactor of `DiffBlock.tsx` useEffect: per-line `highlighter.codeToHtml()` (N calls for N lines) → single-call-per-render (collect + combine + split). Fixes the UX bug from #168 where multi-line tokens (template literals, JSDoc blocks, Python triple-quoted strings) would color the second/third line WRONG.

### Key changes

- `eligibleBodies` collected in source order, joined with `\n` into `combinedCode`.
- `highlighter.codeToHtml(combinedCode, { lang, theme })` called ONCE per effect run.
- New `splitShikiLines(innerHtml, expectedCount): string[] | null` helper — pure, exported, returns `null` on count mismatch (defensive fallback to plain text).
- Blank bodies INCLUDED in combined code to preserve 1:1 positional mapping (previously skipped — would have shifted `eligibleIndices`).
- Hunk + file-header still early-return plain gray (never touch Shiki).

### Tests

- **T13** (TS template literal across 3 lines) — asserts single call + combined code + per-line mapping via mock's `data-line` attribute.
- **T14** (Python triple-quoted string, 3 lines).
- **T15** (JSDoc block comment).
- Mock harness restructured to emit Shiki v3 shape.
- All 12 pre-existing tests (T1-T12) pass unchanged.
- **Tests 178 → 181 (+3). Bundle +0.2 kB (13.3 → 13.5 kB).**

---

## Subagent pipeline outcomes

| Stage | Verdict | Notes |
|-------|---------|-------|
| Implementer | **DONE** | Clean refactor. New `splitShikiLines` exported as pure helper. |
| Spec compliance | **APPROVED** | Traced blank-body invariant; verified all T1-T12 assertion shapes survive the mock restructure. |
| Code quality | **APPROVED WITH NITS** (0 IMPORTANT, 0 inline fixes) | **Source-traced Shiki v3 internals** (`@shikijs/core/dist/index.mjs:1381-1423`) to prove the `split('\n')` contract is hard-coded in Shiki's AST builder, not merely observed behavior. |

## Deepest-depth review insight

The code-quality reviewer didn't just test against current Shiki behavior — they cracked open `node_modules/@shikijs/core/dist/index.mjs` and traced the source where Shiki pushes a literal `{ type: "text", value: "\n" }` AST node between each `<span class="line">`. That makes our `innerHtml.split('\n')` contract **Shiki-source-guaranteed**, not observational. They also cross-checked against JSDoc blocks, Python triple-quoted strings, Markdown fenced code, and JSX multi-line attributes — every case held.

This depth is the RIGHT review for a refactor that depends on a third-party library's output format. Captured in the decision-log as a precedent.

## Follow-up Issue #178

5 NITs at `priority:medium`:
1. Direct unit tests for `splitShikiLines` (currently indirect via DiffBlock).
2. Warn-path test for count-mismatch branch.
3. Docstring explaining `data-line` is mock-only, not real Shiki.
4. Simplify over-engineered `typeof console !== 'undefined'` gate.
5. Clarify or eliminate `useEffect` `react-hooks/exhaustive-deps` disable.

All cosmetic. No user-visible impact. Consolidated into one Issue per the D-044 / D-20260420-005 pattern.

---

## Final gates

- `cd dashboard && npm test` → 181/181 pass (15 suites).
- `cd dashboard && npm run build` → green; route 13.5 kB / 120 kB FLJ.
- `node dashboard/scripts/check-arch.js` → 3/3 PASS.
- `node dashboard/scripts/check-guardrail-coverage.js` → exit 0.

---

## Pattern milestones

- **Coding tab bug count: 0** — all known §D.3.a-e bugs now fixed. Last known bug from the Coding tab is now closed.
- **§D.3 fully stable**: 5 leaves landed + 1 follow-up bug fixed + 3 follow-up polish Issues queued (#159 closed, #169 still open, #178 filed this tick).
- **10th close-the-review-loop application** — pattern fully rote.
- **Source-trace depth of review** — first time a code-quality reviewer went into a dependency's source code to prove a contract. Worth codifying as a reviewer-discipline memory.
- **21st subagent-driven leaf** across sessions.

## Next natural pick

Cron `5c736eb3` fires at next `:17` past the hour ≥ 3 hours from now. Priority distribution after this tick:

- 🔴 **2 urgent**: #158 (compliance-confirmed; auto-close 2026-04-27), #161 (collision protocol meta).
- 🟠 **0 high** — #171 closed; empty queue.
- 🟡 **15 medium** (+#178 added this tick).
- 🔵 **15 low**.

**Recommendation for next tick**: decompose §D.4 Guidance tab skeleton per `Docs/Plans/Part 6 UI Master Plan.md` §7.2. File as new Issue at `priority:high` to refill the queue + pick it. §D.4 is the next natural backbone area after §D.3 completed.

Alternative if we want to consolidate polish first: **#169 RelayFooter polish** (still open at `priority:medium`) or **#165 tsconfig strict audit** (also `priority:medium`).

Natural cadence says: decompose §D.4 (new backbone) THIS tick's tail, then pick it in the next heartbeat — keeps the backbone-first rhythm going.
