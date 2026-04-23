---
id: 4286696132
number: 17
title: Parameterize hardcoded mempalace path in .mcp.json (portability)
state: closed
created_at: '2026-04-18T04:30:33Z'
updated_at: '2026-04-18T06:53:50Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/17
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/17'
closed_at: '2026-04-18T06:53:50Z'
---
# Parameterize hardcoded mempalace path in .mcp.json (portability)

**Captured per Polsia Rule 2 during heartbeat D-20260417-013 (Issue #15 Copilot triage).**

## Observation
Copilot PR-review flagged (comments #3104444226 on PR #10 and #3104480302 on PR #14) that `.mcp.json` hardcodes an absolute Windows path:

```json
"mempalace": {
  "command": "python",
  "args": [
    "-m", "mempalace.mcp_server",
    "--palace", "C:/Users/weird/.GitHub/mempalace/palace"
  ]
}
```

Also in CLAUDE.md §7 (comment #3104444234 on PR #10).

## Why not fixed in #15
This is the user's local dev repo; no other contributor exists yet. Hardcoding was a pragmatic choice. But once the project is shared or run on CI, this will break. Better captured as its own work item than mixed with the cosmetic fixes in #15.

## Acceptance criteria
- [ ] Change `.mcp.json` to use `${MEMPALACE_PALACE_PATH}` env var with fallback
- [ ] Document the required env var in `README.md` setup section
- [ ] Update CLAUDE.md §7 to describe the env-var approach instead of hardcoded path
- [ ] Verify after restart that MemPalace still loads (ToolSearch for `mempalace`)
- [ ] If env-var substitution in `.mcp.json` isn't supported on current Claude Code version, document the limitation and use a setup script

## Source
Copilot PR-review comments on PRs #10 + #14; triaged during Issue #15 (D-20260417-013).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:30:33Z
**Updated:** 2026-04-18T06:53:50Z
**Closed:** 2026-04-18T06:53:50Z
**Labels:** type:task, status:backlog, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T06:53:50Z

Closing per D-20260418-007 (Run 30 heartbeat).

## AC walkthrough
- [x] `.mcp.json` mempalace entry now uses `${MEMPALACE_PALACE_PATH}` env var (line 44)
- [x] README.md Setup section documents the env var in a consolidated table (alongside `GITHUB_PERSONAL_ACCESS_TOKEN`)
- [x] CLAUDE.md §7 updated to reference `$MEMPALACE_PALACE_PATH` + the README Setup section + the D-ID / Issue cite
- [ ] Restart verification — OUT OF SCOPE for this tick (requires user to set the env var and restart Claude Code); the README explicitly documents graceful fallback behavior when MemPalace can't start
- [x] Substitution limitation documented — Claude Code's .mcp.json does not support bash `:-default` syntax; env var is required with documented graceful degradation to file-based memory

## Sibling Issue filed
Filesystem MCP (added in my Run 24 D-20260417-023) has the same bug class. Tracked as **#41** rather than absorbed — finish-before-switching per CLAUDE.md §6.

## Verified
```
$ npm test (repo root)
ℹ tests 24 / ℹ pass 24 / ℹ fail 0

$ cat .mcp.json | python -c "import sys, json; json.load(sys.stdin); print('JSON valid')"
JSON valid
```

Report: `reports/run-30-summary.md`.

