---
id: 4298959120
number: 178
title: >-
  chore(dashboard): §D.3.e Shiki single-call polish — splitShikiLines direct
  tests + warn-path + cleanup (follow-up to #171)
state: open
created_at: '2026-04-20T22:02:23Z'
updated_at: '2026-04-20T22:02:23Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/178
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/178'
---
# chore(dashboard): §D.3.e Shiki single-call polish — splitShikiLines direct tests + warn-path + cleanup (follow-up to #171)

## Context

Follow-up leaf from Issue #171 (§D.3.e Shiki multi-line token fix). Code-quality reviewer returned ✅ APPROVED WITH NITS (0 IMPORTANT, 0 inline fixes) with 5 cosmetic/test-quality items. This Issue consolidates them per the close-the-review-loop rule (10th application this session).

## Acceptance Criteria

### 1. Direct unit tests for `splitShikiLines`

- [ ] `splitShikiLines(innerHtml, expectedCount)` is currently exported from `DiffBlock.tsx` but tested only indirectly through DiffBlock. Add 3-4 direct unit tests feeding contrived inner-HTML strings at the function boundary:
  - Happy path: N `<span class="line">` chunks separated by N-1 `\n`s → N string output.
  - Count mismatch: N chunks when `expectedCount = N+1` → returns `null`.
  - Empty string input: `expectedCount === 0` → returns `[]` (short-circuit).
  - Malformed input (missing `<span class="line">` opener) → returns `null`.
- [ ] Add to `diff-block.test.tsx` under a new `describe('splitShikiLines')` block OR create `dashboard/__tests__/split-shiki-lines.test.tsx` if it's cleaner to separate.

### 2. Warn-path test for count mismatch

- [ ] Add a test that deliberately makes the mock return an unexpected chunk count (e.g., `N+1` chunks for `N` input lines), assert:
  - `splitShikiLines` returns `null`.
  - `DiffBlock` leaves `highlightedLines` empty so fallback plain-text renders.
  - `console.warn` was called with the expected/received counts message.
- [ ] Use `jest.spyOn(console, 'warn')` + `mockRestore` cleanup.

### 3. Docstring on `data-line` test coupling

- [ ] In `diff-block.test.tsx` T13 (or a comment block near the top of the new multi-line describe block), add a 2-3 line note documenting:
  - `data-line="..."` is a MOCK-ONLY convention, not a real Shiki feature.
  - The PRIMARY assertions (single Shiki call; combined code; correct `lang`) are what guard the bug.
  - `data-line` is a secondary diagnostic to prove per-line mapping from combined output.
- [ ] Prevents a future maintainer from thinking `data-line` is a real Shiki output attribute.

### 4. Simplify defensive `console.warn` gate

- [ ] `DiffBlock.tsx:313-316` wraps `console.warn` in `typeof console !== 'undefined' && typeof console.warn === 'function'` — unnecessary in a browser/jsdom React component. Replace with a plain `console.warn(...)` call.
- [ ] Verify all 181 tests still pass (should be unchanged).

### 5. Clarify `useEffect` dep-list `eslint-disable`

- [ ] `DiffBlock.tsx:342` disables `react-hooks/exhaustive-deps` because `parsedLines` is derived from `diff.patch`. Either:
  - Option A: expand the comment to explain WHY `parsedLines` is NOT in the deps but `diff.language` IS (both are derived from `diff` — the comment should preempt that puzzle).
  - Option B: refactor the deps to `[diff.patch, diff.path, diff.language]` (the canonical primitives that drive the effect) and drop the eslint-disable entirely.
- [ ] Recommended: Option B — cleaner and removes the disable.

## Out of scope

- Any grammar-engine-specific tests (Shiki's real tokenization is tested by Shiki's own suite, not ours).
- Refactoring `splitShikiLines` to be module-private — exported is fine, the follow-up just validates its contract.
- Adding more language grammars (9 already load; more = Phase 4+ decision).

## Verification

- `cd dashboard && npm test` — all green. Should grow by ~5-6 tests (3-4 unit + 1 warn-path + any for the dep refactor).
- `cd dashboard && npm run build` — green.
- `node dashboard/scripts/check-arch.js` — 3/3 PASS.

## Links

- Parent leaf: Issue #171 (closed via D-20260420-008).
- Review depth reference: reviewer traced Shiki v3 source at `node_modules/@shikijs/core/dist/index.mjs:1381-1423` to verify the `split('\n')` invariant is hard-coded, not observational.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T22:02:23Z
**Updated:** 2026-04-20T22:02:23Z
**Labels:** type:task, status:backlog, phase:3, priority:medium
