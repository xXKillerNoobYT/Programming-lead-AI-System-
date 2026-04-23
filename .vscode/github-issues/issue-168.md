---
id: 4296940350
number: 168
title: 'feat(dashboard): Phase 3 §D.3.e Coding-tab diff syntax highlighting via Shiki'
state: closed
created_at: '2026-04-20T15:49:07Z'
updated_at: '2026-04-20T19:21:00Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/168
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/168'
closed_at: '2026-04-20T19:21:00Z'
---
# feat(dashboard): Phase 3 §D.3.e Coding-tab diff syntax highlighting via Shiki

## Context

§D.3 Coding-tab backbone continuation. Per `Docs/Plans/Part 6 UI Master Plan.md` §7.1 line 245:
> "Diffs render inline with react-diff-view; large diffs collapse and offer 'open in VS Code' via `vscode://` URI."

§D.3.c (#154, D-20260420-002) shipped the `DiffBlock` with plain colored-line rendering. This leaf adds **syntax highlighting** to diff content so added/removed code reads at the language level (JS `if`, `function`, string literals, etc.), not just red/green.

Approach: use Shiki (not `react-diff-view`) because Shiki is framework-agnostic, produces static HTML, and has zero runtime deps in the browser. The `parseDiffLines` named export from D-20260420-002 gets its first caller.

Scope: syntax highlighting inside the existing `DiffBlock` renderer. Out of scope: VS Code `vscode://` jump-links (separate §D.3.f leaf), inline-diff character-level highlighting (e.g., intra-line diffing), multi-theme switching beyond the dashboard's current dark-mode-only state.

## Acceptance Criteria

### 1. Language detection

- [ ] Extend `DiffFile` type in `dashboard/app/_components/coding/types.ts` with optional `language?: string` (e.g., `'ts' | 'tsx' | 'js' | 'jsx' | 'py' | 'md' | 'json'`).
- [ ] In `DiffBlock.tsx`, if `diff.language` is absent, infer from `diff.path` extension via a small map. Default `"text"` (no highlighting) for unknown extensions.
- [ ] Update the 2 mock diffs in `ProjectTabContent.tsx` (`lib/guardrails.js` and `tests/guardrails.test.js`) to carry `language: 'js'` explicitly OR rely on the extension-inference path (which should resolve them to `'js'`).

### 2. Shiki integration

- [ ] Add `shiki` to `dashboard/package.json` devDependencies. Latest stable, version-pinned.
- [ ] Create a lazy singleton Shiki highlighter in `dashboard/app/_components/coding/shiki-highlighter.ts`:
  - Exports async `getHighlighter()` that returns a memoized Shiki instance.
  - Loads ONLY the languages used by DiffBlock (v1: `js`, `jsx`, `ts`, `tsx`, `py`, `md`, `json`, `bash`, `text`).
  - Theme: `github-dark` (matches dashboard dark-mode palette).
- [ ] `DiffBlock.tsx` uses the highlighter in a `useEffect` to populate state with highlighted HTML; falls back to the current plain-text renderer while loading.

### 3. Diff-aware line coloring

- [ ] The Shiki HTML colors tokens by language. The diff `+` / `-` / context classification must still apply as a BACKGROUND color (green-400/10 tint for added, red-400/10 tint for removed, none for context). Use Tailwind opacity notation `/10` or custom `data-line-kind` attribute + CSS selector.
- [ ] Hunk headers (`@@`) and file headers (`---`/`+++`) stay as the existing gray plain text — don't Shiki-highlight them.
- [ ] `parseDiffLines` from `DiffBlock.tsx` gets its first real external-ish caller: the highlighter applies Shiki to each line's text content, then the line-kind classification wraps the output.

### 4. Performance

- [ ] Shiki loads ONLY on demand (dynamic import, not top-level import). Bundle delta on `/projects/[projectId]/[tab]` should be < 50 kB (Shiki's core is ~40 kB minified + gzipped; per-language grammars add a few kB each).
- [ ] DiffBlock renders fallback plain-text immediately; highlighted HTML swaps in once `getHighlighter()` resolves. No loading spinner — silent progressive enhancement.

### 5. Tests (≥ 6 new)

- [ ] Extend `diff-block.test.tsx`:
  1. Language inferred from path extension (`.js` → `'js'`).
  2. Explicit `language` prop overrides extension inference.
  3. Unknown extension falls back to `"text"`.
  4. `+` / `-` line-kind backgrounds applied correctly (color classes).
  5. Hunk header + file header still render as plain gray (not Shiki-highlighted).
  6. `DiffBlock` renders SOMETHING (fallback) before Shiki resolves — don't block on async.
- [ ] Mock Shiki's `getHighlighter` in the test setup so tests don't hit the real highlighter (would slow tests + pull in all grammars).
- [ ] Dashboard count ≥ 178 (current 165 + 6 new + possible RelayFooter delta from §D.3.d).

### 6. Gates green

- [ ] `cd dashboard && npm test` — all green.
- [ ] `cd dashboard && npm run build` — green; bundle delta documented.
- [ ] `node dashboard/scripts/check-arch.js` — 3/3 PASS.
- [ ] `node dashboard/scripts/check-guardrail-coverage.js` — exit 0.

## Design notes

- Shiki over Prism/Highlight.js: modern, VSCode-native token-colorization, server+client compatible, tree-shakeable per language.
- Do NOT use `react-syntax-highlighter` — it wraps Prism and we'd double the bundle.
- `github-dark` theme only for v1; future light-mode support (when dashboard §D.6 adds it) swaps based on `prefers-color-scheme`.
- Keep the module narrowly focused: `shiki-highlighter.ts` exports `getHighlighter()` + `tokensToHtml(text, language)` helpers. DiffBlock stays presentational.
- Async Shiki + fallback + swap is the progressive-enhancement pattern — matches React SSR norms.

## Decision-log anchors

- Precedent: D-20260420-002 (DiffBlock skeleton with plain rendering), D-045 (explicit "no react-diff-view" v1 scope decision).
- Part 6 §7.1 line 245.
- Part 7 Linear Parity §A.5 (layouts — not blocking this leaf but syntax highlighting contributes to the "Linear-parity" visual bar).

## Links

- Parent epic: §D.3 Coding tab.
- Sibling leaves: §D.3.d RelayFooter (#167 — filed in same tick).
- Depends on: D-20260420-002 `parseDiffLines` named export + `DiffBlock` skeleton.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T15:49:07Z
**Updated:** 2026-04-20T19:21:00Z
**Closed:** 2026-04-20T19:21:00Z
**Labels:** type:task, status:in-progress, phase:3, priority:high
