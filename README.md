# DevLead MCP – Autonomous AI Programming Lead

## Overview
Pure orchestrator for software projects. Delegates to 3rd-party agents (Roo Code primary). Local-first (Ollama 25GB + hourly Grok), MCP-native, OpenClaw-style heartbeat, three chat pages.

## Quick Start
1. `docker compose up` (Ollama + MCP servers + dashboard).
2. Upload plan to User Guidance Chat.
3. Watch Execution Log.

## Setup — Required Environment Variables

The MCP server definitions in `.mcp.json` reference environment variables so the repo is portable across machines. Before restarting Claude Code, set these in your shell or `.env`:

| Variable | Required for | Example (Windows) | Example (Linux/Mac) |
|---|---|---|---|
| `MEMPALACE_PALACE_PATH` | MemPalace MCP server (cross-run memory) | `C:/Users/<you>/.GitHub/mempalace/palace` | `~/.mempalace/palace` |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub MCP server (sub-issue graph, Issues/PRs) | A PAT with `repo` scope | Same |
| `FILESYSTEM_ROOT_PATH` | Filesystem MCP server root exposed to agents | `C:/Users/<you>/.GitHub/Programming-lead-AI-System-` | `/home/<you>/Programming-lead-AI-System-` |

If `MEMPALACE_PALACE_PATH` is unset, the MemPalace MCP server will fail to start — cross-run memory then falls back to `decision-log.md` + `memory.md` + `reports/*.md` per CLAUDE.md §7. Heartbeat will still work, just without MemPalace-backed context grounding.

Per D-20260418-007 (Issue #17). The previous hardcoded absolute Windows path broke portability for CI and any second contributor.

## Architecture
See [architecture.md](architecture.md).

## Master Plan
[plans/main-plan.md](plans/main-plan.md)

## License
MIT
