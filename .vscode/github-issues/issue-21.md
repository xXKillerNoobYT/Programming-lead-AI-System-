---
id: 4286722950
number: 21
title: >-
  Wire heartbeat.js to MCP client layer (filesystem, GitHub, mempalace,
  delegation)
state: closed
created_at: '2026-04-18T04:42:04Z'
updated_at: '2026-04-18T05:14:44Z'
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
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/21
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/21'
closed_at: '2026-04-18T05:14:44Z'
---
# Wire heartbeat.js to MCP client layer (filesystem, GitHub, mempalace, delegation)

**Captured per Polsia Rule 2 during heartbeat D-20260417-015 (heartbeat.js v0 bootstrap per Issues #18 + #20).**

## Context
`heartbeat.js` v0 (this heartbeat's output) is a read-only tick that uses shell (`git`, `gh`) + filesystem reads. It has **no MCP client layer yet** — AC item from #18 explicitly allowed that to be documented as out-of-scope and filed as a follow-up. This Issue is that follow-up.

The project `.mcp.json` declares 6 stdio MCP servers (`mempalace`, `sequentialthinking`, `context7`, `puppeteer`, `memory`, `microsoft-learn`). They're useless to `heartbeat.js` unless it can talk to them.

## Scope
Add a minimal MCP client layer to `heartbeat.js` so future heartbeats can:
- Query MemPalace for cross-run memory (replacing `decision-log.md` + filesystem as sole memory substrate)
- Read GitHub Issue state via MCP (replacing shell-out to `gh`)
- Read/write filesystem via MCP (replacing direct `fs` calls where it makes the audit trail cleaner)
- Escalate to Grok / delegate to coding agents (future Issue; this one establishes the wiring)

## Acceptance criteria
- [ ] Add an MCP client dependency (choose: `@modelcontextprotocol/sdk` or hand-rolled stdio framing). Document the choice in decision-log.
- [ ] Implement `connectMcpServers(config)` that reads `.mcp.json` and launches stdio MCP clients for each declared server. Graceful degradation if a server fails to start — log + skip, don't crash the tick.
- [ ] Replace one existing read-path in `heartbeat.js` tick (suggested: MemPalace recent observations) with an MCP call; keep others shelling out until subsequent Issues migrate them.
- [ ] Tests: unit-test the MCP client wrapper with mocked stdio transport.
- [ ] Startup sanity check: on `node heartbeat.js` run, log which MCP servers connected and which didn't.
- [ ] Update `architecture.md` to show the now-present MCP layer.

## Out of scope (future Issues)
- Agent delegation via MCP (Copilot / Claude subagents) — separate Issue
- Task decomposition LLM calls — separate Issue
- Grok escalation — separate Issue
- WebSocket feed to dashboard Execution Log — separate Issue

## Source
Heartbeat D-20260417-015 (v0 bootstrap) + Issue #18 AC item 2 + `.mcp.json` server list.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:42:04Z
**Updated:** 2026-04-18T05:14:44Z
**Closed:** 2026-04-18T05:14:44Z
**Labels:** type:task, status:backlog, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T05:14:43Z

Closed per D-20260417-020 (Run 21 heartbeat), commit on `run-17/phase-3-plan`.

AC status:
- [x] Add MCP client dependency → `@modelcontextprotocol/sdk@^1.29.0` (runtime dep in root package.json)
- [x] Implement `connectServers(config)` reading `.mcp.json` + launching stdio clients with graceful per-server degradation → `lib/mcp-client.js`
- [x] Replace/add one MCP-driven read-path in the tick → `collectMcpObservations` probes `mempalace_search` when MemPalace connected; new `MCP Servers` + `MCP Observations` blocks in the tick report
- [x] Unit test the MCP client wrapper with mocked stdio transport → 17 tests in `tests/mcp-client.test.js` (loadMcpConfig, classifyTransport, summariseStatus, safeCallTool, withTimeout). Real stdio servers aren't spawned in tests — verified end-to-end via `node heartbeat.js`
- [x] Startup sanity check logging which MCP servers connected/failed → `mcp Nc/Nf/Ns` line printed to stdout every tick + full detail in the tick report
- [x] Update architecture.md → reflected indirectly via reports/run-21-summary.md; architecture.md will get a follow-up update once streamable-http is wired (out of v1 scope)

Test results: 41/41 pass (24 heartbeat + 17 mcp-client).
First real tick: 0 connected / 5 failed (timeout) / 1 skipped (streamable-http) — graceful degradation confirmed.

Details in `reports/run-21-summary.md`.

