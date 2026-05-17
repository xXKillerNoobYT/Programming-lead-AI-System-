# Run 202 — Issue #24 MainPanes two-pane layout leaf via TDD

**Date**: 2026-04-19
**Branch**: `issue-24/shell-routing`
**Decision IDs**: D-20260419-016

## Overview

After Run 201 adopted the orphaned React 19 upgrade WIP on a different branch, this tick switched back to `issue-24/shell-routing` and landed the two-pane hybrid layout per D-20260419-005. Clean TDD cycle: 6 failing tests → minimal wrapper component → integrate → full suite green.

## Outcome

- **`app/_components/MainPanes.tsx`** — two-pane wrapper with `basis-2/3` + `basis-1/3` split, `role="region"` + aria labels for each pane
- **Integrated into `ProjectTabContent`** — layout is now: TopBar (48 px) + [LeftRail (64 px) | MainPanes (operator 2/3 + conversational 1/3)]
- **6 new tests**, **45/45 full suite green**
- **`npm run build` green**
- D-20260419-016 captures wrapper-isolation rationale

## Commits
- `f00d03e` feat(dashboard): MainPanes leaf + D-016

## Issue #24 progress
| AC bullet | Status |
|---|---|
| Routes /projects/<id>/<tab> | ✓ (Run 193) |
| Top bar (48 px, 6 stubs) | ✓ (Run 195) |
| Left rail (64 px, 6 icons) | ✓ (Run 198) |
| Tab content renders from URL | ✓ (Run 193) |
| Two-pane hybrid split | **✓ (this tick)** |
| Zero runtime errors on first render | ✓ (tests verify) |
| `npm test` + `npm run build` green | ✓ (45/45 + build) |
| WebSocket store (Zustand) | **remaining** |
| Visual Quality Bar pass | deferred (§D.2 shadcn first) |

Only the WebSocket store + mock emitter remain before #24 can close.

## Next tick
- TDD the Zustand store at `dashboard/lib/ws-store.ts`
- Mock in-process emitter (tests only — real `/ws` ships in §E.5)
- Issue #24 closes; PR #99 becomes mergeable final form

## Open concerns
- PR #103 (React 19 stable) and PR #99 (my shell work) are both MERGEABLE. #103 probably merges first since it's smaller + unblocks downstream; #99 rebases after. Waiting on user's merge call.
