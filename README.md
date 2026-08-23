# DevLead MCP — Autonomous AI Programming Lead

A **pure intelligent orchestrator** that plans, delegates, reviews, and ships software projects autonomously. Local-first Node.js (no Docker), MCP-native, heartbeat-driven.

## Current status

- **Phase 1 MVP** ✓ complete — heartbeat.js, three-tab dashboard, SOUL.md
- **Phase 2** ✓ complete — preferences editor, smart agent-model mapping, one-task-at-a-time rule
- **Current model-routing policy** — GitHub Copilot desktop manages agent sessions; the root `AGENTS.md` assigns OpenAI models by capability, quality, affordability, and independent-review needs
- **Phase 3** in progress — cohesion checks, multi-project route shape, UI upgrade, heartbeat hardening
- **Phase 4** planned — PM2 supervision, GitHub Actions CI, one-command install

## How it works — at a glance

```
GitHub roadmap/product epics
           │
           ▼ native sub-issues
   Atomic GitHub leaf Issue
           │
           ▼ TDD
       Commit + PR + merge
           │
           ▼ record
   Issue comments/checks + reports/run-*.md
```

Plan mode produces an approval-ready plan without implementation. After approval, each app execution session handles one atomic Issue and stops. This harness has no `/loop`; recurring sessions use the GitHub Copilot app workflow system. The product's Overall Management heartbeat is a separate runtime concern.

## Quick start (local dev, no Docker)

```bash
# 1) Dashboard — user's preferred dev command
cd dashboard
npm ci --legacy-peer-deps
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
| [GitHub Issues](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues) | Active roadmap, questions, approvals, decisions, and tasks |
| [`.github/github-app.yml`](.github/github-app.yml) | Copilot app instructions, setup/test/run scripts, and automation |
| [`heartbeat.js`](heartbeat.js) | Product runtime — read-only tick logger (v1) |
| [`dashboard/`](dashboard/) | Next.js 15 App Router UI (React 19 RC, Tailwind) |
| [`lib/mcp-client.js`](lib/mcp-client.js) | MCP client layer |
| [`decision-log.md`](decision-log.md) | Read-only historical D-ID provenance |
| [`reports/run-*-summary.md`](reports/) | Per-heartbeat progress reports |
| [`architecture.md`](architecture.md) | Living architecture doc |
| [`memory.md`](memory.md) | Durable cross-run facts |

## Environment setup

- **MemPalace MCP server**: set `MEMPALACE_PALACE_PATH` to your local palace directory **before starting Claude Code / MCP server initialization**.
  - bash/zsh: `export MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"`
  - PowerShell: `$env:MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"`
- `.mcp.json` reads this value for the `mempalace` server `--palace` argument. If unset, MemPalace startup will fail.
- Repository planning requires GitHub access; historical vault paths are not active runtime configuration.

## Architecture

See [architecture.md](architecture.md). High-level:

- **Lead orchestrator**: local Ollama (target: Qwen3.5-32B Q5_K_M) + hourly Grok escalation
- **Third-party coding agents**: delegation via MCP (Roo Code was primary; Claude Code is the current builder per 2026-04-17 user decision)
- **MCP layer**: filesystem, GitHub, code-exec, delegation tools, memory (MemPalace)
- **State**: local files today; SQLite per-project in Phase 4 (Q-006=C)
- **UI**: two-pane hybrid dashboard per D-20260419-005 — Operator-console pane (dense) + Living-document conversational pane (AI interaction)
- **Heartbeat**: one atomic task per tick, 14 stations, 5-gate auto-merge (CLAUDE.md §3 + SOUL)

## Contributing

This repo is authored through plan-approved, one-Issue execution sessions per [`CLAUDE.md`](CLAUDE.md). Users answer design questions on GitHub Issues labeled `type:question` + `status:needs-user`.

## License

MIT
