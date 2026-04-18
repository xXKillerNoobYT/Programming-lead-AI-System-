# DevLead MCP – Autonomous AI Programming Lead

## Overview
Pure orchestrator for software projects. Delegates to 3rd-party agents (Roo Code primary). Local-first (Ollama 25GB + hourly Grok), MCP-native, OpenClaw-style heartbeat, three chat pages.

## Quick Start
1. `docker compose up` (Ollama + MCP servers + dashboard).
2. Upload plan to User Guidance Chat.
3. Watch Execution Log.

## First-Time Setup (30 sec)

1. `git clone` the repo; `cd` into it.
2. `cp .env.example .env` — fill in `WORKSPACE_DIR`, `MEMPALACE_PALACE_PATH`, `GITHUB_PERSONAL_ACCESS_TOKEN`. See the table below for each.
3. `npm install` at repo root (heartbeat deps); `cd dashboard && npm install; cd ..` (dashboard deps).
4. Start Claude Code in the repo folder — `.mcp.json` auto-loads, MCP servers auto-start with the env vars you set.
5. `node heartbeat.js` (one-shot) or `node heartbeat.js --watch` (loop).

`.mcp.json.template` ships alongside `.mcp.json` as the authoritative template; `.mcp.json` itself is checked in with `${VAR}` placeholders already, so the live file and the template are the same shape today. A future `scripts/setup.js` (Phase 4 §C.1) will render one from the other per machine.

## Setup — Required Environment Variables

The MCP server definitions in `.mcp.json` reference environment variables so the repo is portable across machines. `heartbeat.js` auto-loads `.env` via Node 20+'s built-in `process.loadEnvFile()` — no `dotenv` package needed. Copy `.env.example` to `.env` and fill in real values before starting Claude Code:

| Variable | Required for | Example (Windows) | Example (Linux/Mac) |
|---|---|---|---|
| `MEMPALACE_PALACE_PATH` | MemPalace MCP server (cross-run memory) | `C:/Users/<you>/.GitHub/mempalace/palace` | `~/.mempalace/palace` |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub MCP server (sub-issue graph, Issues/PRs) | A PAT with `repo` scope | Same |
| `WORKSPACE_DIR` | Filesystem MCP server (repo-scoped file access) | Absolute path to your clone, e.g. `C:/Users/<you>/.GitHub/Programming-lead-AI-System-` | `$(pwd)` or absolute clone path |

If `MEMPALACE_PALACE_PATH` is unset, the MemPalace MCP server will fail to start — cross-run memory then falls back to `decision-log.md` + `memory.md` + `reports/*.md` per CLAUDE.md §7. Heartbeat will still work, just without MemPalace-backed context grounding.

If `WORKSPACE_DIR` is unset, the Filesystem MCP server refuses to start — set it to the absolute path of your clone. Per-user shell setup (examples):

- **bash/zsh**: `export WORKSPACE_DIR="$(pwd)"` from the repo root, or pin in `~/.bashrc` / `~/.zshrc`.
- **PowerShell**: `$env:WORKSPACE_DIR = (Get-Location).Path` or `setx WORKSPACE_DIR "C:\Users\<you>\.GitHub\Programming-lead-AI-System-"`.
- **`.env` (root of repo)**: `WORKSPACE_DIR=/abs/path/to/clone` — loaded by `process.loadEnvFile()` where Node 20+ is the host (Phase 4 §C.2).

Per D-20260418-007 (Issue #17) + D-20260418-020 (Issue #41). Hardcoded absolute paths break portability for CI and any second contributor.

## Architecture
See [architecture.md](architecture.md).

## Master Plan
[plans/main-plan.md](plans/main-plan.md)

## License
MIT