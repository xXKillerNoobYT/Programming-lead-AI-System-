# DevLead MCP – Autonomous AI Programming Lead

## Overview
Pure orchestrator for software projects. Delegates to 3rd-party agents (Roo Code primary). Local-first (Ollama 25GB + hourly Grok), MCP-native, OpenClaw-style heartbeat, three chat pages.

## Quick Start
1. `docker compose up` (Ollama + MCP servers + dashboard).
2. Upload plan to User Guidance Chat.
3. Watch Execution Log.

## Architecture
See [architecture.md](architecture.md).

## Master Plan
[plans/main-plan.md](plans/main-plan.md)

## Environment setup
- For the MemPalace MCP server, set `MEMPALACE_PALACE_PATH` to your local palace directory **before starting Claude Code / MCP server initialization**.
- Example (bash/zsh): `export MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"`
- Example (PowerShell): `$env:MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"`
- `.mcp.json` reads this value for the `mempalace` server `--palace` argument. If unset, MemPalace startup will fail.

## License
MIT
