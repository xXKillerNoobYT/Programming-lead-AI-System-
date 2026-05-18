# Contributing

This project is local-first and Node-based. Use this guide to get from a fresh clone to the dashboard and product heartbeat in about ten minutes.

## Prerequisites

- Git
- PowerShell 7+ on Windows
- Node.js 20+ and npm
- Access to the local planning vault and MemPalace paths used by this project

## Required Environment Variables

Set these before starting tools that read MCP config, planning docs, or durable memory. Keep machine-specific values in your shell profile or local `.env`; do not commit secrets or private local paths beyond templates.

PowerShell:
```powershell
$env:MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"
$env:PLANS_VAULT_PATH="$HOME\Obsidian\Programming-Lead-AI-System"
```

Optional local template:
```powershell
Copy-Item .env.example .env
notepad .env
```

Bash/zsh:
```bash
export MEMPALACE_PALACE_PATH="$HOME/.GitHub/mempalace/palace"
export PLANS_VAULT_PATH="$HOME/Obsidian/Programming-Lead-AI-System"
```

## First 10 Minutes

Run these commands from PowerShell unless a step says otherwise.

1. Clone and enter the repo.
```powershell
New-Item -ItemType Directory -Force "$HOME\GitHub" | Out-Null
Set-Location "$HOME\GitHub"
git clone https://github.com/xXKillerNoobYT/Programming-lead-AI-System-.git
Set-Location .\Programming-lead-AI-System-
```

2. Confirm Node and npm are available.
```powershell
node --version
npm --version
```

3. Install root dependencies for `heartbeat.js` and root tests.
```powershell
npm install
```

4. Install dashboard dependencies.
```powershell
Set-Location .\dashboard
npm install
```

5. Start the dashboard.
```powershell
npm run dev
```

Open `http://localhost:3000/projects/devlead-mcp/coding`. If Next.js picks another port, use the port printed in the terminal.

6. In a second PowerShell terminal, start the product heartbeat from the repo root.
```powershell
Set-Location "$HOME\GitHub\Programming-lead-AI-System-"
npm run heartbeat
```

Optional watch mode:
```powershell
npm run heartbeat:watch
```

## Quick Verification Checklist

- `Test-Path CONTRIBUTING.md` returns `True`.
- `$env:MEMPALACE_PALACE_PATH` and `$env:PLANS_VAULT_PATH` are populated in the shell that starts tooling.
- The dashboard route loads at `/projects/devlead-mcp/coding`.
- `npm run heartbeat` writes a tick report under `reports/` and exits without crashing.
- For doc-only changes, `rg -n "changed-heading-or-term" CONTRIBUTING.md README.md docs` is enough evidence when no runtime behavior changed.

## First Contribution Boundaries

- Work from one assigned issue at a time and keep the change scoped to that issue's acceptance criteria.
- Do not mix unrelated refactors, formatting churn, generated reports, or local environment files into an onboarding change.
- Prefer the smallest verification that proves the change: focused test output for code, route screenshot for UI, or `rg`/file-existence proof for documentation.
- In the issue or PR, map your evidence back to the acceptance criteria and name any unverified risk.

## Canonical Docs

- [README.md](README.md): project overview, runtime commands, environment setup, and current status.
- [CLAUDE.md](CLAUDE.md): operating workflow, heartbeat rules, guardrails, and contribution discipline.
- [architecture.md](architecture.md): current runtime architecture and near-term product direction.
- [docs/specs/wei-713-contributing-onboarding.md](docs/specs/wei-713-contributing-onboarding.md): accepted onboarding spec behind this guide.
