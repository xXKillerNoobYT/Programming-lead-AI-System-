# Architecture

## Current state (v1, as of D-20260417-020)

The only running program today is **`heartbeat.js` v1** — still a read-only tick loop, now with an MCP client layer that connects to servers declared in `.mcp.json`, reports connection health, and records a MemPalace observation probe in `reports/heartbeat-tick-*.md`. No LLM task delegation yet.

```
┌────────────────────────────────────────────────────────────────┐
│                      heartbeat.js v1 (Node.js)                 │
│                                                                │
│   one-shot mode: `node heartbeat.js`                           │
│   watch mode:    `node heartbeat.js --watch`                   │
│                  HEARTBEAT_INTERVAL_MS env, default 60_000     │
│                                                                │
│   per tick:                                                    │
│     • git branch + short SHA      (shell: git)                 │
│     • open Issue counts by label  (shell: gh issue list --json)│
│     • latest reports/run-*.md     (fs)                         │
│     • last 3 Decision IDs         (fs, parse decision-log.md)  │
│     • MCP server status summary   (mcp-client layer)           │
│     • MemPalace search probe      (mcp tool call)              │
│   ↓                                                            │
│   writes reports/heartbeat-tick-<ISO>.md                       │
└────────────────────────────────────────────────────────────────┘
```

Pure helpers (`parseGitState`, `parseIssueCounts`, `findLatestRunReport`,
`summariseRunReport`, `extractRecentDecisions`, `formatTickReport`) are
tested via `tests/heartbeat.test.js` using Node's built-in `node:test`
runner — zero test-framework dependencies at repo root.

Side-effectful wrappers (`readGitState`, `readIssueCounts`, etc.) shell out
to `git` and `gh` and read from the filesystem. All are null-safe; a
missing file or failing shell-out downgrades to a placeholder in the tick
report instead of crashing the loop.

### Components present today
| Component | Status | File |
|---|---|---|
| heartbeat.js v1 (read-only tick + MCP reporting) | working | `heartbeat.js` |
| Tick tests | 24 passing | `tests/heartbeat.test.js` |
| Dashboard (operator view, prototype) | working | `dashboard/app/page.tsx` |
| Dashboard preferences tests | 12/12 passing | `dashboard/__tests__/preferences.test.tsx` |
| Heartbeat legacy (Run-2 Roo-era stub) | preserved for history | `heartbeat.legacy.js` |

### Components the target diagram references but that are **not yet present**
- Lead orchestrator LLM (Ollama / Grok escalation)
- Full MCP orchestration (today only status + a minimal MemPalace probe are wired)
- 3rd-party agent delegation (GitHub Copilot / Claude Code subagents — never Roo Code per D-20260417-006)
- Shared state DB
- WebSocket feed from `heartbeat.js` → dashboard Execution Log tab
- Hourly Grok escalation

Each of these is a future atomic Issue off the core-backbone plan. See
`plans/main-plan.md` for phase-level grouping and GitHub Issues for the
current ready-to-go queue.

---

## Target high-level diagram (future state)

This is the shape the product is working toward. It is **not** what runs
today.

```mermaid
graph TD
    UI[Three-tab Next.js dashboard] -->|WebSocket| HB[heartbeat.js scheduler]
    HB --> MCP[MCP client layer]
    MCP --> FS[filesystem MCP]
    MCP --> GH[GitHub MCP]
    MCP --> MEM[MemPalace MCP]
    MCP --> DEL[agent-delegation MCP]
    DEL --> Agents[3rd-party coding agents: Copilot, Claude subagents]
    HB --> Grok[hourly Grok 4.1 Fast escalation]
    HB --> State[(shared state: Postgres/local JSON)]
```

### Components (target)
- **heartbeat.js**: planning/decomposition/delegation/review loop (Polsia
  5-rule cadence; currently v1 read-only tick + MCP status/observation reporting).
- **MCP layer**: gateway for all I/O — filesystem, GitHub, state, delegation.
  Today `.mcp.json` declares servers for `mempalace`, `sequentialthinking`,
  `context7`, `puppeteer`, `memory`, `microsoft-learn`, `github`, and
  `filesystem`. `heartbeat.js` currently reads server connectivity and performs
  a MemPalace probe; broader MCP orchestration is future work.
- **Memory**: MemPalace for cross-run observations; generic `memory` MCP as
  fallback.
- **Agents**: External coding-only — GitHub Copilot via hosted MCP and
  Claude Code subagents dispatched from this runtime. Roo Code is
  explicitly out of scope (D-20260417-006).
- **State**: Shared DB + cloud storage in Phase 3+; local filesystem reports
  for v0.
- **UI**: Three-tab Next.js dashboard for transparent monitoring (see
  `Docs/Plans/Part 6 UI Master Plan.md`; current prototype is a wireframe
  tracked in epic Issue #19).

Details in [`plans/main-plan.md`](plans/main-plan.md) and
[`Docs/Plans/`](Docs/Plans/) (Parts 1-6).
