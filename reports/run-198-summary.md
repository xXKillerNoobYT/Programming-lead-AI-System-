# Run 198 — Issue #24 LeftRail leaf via TDD

**Date**: 2026-04-19
**Branch**: `issue-24/shell-routing`
**Decision IDs**: D-20260419-014

## Overview

Continued Issue #24 shell work. This tick: LeftRail component per Part 6 UI Master Plan §6 AC bullet 3 (64 px side rail with 6 entries). Strict TDD — 10 failing tests → minimal component → integrate → full suite green.

## Outcome

- **`app/_components/LeftRail.tsx`** — 64 px `w-16` aside, 6 entries (Coding / Guidance / Log / Prefs / SOUL / Help) with active-state (aria-current="page" + blue-600) and hover styling
- **Integrated into `ProjectTabContent`** below the TopBar so every `/projects/<id>/<tab>` route gets: TopBar (48 px) on top + [LeftRail (64 px) | main flex-1]
- **10 new tests**, **39/39 full suite green**
- **`npm run build` green**
- Restored `reports/run-196-summary.md` locally (external delete — file preserved on origin via 4a94e67)

## Commits
- `1337f73` feat(dashboard): LeftRail leaf + D-014 decision-log

## Changes
| File | Action |
|---|---|
| `dashboard/app/_components/LeftRail.tsx` | NEW |
| `dashboard/__tests__/left-rail.test.tsx` | NEW (10 tests) |
| `dashboard/app/projects/[projectId]/[tab]/ProjectTabContent.tsx` | layout: TopBar + [rail | main] |
| `decision-log.md` | +D-20260419-014 |

## Tests with output
```
npm test
Test Suites: 4 passed, 4 total
Tests:       39 passed, 39 total

npm run build
└ ƒ /projects/[projectId]/[tab]            123 B         102 kB
```

## Next
Remaining Issue #24 leaves:
1. **Two-pane layout split** — left pane (Operator, dense) + right pane (Conversational AI panel) per D-20260419-005 hybrid layout
2. **Zustand WebSocket store** (`dashboard/lib/ws-store.ts`) keyed by projectId + typed messages per Part 6 §6.2
3. **Mock in-process WS emitter** for tests until §E.5 ships the real `/ws` endpoint

After those: Issue #24 closes. PR #99 becomes the vehicle to merge all of it to main.

## Open concerns
- LeftRail meta entries (Prefs/SOUL/Help) point at nominal routes that don't exist yet. Clicking them 404s today. §D.6 (prefs) + §B.6 (soul editor) + onboarding flow will fill them in. Non-blocking for #24 AC since AC is about *rail existence*, not destination targets.
