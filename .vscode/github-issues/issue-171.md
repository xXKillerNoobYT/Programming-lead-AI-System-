---
id: 4298078087
number: 171
title: >-
  fix(dashboard): §D.3.e DiffBlock — single-call Shiki highlighting to preserve
  multi-line token context (follow-up to #168)
state: closed
created_at: '2026-04-20T19:14:43Z'
updated_at: '2026-04-20T22:05:44Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653140
    name: 'type:bug'
    color: D73A4A
    description: Bug to fix
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/171
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/171'
closed_at: '2026-04-20T22:05:44Z'
---
# fix(dashboard): §D.3.e DiffBlock — single-call Shiki highlighting to preserve multi-line token context (follow-up to #168)

## Context

Follow-up leaf from Issue #168 (§D.3.e Shiki syntax highlighting). Code-quality reviewer on the PR flagged this as BLOCKING (needs-revision), but accepted a follow-up Issue linked from the PR body as the resolution path, per Polsia Rule 2 (capture beats fix).

**The problem**: `DiffBlock.tsx` calls `highlighter.codeToHtml(body, {...})` once **per content line** (inside a `useEffect` loop). TextMate grammars used by Shiki are stateful across lines — tokens like template literals, JSDoc block comments, Python triple-quoted strings, multi-line JSX attributes, and YAML block scalars rely on opening/closing markers on DIFFERENT lines to colorize correctly.

**Concrete failure mode** (TypeScript):
```ts
const msg = `hello
world`;
```
- In a diff, line 1 = `const msg = \`hello` and line 2 = `world\`;`.
- Called line-by-line:
  - Line 1 → Shiki sees unterminated template literal → "hello" colored as string (correct by luck).
  - Line 2 → Shiki sees `world\`;` as bare-identifier-then-backtick-then-semicolon → "world" NOT colored as string-content; the backtick looks like an operator.
- The diff renders syntactically wrong on ANY real multi-line JS/TS/Python diff.

**Why it wasn't caught in #168 tests**: the 6 new tests covered small single-line diffs (path + counts + plus/minus coloring + header exclusion). No test constructs a multi-line string literal or block comment that spans lines.

## Acceptance Criteria

### 1. Refactor `DiffBlock.tsx` useEffect to single-call + split pattern

- [ ] Change the per-line Shiki invocation loop at `DiffBlock.tsx:237-255` to:
  1. Collect the `body` of all non-hunk/non-file-header lines (in order) into a single `combinedCode` string joined by `\n`.
  2. Call `highlighter.codeToHtml(combinedCode, { lang, theme })` ONCE.
  3. Shiki v3 emits per-line `<span class="line">...</span>` wrappers (configurable via `transformers`). Parse those out OR split the resulting token stream by the emitted `\n` positions.
  4. Map each resulting line's HTML back to its source `parsedLines[i]` by index (the order is preserved).
- [ ] Preserve the existing behavior: hunk + file-header lines NEVER go through Shiki (early-return branch stays).
- [ ] Preserve `unwrapShikiHtml()` strip of the outer `<pre><code>` wrapper (applied once, not per-line now).

### 2. Add regression tests for multi-line tokens

- [ ] Extend `dashboard/__tests__/diff-block.test.tsx`:
  - Test: multi-line template literal — content lines `const msg = \`hello` then `world\`;` in the same hunk — assert the SECOND line's `world` gets string-token coloring (not identifier coloring).
  - Test: multi-line JSDoc block comment — lines `/**` then `* multi-line` then `*/` — assert all three lines render with comment-token classes.
  - Test: Python triple-quoted string spanning 3 lines.
  - Minimum 2 of the 3 above. One each from TypeScript and Python is best-coverage.

### 3. Gates
- `cd dashboard && npm test` — all green (should grow by 2-3 tests).
- `cd dashboard && npm run build` — green; bundle delta unchanged (no new Shiki features).
- `node dashboard/scripts/check-arch.js` — 3/3 PASS.

## Out of scope

- Syntax highlighting of hunk bodies themselves (still plain gray — separate design decision).
- Dark-mode theme swap (`github-dark` only for v1).
- Character-level intra-line diff highlighting (advanced feature).

## Implementation notes

- Shiki's v3 output for a multi-line input naturally contains `<span class="line">` wrappers per input line. The simplest split is on that class (e.g., a regex `/<span class="line">([\s\S]*?)<\/span>/g`). Alternatively, use Shiki's `transformers` option to emit stable line markers.
- The `combinedCode` approach restores TextMate grammar state across line boundaries, fixing template literals + block comments + multi-line strings in one move.

## Links

- Parent leaf: Issue #168 (closed via D-20260420-006 or next available).
- Code-quality review that flagged this: PR for #168 (will link after PR merges).
- Reference: Shiki docs on transformers — https://shiki.style/guide/transformers


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T19:14:43Z
**Updated:** 2026-04-20T22:05:44Z
**Closed:** 2026-04-20T22:05:44Z
**Labels:** type:bug, status:in-progress, phase:3, priority:high
