---
id: 4289042998
number: 87
title: >-
  dashboard/package.json missing `overrides` for React-19-RC peer conflict —
  `npm install` fails without `--legacy-peer-deps`
state: closed
created_at: '2026-04-18T20:02:46Z'
updated_at: '2026-04-19T04:56:37Z'
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
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/87
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/87'
closed_at: '2026-04-19T04:56:37Z'
---
# dashboard/package.json missing `overrides` for React-19-RC peer conflict — `npm install` fails without `--legacy-peer-deps`

## Pattern observed
Captured during Run 29 (Issue #61 verification). On `main`, `cd dashboard && npm install` fails with:

```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error Could not resolve dependency:
npm error peer react@"^18.0.0 || ^19.0.0" from @testing-library/react@16.3.2
npm error Conflicting peer dependency: react@19.2.5
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
```

D-20260418-001 (Run 5) records that this was resolved in the past via `overrides` in `dashboard/package.json`, but the field is **not present** on `main` today — either it was never merged from its PR, was reverted, or drifted out during a later refactor.

As a temporary workaround, `.claude/scripts/session-prefetch.sh` now passes `--legacy-peer-deps` (PR for #61). That keeps heartbeats unblocked but leaves the manifest in a state where any non-instrumented `npm install` (user, CI, Copilot) still errors.

## Fix options
- **A.** Re-add the `overrides` field to `dashboard/package.json` — e.g.
  ```json
  "overrides": {
    "@testing-library/react": {
      "react": "$react",
      "react-dom": "$react-dom"
    }
  }
  ```
  Matches D-20260418-001's design.
- **B.** Bump `react`/`react-dom` off the `19.0.0-rc` tag to a stable release and let the peers satisfy naturally.
- **C.** Document `--legacy-peer-deps` as the official install recipe in README + CI. Weakest option — moves the cost to every consumer.

**Recommendation**: A (minimal diff, restores prior decision). Verify by removing `--legacy-peer-deps` from the prefetch script after the fix lands.

## Acceptance
- [ ] `dashboard/package.json` has working `overrides` block (or `react`/`react-dom` are on a stable version — Option B).
- [ ] `cd dashboard && rm -rf node_modules package-lock.json && npm install` (no `--legacy-peer-deps`) succeeds.
- [ ] `.claude/scripts/session-prefetch.sh` reverts to plain `npm install` for the dashboard path.
- [ ] Dashboard tests still pass.

## Pattern source
Captured by Run 29 heartbeat per CLAUDE.md §3 Step 4b (Polsia Rule 2 — mid-flight capture).

## Related
- #61 (SessionStart npm install — currently papers over this)
- #86 (dashboard `jest-environment-jsdom` missing — related but orthogonal)
- D-20260418-001 (original overrides decision — may need reaffirmation)


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T20:02:46Z
**Updated:** 2026-04-19T04:56:37Z
**Closed:** 2026-04-19T04:56:37Z
**Labels:** type:bug, status:in-progress, autonomous-lead, phase:meta

---

## Comments

### @xXKillerNoobYT - 2026-04-19T04:07:26Z

Picking this up in Run 198. Going with Option B (upgrade `react`/`react-dom` off the `19.0.0-rc-...` pin to stable `^19.0.0`) rather than Option A (`overrides` block) because:

1. React 19 stable released 2024-12-05 and Next 15.5.x is built to pair with it — the RC pin is stale drift, not an intentional constraint.
2. `overrides` hides the real issue; a stable React version is a proper fix.
3. `@types/react: ^18` in `package.json` line 24-25 is a latent second bug (type-mismatch vs React 19 runtime). Only Option B fixes both.

Also bumping `@types/react` / `@types/react-dom` → `^19` and `eslint-config-next` → `15.5.15` (to match `next@15.5.15`).

Working on bugfix branch off `main` since `beta` doesn't exist yet (filing a separate Issue for git-flow-lite branch setup). Will revert `--legacy-peer-deps` in `.claude/scripts/session-prefetch.sh` per AC3.

