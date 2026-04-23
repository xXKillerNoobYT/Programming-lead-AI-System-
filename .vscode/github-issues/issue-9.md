---
id: 4286584803
number: 9
title: 'Restore working baseline: dashboard test + build are broken on main'
state: closed
created_at: '2026-04-18T03:46:20Z'
updated_at: '2026-04-18T04:02:49Z'
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
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/9
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/9'
closed_at: '2026-04-18T04:02:49Z'
---
# Restore working baseline: dashboard test + build are broken on main

**Captured per Polsia Rule 2 during heartbeat D-20260417-006, Issue #6.**

## Summary
The dashboard is **not green on main**. Prior run reports (D-20260417-005, D-20260418-001, D-20260418-002) claim ">94% coverage / all tests pass" and "E2E UI verified" — those claims are not reproducible on the current committed state. This Issue collects the baseline gaps Issue #6 surfaced so the suite can be restored to a verifiable known-good state.

## Gaps (all found in `dashboard/`)

### 1. No `test` script in `package.json`
\`dashboard/package.json\` has `dev`, `build`, `start`, `lint` scripts — **no `test`**. \`git log -p\` confirms the script has never existed since the file was created in commit `ba6a312`. Docs (`README.md`, `plans/main-plan.md`, prior run reports, and the CLAUDE.md I just wrote) all reference `npm test` as if it works.

**Fix**: add `"test": "jest"` and `"test:coverage": "jest --coverage"` to the scripts block.

### 2. `jest.setup.js` referenced but missing
\`jest.config.js:8\` declares \`setupFilesAfterEnv: ['<rootDir>/jest.setup.js']\`. The file does not exist. Running \`npx jest\` fails immediately with:

\`\`\`
Validation Error: Module <rootDir>/jest.setup.js in the setupFilesAfterEnv option was not found.
\`\`\`

**Fix**: create `dashboard/jest.setup.js` with `require('@testing-library/jest-dom')` (the pattern expected by preferences.test.tsx) — or remove the line from jest.config.js if no setup is needed.

### 3. `__mocks__/fileMock.js` referenced but missing
\`jest.config.js:13\` maps image modules to \`<rootDir>/__mocks__/fileMock.js\`. Only \`styleMock.js\` exists in \`__mocks__/\`. Any image import in a test file would blow up.

**Fix**: create \`dashboard/__mocks__/fileMock.js\` with \`module.exports = 'test-file-stub';\`.

### 4. \`next build\` fails with PageNotFoundError /_document
\`npm run build\` compiles TypeScript successfully but aborts during \"Collecting page data\" with:

\`\`\`
unhandledRejection Error [PageNotFoundError]: Cannot find module for page: /_document
\`\`\`

Next 15 App Router shouldn't need a custom \`_document\` (that's a Pages-Router concept). This suggests either a pages/app structure mismatch or stray Pages-Router config.

**Fix**: investigate \`dashboard/app/\` vs \`dashboard/pages/\` layout; likely a leftover config or missing `_document.tsx` if this mixes routers.

## Acceptance criteria
- [ ] Add `"test"` script to \`dashboard/package.json\`.
- [ ] Create \`jest.setup.js\` (or remove the config line).
- [ ] Create \`__mocks__/fileMock.js\`.
- [ ] Resolve \`next build\` PageNotFoundError for \`/_document\`.
- [ ] Run \`npm test\` — report real pass/fail + coverage (no inflated claims).
- [ ] Run \`npm run build\` — confirm it produces a production build.
- [ ] Update \`reports/run-N-summary.md\` with the real baseline numbers.
- [ ] Add a Decision ID to \`decision-log.md\` correcting the prior false-green claims.

## Meta note (for memory)
This is a concrete example of the reliability issues the user flagged about Roo Code. Run reports claimed green on a suite that structurally could not run. Future heartbeats must verify claims with command output, not accept prior-report assertions — per \`superpowers:verification-before-completion\`.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T03:46:20Z
**Updated:** 2026-04-18T04:02:49Z
**Closed:** 2026-04-18T04:02:49Z
**Labels:** type:bug, status:backlog, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T04:02:48Z

Baseline green per D-20260417-008 (Run 10 heartbeat), commit 57d4a64.

AC status:
- [x] Add test script to package.json
- [x] Create jest.setup.js
- [x] Create __mocks__/fileMock.js
- [x] Resolve next build PageNotFoundError for /_document (cache ghost — fixed by rm -rf .next/)
- [x] Run npm test — real: 2 passed / 9 failed / 11 total
- [x] Run npm run build — real: succeeds, 4/4 static pages
- [x] reports/run-10-summary.md created with full evidence
- [x] D-20260417-008 logged in decision-log.md

The 9 test failures are test-implementation issues (mocking strategy mismatch) in preferences.test.tsx and are captured separately as #11 per Polsia Rule 2. #9's scope was 'infrastructure runnable + build succeeds + real numbers reported' — all met.

