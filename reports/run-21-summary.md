# Run 21 Summary — MCP Client Layer Wired into heartbeat.js (D-20260417-020)

## Overview
**Task**: Issue #21 — Wire `heartbeat.js` to the MCP client layer so each tick can reach `.mcp.json`-declared servers and surface per-server status + live observations.
**Decision ID**: D-20260417-020 (D-015 through D-019 all claimed by parallel work on 2026-04-17).
**Status**: COMPLETE
**Trigger**: User directive "#21 then #7" at end of Run 17 handoff. #7 already closed in parallel (Run 18, D-017); this heartbeat is #21 only.
**Branch**: `run-17/phase-3-plan` (name inherited from a user-created branch; work here is `heartbeat.js` v1, not phase-3 planning — branch name is disposable).

## Outcome
`heartbeat.js` v1 now wires the MCP client layer. Each `node heartbeat.js` invocation:
1. Reads `.mcp.json`.
2. Connects to every declared stdio MCP server in parallel, with a 30s default timeout per server.
3. Carries the `{name → {status, client?, tools?, error?, reason?}}` map through the tick.
4. Probes MemPalace (`mempalace_search`) if connected, as a proof-of-concept live observation.
5. Includes a full **MCP Servers** block in the tick report with connected/failed/skipped counts + per-server detail.
6. Disconnects on shutdown (SIGINT handler in watch mode; inline cleanup in one-shot).

Per-server failures never abort the tick — critical for the heartbeat's eventual 24/7 autonomy.

## Changes
| File | Change |
|---|---|
| `package.json` | Added `@modelcontextprotocol/sdk@^1.29.0` as runtime dep. |
| `lib/mcp-client.js` | **New**, ~180 lines. Wraps `Client` + `StdioClientTransport`. Pure helpers (`loadMcpConfig`, `classifyTransport`, `summariseStatus`, `withTimeout`) + side-effectful wrappers (`connectStdioServer`, `connectServers`, `safeCallTool`, `disconnectAll`). Stdio-only in v1; `streamable-http` / `sse` / `ws` are classified but marked `skipped` with reason. Timeout via `MCP_CONNECT_TIMEOUT_MS` env (default 30_000 ms — measured npx cold-start on Windows > 10s). |
| `tests/mcp-client.test.js` | **New**, 17 tests / 6 suites. Uses `node:test` + `node:assert` — no additional test-framework deps. Tests don't spawn real servers; use pure functions and fake client stubs. |
| `heartbeat.js` | Upgraded to v1. `tick()` is now async. `main()` connects all MCP servers once at startup, passes `clientsByName` into each tick, disconnects on shutdown. Added `collectMcpObservations` (probes `mempalace_search` when connected) and `formatMcpBlock` pure helper. The 24 pre-existing tests in `heartbeat.test.js` still pass unchanged. |
| `reports/heartbeat-tick-2026-04-18T05-08-51-854Z.md` | First tick with MCP block (pre-timeout-bump): 0 connected / 5 failed (all stdio npx/python cold-starts exceeded the old 10s) / 1 skipped (microsoft-learn streamable-http). Demonstrates graceful degradation. |
| `reports/run-21-summary.md` | This file. |
| `decision-log.md` | D-20260417-020 entry. |

## Test Results (real, command-verified)
```
$ node --test tests/heartbeat.test.js tests/mcp-client.test.js
ℹ tests 41
ℹ suites 11
ℹ pass 41
ℹ fail 0
ℹ duration_ms 1673.5462
```
**41/41 pass** (24 heartbeat + 17 mcp-client).

## Heartbeat Run (real, command-verified)
```
$ node heartbeat.js
[heartbeat] connecting MCP servers from .mcp.json …
[heartbeat] 2026-04-18T05:08:51.854Z — run-17/phase-3-plan@9684642 — mcp 0c/5f/1s — wrote reports/heartbeat-tick-2026-04-18T05-08-51-854Z.md
[heartbeat] disconnecting MCP servers …
```

Tick report's MCP section:
```
## MCP Servers
- **Failed** (5): `sequentialthinking` (timeout…), `context7` (timeout…), `puppeteer` (timeout…), `memory` (timeout…), `mempalace` (timeout…)
- **Skipped** (1): `microsoft-learn` — unsupported transport: streamable-http
```

The 10s default was too tight for npx cold-start — bumped to 30s (`MCP_CONNECT_TIMEOUT_MS` override available for slower environments). The tick STILL succeeded and produced a valid report despite every server failing — which is the whole point of graceful degradation.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260417-020 | Wire `heartbeat.js` to MCP via `@modelcontextprotocol/sdk`; persistent per-process connections (not reconnect-per-tick); stdio-only in v1 (remote transports classified + skipped); 30s connect timeout default; probe `mempalace_search` as the first live MCP observation; record connected/failed/skipped in every tick report | Official SDK avoids re-implementing JSON-RPC 2.0 over stdio. Persistent connections avoid spawning npx/python children every 60s — measured overhead was seconds per spawn. Per-server graceful failure is table-stakes for 24/7 autonomy. Stdio-only matches #21 AC scope; remote transports deserve their own Issue. 30s timeout reflects measured Windows cold-start. MemPalace is CLAUDE.md §7's authoritative cross-run memory substrate — the right first probe target. | Hand-roll MCP protocol (risk + duplication); reconnect every tick (wasteful); fail whole tick on single-server fail (brittle); wire HTTP transport in v1 (doubles scope, violates #21 AC); skip the MemPalace probe (misses the AC item about migrating one read-path) |

## Metrics
- **Issues closed**: 1 (#21)
- **Issues opened**: 0
- **Open backlog after this run**: 9 (#8, #12, #13, #16, #17, #19 epic, #22, #23, #24)
- **Queue depth**: 9 (Polsia Rule 4 ≥3 ✓)
- **Commits this run**: 1
- **Tests**: 41 (24 heartbeat + 17 mcp-client)
- **New deps**: 1 runtime (`@modelcontextprotocol/sdk`)

## Gaps Captured (Polsia Rule 2)
None new — the residual concerns are all already captured:
- `streamable-http` transport support → implicit future Issue; not blocking today's work.
- MemPalace actually connecting → related to #17 (portability).
- Agent delegation, Grok escalation → future backbone Issues.

## Parallel-work reconciliation note
Between Run 17 (my D-015) and now, **four parallel decisions** landed:
- **D-015 backfill** (commit 982e25e, user-authored) — re-encoded my Run 17 heartbeat.js v0 work into the log.
- **D-016 Run 17** — closed #18 as duplicate of #20 (opposite of what I did in my Run 17 commit; both closures landed on GitHub and are consistent now).
- **D-017 Run 18** — delivered `plans/phase-3-plan.md`, closed #7, opened phase-3 wave-1 Issues #22/#23/#24.
- **D-018 Run 19** — codified multi-layer-decomposition via GitHub sub-issues (`addSubIssue` graphql mutation) into CLAUDE.md §3/§6.
- **D-019 Run 20** — established `Docs/Plans/Dev-Q&A.md` async question board; split CLAUDE.md §4 into sync `AskUserQuestion` (4a) and async file-based (4b).

All parallel decisions are complementary to this Run 21's MCP wiring — no conflicts. My D-20260417-020 picks up the next free slot.

## Next Task recommendation
Per the new D-018 multi-layer decomposition rule (leaves before parents) + backbone-bias + oldest-first:

| Issue | Type | Age | Leaf? | Backbone value |
|---|---|---|---|---|
| #8 | phase-4 plan | oldest | yes | planning |
| #12 | Dependabot | — | yes | security housekeeping |
| #13 | stale page.tsx | — | yes | housekeeping |
| #16 | stash triage | — | yes | housekeeping |
| #17 | mempalace portability | — | yes | **backbone QoL (would unblock today's MCP probes)** |
| #19 | UI epic | — | NO (has children #22/#24) | — |
| #22 | Phase-3 §A.1 check scripts | newer | yes | **cohesion = core** |
| #23 | Phase-3 §A.2 cohesion runner | — | yes | **cohesion = core** |
| #24 | Phase-3 §D.1 shell+routing | — | yes (child of #19) | UI |

**Recommended: #17** (mempalace portability). If fixed, the very next heartbeat's MCP probe should actually SUCCEED for MemPalace and start writing real live observations into tick reports — immediate verifiable dividend on today's work.
**Alternative: #22** (check scripts — start the cohesion framework phase-3-plan.md builds toward).

## Open Concerns (carried forward)
- MemPalace still timing out even at 30s — Python cold-start + palace indexing may genuinely be slow. #17 portability fix might incidentally help via env-var config; if not, bump timeout further or pre-warm.
- `streamable-http` transport not yet wired.
- Agent delegation not yet wired.
- The user-authored branch renames + parallel commits suggest someone else (or a different Claude session) is active on this repo. Coordination via Dev-Q&A.md (established in D-019 Run 20) is now the official channel.

## Heartbeat cadence
Self-paced. Next step awaiting user direction or default to backbone-bias pick #17.
