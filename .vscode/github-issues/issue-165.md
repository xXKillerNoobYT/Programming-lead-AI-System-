---
id: 4295858886
number: 165
title: >-
  chore(dashboard): exhaustive-switch defensive pattern + tsconfig strict-mode
  audit (follow-up to #159)
state: open
created_at: '2026-04-20T13:02:33Z'
updated_at: '2026-04-20T13:02:33Z'
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
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/165
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/165'
---
# chore(dashboard): exhaustive-switch defensive pattern + tsconfig strict-mode audit (follow-up to #159)

## Context

Code-quality review of PR for Issue #159 surfaced a real correctness gap: the dashboard's `tsconfig.json` has `strict: false`, which makes a common defensive pattern silently broken.

**Specific case** (`InspectorPanel.tsx` `statusMessage()` helper at lines 51-60): a switch over `Exclude<CopyStatus, 'idle'>` was claimed by the implementer to be type-enforced — i.e., adding a new `CopyStatus` variant would cause a TS compile error here.

That claim is **false in non-strict mode**. With `strict: false`:
- The function is annotated `: string` return type.
- A switch with no `default` and a missing case returns `undefined` at runtime.
- TS does NOT issue TS2366 ("Function lacks ending return statement") in non-strict mode.
- The error only fires under `strict: true` (or `noImplicitReturns: true`).

**Empirical verification by the code reviewer**: confirmed in this repo's `tsconfig.json:11`.

This means: any future heartbeat that adds a new `CopyStatus` variant without updating `statusMessage()` ships a silent runtime bug — the live region renders an empty string and assistive tech announces nothing.

The same pattern is likely lurking elsewhere in `dashboard/` (any "domain-narrowed switch returns string" function).

## Acceptance Criteria

### 1. Tactical fix: explicit `never`-exhaustiveness check in `statusMessage()`

- [ ] `dashboard/app/_components/coding/InspectorPanel.tsx:51-60` — add explicit default branch:
  ```ts
  default: {
      const _exhaustive: never = status;
      return _exhaustive;
  }
  ```
- [ ] Adding any new `CopyStatus` variant without updating the switch must cause `tsc --noEmit` to fail with `Type 'X' is not assignable to type 'never'`.

### 2. Audit: find other domain-narrowed switches in `dashboard/`

- [ ] `grep -rn "Exclude<\|switch (.*status)" dashboard/app/` — list every switch that returns a value over a discriminated union.
- [ ] For each, either (a) add the `never` exhaustiveness branch, or (b) document why it's safe (e.g., guarded by another mechanism).

### 3. Strategic fix: enable `strict: true` in tsconfig.json

- [ ] Change `dashboard/tsconfig.json` `strict: false` → `strict: true`.
- [ ] Run `npm run check:types` and triage the resulting errors.
- [ ] Many likely from `any`-leakage in dependencies; fix with explicit type annotations or targeted `as Foo` (NOT `as any`).
- [ ] If the error count is large (> 30), this AC may need to split into its own multi-leaf epic and AC #1 + #2 ship first as a tactical bridge.

### 4. Tests

- [ ] No new tests required — the type system is the test. After AC #3, `tsc --noEmit` running clean is the green gate.

## Out of scope

- Backbone (`lib/`) tsconfig — separate file, separate audit.
- Test file types (`__tests__/`) — strictness audit can defer.

## Verification

- `cd dashboard && npx tsc --noEmit` → exit 0.
- `cd dashboard && npm test` → all green.
- `cd dashboard && npm run build` → green.

## Links

- Triggered by: PR for #159 (D-20260420-003).
- Pattern reference: `InspectorPanel.tsx` `statusMessage()` JSDoc note.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T13:02:33Z
**Updated:** 2026-04-20T13:02:33Z
**Labels:** type:task, status:backlog, phase:meta, priority:medium
