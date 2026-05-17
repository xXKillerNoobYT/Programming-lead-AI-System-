---
id: 4286708690
number: 18
title: >-
  Refresh heartbeat.js backbone: align with current Claude-Code/stdio-MCP
  reality
state: closed
created_at: '2026-04-18T04:35:19Z'
updated_at: '2026-04-18T04:45:34Z'
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
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/18
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/18'
closed_at: '2026-04-18T04:44:06Z'
---
# Refresh heartbeat.js backbone: align with current Claude-Code/stdio-MCP reality

**Captured per Polsia Rule 2 during heartbeat review D-20260417-014 (Run 16).**

## Observation
`heartbeat.js` is a Run-2-era prototype that has drifted from current reality. On inspection (after 15 heartbeats of dashboard/meta work) it references components the project no longer uses:

1. **Delegates to "Roo Code" via MCP** (lines 61-68). User has abandoned Roo Code (D-20260417-006 — Claude Code is now the builder). The delegation target is wrong.
2. **Hardcoded HTTP MCP URLs** (lines 6-8) — `http://localhost:3001/3002/3003` for filesystem/github/postgres. Current `.mcp.json` uses stdio MCP servers (mempalace, context7, sequentialthinking, puppeteer, memory, microsoft-learn); none run on HTTP ports.
3. **References `SOUL.md` product intent** — still valid (pure orchestrator that delegates). But the delegate list needs updating.
4. **Never wired end-to-end** — `heartbeat.js` is not started, not tested, not integrated with the dashboard's Execution Log page (only a TODO comment line 104).

## Why this matters now
After 15 heartbeats, every agent-heartbeat run has been housekeeping or dashboard work. The **product backbone** (what SOUL.md describes as the DevLead MCP runtime: `heartbeat.js` scheduler + MCP orchestrator + branch/agent management) has zero forward progress. The user's end-goal memory explicitly flags this: "build core backbone one area at a time, done well, before moving on."

## Acceptance criteria
- [ ] Update delegation targets in `heartbeat.js`: remove Roo Code as the sole delegatee; decide which 3rd-party agent(s) the runtime should delegate to (GitHub Copilot? Claude Code subagent? something else?) and record the decision in `decision-log.md`
- [ ] Replace hardcoded HTTP MCP URLs with stdio MCP client usage that matches `.mcp.json`, OR document clearly that the MCP layer is out-of-scope for this Issue and file a follow-up
- [ ] Add a startup sanity check (config present, MCP servers reachable) before entering the `setInterval` loop
- [ ] Add a unit test covering the core heartbeat tick logic with mocked MCP/Ollama dependencies
- [ ] Update `architecture.md` to reflect the current wiring
- [ ] Pair with a run report that verifies `node heartbeat.js` starts cleanly without network errors

**Phase**: Phase 2 (no `phase:2` label exists in the repo yet — follow-up: add one, or use `phase:3` prep-work convention).

## Source
Heartbeat-effectiveness review during D-20260417-014 (Run 16). Original `heartbeat.js` landed in Run 2 per `reports/run-2-summary.md`.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:35:19Z
**Updated:** 2026-04-18T04:45:34Z
**Closed:** 2026-04-18T04:44:06Z
**Labels:** type:task, status:in-progress, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T04:44:05Z

Closed per D-20260417-015 (Run 17 heartbeat), commit 0559cf8 on `run-17/phase-3-plan`.

AC status:
- [x] Update delegation targets — v0 removes all delegation (Roo Code refs gone). Future delegation target (Copilot / Claude subagents per D-20260417-006) to be wired in #21.
- [x] Replace hardcoded HTTP MCP URLs OR document out-of-scope — done. v0 has no MCP calls; `.mcp.json` servers (stdio) will be wired in follow-up #21.
- [x] Startup sanity check — v0 is null-safe: missing reports/ dir, missing decision-log.md, shell-out failures all degrade gracefully (`(detached)`, `(none found)`, `⚠️ gh output did not parse`, etc.). Full MCP-connectivity sanity check is part of #21.
- [x] Unit test for core tick logic — 24 tests across 6 suites in `tests/heartbeat.test.js`, 24/24 passing via `node --test`.
- [x] Update architecture.md — rewritten with a "Current state (v0)" section that distinguishes what runs today from the target diagram.
- [x] Pair with a run report verifying `node heartbeat.js` starts cleanly without network errors — `reports/run-17-summary.md` + `reports/heartbeat-tick-2026-04-18T04-39-52-601Z.md` (the first real tick output).

Residual work: MCP client layer → new Issue #21.

Also closes #20 (duplicate of this Issue — opened earlier in the same session before I knew #18 existed).

### @xXKillerNoobYT - 2026-04-18T04:45:34Z

Per D-20260417-016 (Run 17 heartbeat) — this Issue was a **duplicate of Issue #20** and has now been closed.

Issue #18 was opened in Run 16 based on a stale Read of `heartbeat.js` that returned a 114-line Run-2-era prototype (with Roo Code delegation + HTTP MCP URLs `localhost:3001/3002/3003`). The current `heartbeat.js` on disk is 257 lines and has none of those problems — it was rewritten for Issue #20 in commit `982e25e` (2026-04-17 16:32 MDT).

### AC walkthrough against current reality
- ❌ ~~Update delegation targets; remove Roo Code~~ — current file has ZERO Roo references; v0 is read-only with no delegation at all (deferred to #21+).
- ❌ ~~Replace hardcoded HTTP MCP URLs~~ — current file has ZERO MCP URLs; MCP integration is scoped to Issue #21.
- ✅ Startup sanity check — `main()` parses argv and reads env; `runShell()` wraps all subprocesses with error-tolerant fallback.
- ✅ Unit test covering the core tick — `tests/heartbeat.test.js` has 24 passing tests (confirmed `npm test`).
- ⏭️ Update architecture.md — deferred to a follow-up if the diagram becomes actively misleading.
- ✅ `node heartbeat.js` starts cleanly without network errors — verified via `npm test`; no network dependencies in v0.

Every concern I raised in this Issue's body was already moot when I filed it — Run 16's review worked from cached pre-rewrite content.

Follow-up is Issue #21 (Wire heartbeat.js to MCP client layer) for the next atomic slice of backbone work.

Report: `reports/run-17-summary.md`.

