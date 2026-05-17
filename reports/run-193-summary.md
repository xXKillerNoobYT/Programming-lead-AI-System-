# Run 193 — Issue #24 first leaf via TDD (route scaffolding)

**Date**: 2026-04-19
**Branch**: `issue-24/shell-routing`
**Decision IDs**: D-20260419-010

## Overview

After Run 192 processed all 5 design-Q answers, #24 was fully unblocked. This tick executed the first leaf (route scaffolding) via strict TDD: RED → GREEN → REFACTOR. Five tests first, then minimal `ProjectTabContent` component, then `page.tsx` wrapper. All tests green; full build green after inline fix for a stale `reactCompiler` config flag.

## Outcome

- **New dynamic route** `/projects/[projectId]/[tab]` (Next 15 App Router)
- **`ProjectTabContent` component** in a sibling file (Next route-file export rules require this split)
- **5 new tests** covering each tab + project-id surfacing + unknown-tab fallback
- **22/22 full dashboard suite green** (no regressions)
- **`npm run build` green** after removing `experimental.reactCompiler: true` (Issue #101 captures)
- **D-20260419-010** appended to decision-log

## Commits
- `5f47627` feat(dashboard): Issue #24 leaf — scaffold project-scoped tab routes
- `9bed7b8` docs(decision): D-20260419-010

## Changes
| File | Action |
|---|---|
| `dashboard/__tests__/project-routes.test.tsx` | NEW (5 tests) |
| `dashboard/app/projects/[projectId]/[tab]/ProjectTabContent.tsx` | NEW (component) |
| `dashboard/app/projects/[projectId]/[tab]/page.tsx` | NEW (route wrapper) |
| `dashboard/next.config.mjs` | removed experimental.reactCompiler |
| `decision-log.md` | +D-010 |

## Tests with output
```
npm test
Test Suites: 2 passed, 2 total
Tests:       22 passed, 22 total

npm run build
Route (app)                                 Size  First Load JS
┌ ○ /                                    2.22 kB         104 kB
├ ○ /_not-found                            995 B         103 kB
└ ƒ /projects/[projectId]/[tab]            123 B         102 kB
```

## Next
Remaining Issue #24 sub-tasks (future leaves):
- Top bar (48 px) with 6 stubs
- Left rail (64 px) with 6 icons
- Two-pane layout (left operator + right conversational)
- Zustand WebSocket store + in-process mock emitter
- Delete dashboard/Dockerfile (no-Docker preference; Q-20260417-017 §5 #4)
- Update root app/page.tsx to redirect /projects/devlead-mcp/coding

## Open concerns
- PR #99 now mixes docs + code. Retitled to reflect. User may prefer split PRs going forward — flagging for next-tick decision.
- `dashboard/Dockerfile` still exists (no-Docker). Will delete in next leaf.
