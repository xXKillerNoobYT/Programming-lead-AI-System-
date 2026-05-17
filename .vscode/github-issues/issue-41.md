---
id: 4287105597
number: 41
title: >-
  Parameterize hardcoded filesystem MCP path in .mcp.json (portability — sibling
  of #17)
state: closed
created_at: '2026-04-18T06:52:09Z'
updated_at: '2026-04-18T09:05:01Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/41
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/41'
closed_at: '2026-04-18T09:05:01Z'
---
# Parameterize hardcoded filesystem MCP path in .mcp.json (portability — sibling of #17)

**Captured per Polsia Rule 2 during heartbeat D-20260418-007 (Issue #17 mempalace-portability).**

Same bug class as #17. The `filesystem` MCP entry I added in D-20260417-023 (Run 24) has a hardcoded absolute Windows path:

```json
"filesystem": {
  "command": "npx",
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "C:/Users/weird/.GitHub/Programming-lead-AI-System-"
  ]
}
```

## AC
- [ ] Replace the path with `${WORKSPACE_DIR}` env var (or equivalent) in `.mcp.json`
- [ ] Document the required env var in README.md Setup table (same section the mempalace var landed in)
- [ ] If env-var substitution is unsupported for that argument position, fall back to a launcher script or document the limitation

## Why not fixed in #17
#17's AC specifically targets mempalace. Finish-before-switching kept this out of scope. Filing as a dedicated small Issue per CLAUDE.md §6 atomic rule.

## Source
Discovered while closing #17. Same Copilot-flagged portability pattern.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T06:52:09Z
**Updated:** 2026-04-18T09:05:01Z
**Closed:** 2026-04-18T09:05:01Z
**Labels:** type:task, status:in-progress, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T09:05:00Z

Closed per D-20260418-020 (Run 42). `.mcp.json` now references `${WORKSPACE_DIR}`; README Setup table updated. Last of the three Copilot portability fixes (mempalace D-007, github D-023, filesystem D-020).

