# DevLead MCP — Autonomous AI Programming Lead

A **pure intelligent orchestrator** that plans, delegates, reviews, and ships software projects autonomously. Local-first Node.js (no Docker), MCP-native, heartbeat-driven.

## Current status

- **Phase 1 MVP** ✓ complete — heartbeat.js, three-tab dashboard, SOUL.md
- **Phase 2** ✓ complete — preferences editor, smart agent-model mapping, one-task-at-a-time rule
- **Phase 3** in progress — cohesion checks, multi-project route shape, UI upgrade, heartbeat hardening
- **Phase 4** planned — PM2 supervision, GitHub Actions CI, one-command install

## How it works — at a glance

```
Designer intent (Docs/Plans/*.md)
           │
           ▼ decompose
     AI plans/*.md           ← Claude Code's long-term working plans
           │
           ▼ pick one
   GitHub Issues (backlog)   ← the visible to-do list
           │
           ▼ TDD
       Commit + PR + merge
           │
           ▼ record
   reports/run-*.md + decision-log.md
```

One atomic task per **heartbeat** (CLAUDE.md §3). The builder (Claude Code) runs this loop via `/loop` or scheduled triggers. The product runtime (`heartbeat.js`) will eventually run the same loop itself.

## Quick start (local dev, no Docker)

```bash
# 1) Dashboard — user's preferred dev command
cd dashboard
npm install
npm run dev
# → http://localhost:3000 (or 3001 if 3000 busy)
# routes: /                                 (legacy single-page dashboard)
#         /projects/devlead-mcp/coding      (new project-scoped routes, Phase 3 §B.1')
#         /projects/devlead-mcp/guidance
#         /projects/devlead-mcp/log

# 2) Heartbeat runtime (read-only tick logger for now — Phase 3 §C will harden it)
node heartbeat.js                 # one-shot
node heartbeat.js --watch          # loop with 60s interval
HEARTBEAT_INTERVAL_MS=30000 node heartbeat.js --watch
```

No Docker, no containers, no Python venv. Pure local Node 20+.

## Project layout

| Path | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **Start here** — autonomous-lead workflow, heartbeat rules, guardrails |
| [`SOUL.md`](SOUL.md) | System identity & guardrails (locked) |
| [`Docs/Plans/`](Docs/Plans/) | User's locked intent (Part 1..7) + [`Dev-Q&A.md`](Docs/Plans/Dev-Q&A.md) (only writable file there) |
| [`AI plans/`](AI%20plans/) | Claude Code's long-term detailed plans (main-plan, phase-3-plan, phase-4-plan, 5-area-planning-framework) |
| [`heartbeat.js`](heartbeat.js) | Product runtime — read-only tick logger (v1) |
| [`dashboard/`](dashboard/) | Next.js 15 App Router UI (React 19 RC, Tailwind) |
| [`lib/mcp-client.js`](lib/mcp-client.js) | MCP client layer |
| [`decision-log.md`](decision-log.md) | Append-only `D-YYYYMMDD-###` decisions |
| [`reports/run-*-summary.md`](reports/) | Per-heartbeat progress reports |
| [`architecture.md`](architecture.md) | Living architecture doc |
| [`memory.md`](memory.md) | Durable cross-run facts |

## Environment setup

- **MemPalace MCP server**: set `MEMPALACE_PALACE_PATH` to your local palace directory **before starting Claude Code / MCP server initialization**.
  - bash/zsh: `export MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"`
  - PowerShell: `$env:MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"`
- `.mcp.json` reads this value for the `mempalace` server `--palace` argument. If unset, MemPalace startup will fail.

## Architecture

See [architecture.md](architecture.md). High-level:

- **Lead orchestrator**: local Ollama (target: Qwen3.5-32B Q5_K_M) + hourly Grok escalation
- **Third-party coding agents**: delegation via MCP (Roo Code was primary; Claude Code is the current builder per 2026-04-17 user decision)
- **MCP layer**: filesystem, GitHub, code-exec, delegation tools, memory (MemPalace)
- **State**: local files today; SQLite per-project in Phase 4 (Q-006=C)
- **UI**: two-pane hybrid dashboard per D-20260419-005 — Operator-console pane (dense) + Living-document conversational pane (AI interaction)
- **Heartbeat**: one atomic task per tick, 14 stations, 5-gate auto-merge (CLAUDE.md §3 + SOUL)

## Contributing

This repo is authored autonomously by Claude Code per [`CLAUDE.md`](CLAUDE.md). Users answer design questions via [`Docs/Plans/Dev-Q&A.md`](Docs/Plans/Dev-Q&A.md) **or** via companion GitHub Issues labeled `type:question` + `status:needs-user`.

## License

MIT
