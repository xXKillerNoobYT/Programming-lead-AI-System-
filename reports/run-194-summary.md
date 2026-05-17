# Run 194 — README rewrite + Dockerfile delete

**Date**: 2026-04-19
**Branch**: `issue-24/shell-routing`
**Tick triggered by**: scheduled wakeup + user dev-server error paste + user directives ("update the readme proprly", "I do use a 3rd party computer for the LLM right now")

## Overview

User pasted a dev-server crash (`babel-plugin-react-compiler` missing) which is already fixed on this branch at commit `5f47627`; the crash means their 3rd-party LLM computer hasn't pulled my latest commits yet — a `git pull && rm -rf dashboard/.next && npm run dev` restart resolves it.

Tick focused on two user directives: (1) proper README rewrite, (2) dashboard Dockerfile deletion (Phase-3 §5 Open-Q #4 disposition long overdue).

## Outcome

- **README.md** rewritten from 24 → 83 lines reflecting current reality:
  - Phase 1/2 ✓, Phase 3 in progress, Phase 4 planned
  - Quick-start = `cd dashboard && npm install && npm run dev` (user's preferred command)
  - New `/projects/devlead-mcp/<tab>` routes documented
  - `AI plans/` folder (renamed from `plans/`) + 5-area-planning-framework reference
  - Two-pane hybrid UI direction (D-20260419-005)
  - Dev-Q&A + GH Issue dual-surface Q&A (D-20260418-033/039, reinforced Run 192)
- **`dashboard/Dockerfile` deleted** — Phase-3 §5 open-Q #4 disposition, no-Docker user preference
- **22/22 dashboard tests** green; **`npm run build`** green
- **3rd-party-computer sync note** — user's dev computer hasn't pulled; tell them to `git pull && rm -rf dashboard/.next` after my pushes

## Commits
- `1dd1e99` docs: rewrite README + delete dashboard/Dockerfile

## Next task recommendation

Still the core Issue #24 leaves:
1. Top bar (48 px) with project switcher + heartbeat indicator + pause + ⌘K + avatar
2. Left rail (64 px) with 6 icon entries
3. Two-pane layout split (operator | conversational)
4. Zustand WebSocket store + mock emitter
5. Maybe: root `/` redirect to `/projects/devlead-mcp/coding` (AC optional)

Also still pending:
- PR #99 user review + merge (it's CLEAN, MERGEABLE)
- Issue #100 branch-doc-sync after #99 merges

## Open concerns

- **3rd-party dev machine** needs fresh pulls to see my config fix. Documenting in this report so the next tick remembers.
- **README still mentions Ollama/Grok/Roo Code as aspirational** — those aren't yet implemented but are the target per main-plan. I kept them framed as "target" rather than removing; user may want stronger hedging.
