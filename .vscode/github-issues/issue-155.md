---
id: 4292866504
number: 155
title: >-
  dashboard: `@testing-library/dom` missing from devDependencies — 8/13 suites
  fail on fresh install
state: closed
created_at: '2026-04-20T03:13:22Z'
updated_at: '2026-04-20T07:36:50Z'
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
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
  - id: 10739055639
    name: 'priority:urgent'
    color: B60205
    description: Blocks heartbeat or production; jump the queue
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/155
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/155'
closed_at: '2026-04-20T07:36:30Z'
---
# dashboard: `@testing-library/dom` missing from devDependencies — 8/13 suites fail on fresh install

## Pattern observed
Captured during Run 35 (Issue #152 verification) on this session's fresh install. `cd dashboard && npm test` produces 8 test-suite failures, all with the same root cause:

```
Cannot find module '@testing-library/dom' from 'node_modules/@testing-library/react/dist/pure.js'
```

Only 5 suites pass (the non-RTL ones); 67 tests pass total but any suite that imports `@testing-library/react` explodes.

## Root cause
`@testing-library/react@16+` declares `@testing-library/dom` as a **peer** dependency, not a runtime/transitive one. `dashboard/package.json` lists `@testing-library/react` and `@testing-library/jest-dom` but NOT `@testing-library/dom`. npm 10+ prunes peer deps it doesn't explicitly own, so a fresh `npm install` (e.g., from `session-prefetch.sh`) leaves `node_modules/@testing-library/dom/` uninstalled.

The earlier package-lock churn (removing `@testing-library/dom`'s `"peer": true` flag) was the prefetch run trying to reconcile this mismatch.

## Fix
```diff
   "devDependencies": {
     ...
     "@testing-library/jest-dom": "^6.9.1",
+    "@testing-library/dom": "^10.4.1",
     "@testing-library/react": "^16.3.0",
     ...
   }
```

Pin to the version already in the resolved tree (`10.4.1`). Then `npm install --legacy-peer-deps` to regenerate the lockfile.

## Acceptance
- [ ] `@testing-library/dom` appears in `dashboard/package.json` devDependencies.
- [ ] `dashboard/package-lock.json` records it as a direct dependency (not just a peer in the tree).
- [ ] Fresh `rm -rf dashboard/node_modules dashboard/package-lock.json && cd dashboard && npm install --legacy-peer-deps && npm test` completes without the "Cannot find module '@testing-library/dom'" error.

## Relationship to #86
Sibling bug — #86 is the same class of problem for `jest-environment-jsdom`. Same fix-shape (promote peer/transitive to explicit devDep). Consider closing both in one PR if scopes overlap.

## Pattern source
Captured by Run 35 heartbeat per CLAUDE.md §3 Step 4b (Polsia Rule 2 — mid-flight capture).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T03:13:22Z
**Updated:** 2026-04-20T07:36:50Z
**Closed:** 2026-04-20T07:36:30Z
**Labels:** type:bug, status:backlog, autonomous-lead, phase:meta, priority:urgent

---

## Comments

### @xXKillerNoobYT - 2026-04-20T07:36:50Z

Fixed inline by PR #156 (commit 9bf1bf7) — `@testing-library/dom ^10.4.1` now in `dashboard/package.json`; fresh `npm install` no longer breaks test suites. Closing.

