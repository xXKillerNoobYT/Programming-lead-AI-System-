---
id: 4289950615
number: 107
title: Dual lockfiles at repo root + dashboard/ — Next.js infers wrong workspace root
state: open
created_at: '2026-04-19T04:55:50Z'
updated_at: '2026-04-20T07:25:30Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653140
    name: 'type:bug'
    color: D73A4A
    description: Bug to fix
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/107
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/107'
---
# Dual lockfiles at repo root + dashboard/ — Next.js infers wrong workspace root

**Parent**: #105 (recurring bug-hunt /loop)
**Fingerprint**: `FP: build/next-workspace-root/dual-lockfile`
**Surfaced by**: bug-hunt /loop tick 1 (2026-04-19) during React-19-stable verification

## Symptom

Running `npm test` or `npm run dev` in `dashboard/` prints:

```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of
C:\Users\weird\.GitHub\Programming-lead-AI-System-\package-lock.json as the root directory.
To silence this warning, set `outputFileTracingRoot` in your Next.js config, or
consider removing one of the lockfiles if it's not needed.
Detected additional lockfiles:
  * C:\Users\weird\.GitHub\Programming-lead-AI-System-\dashboard\package-lock.json
```

## Why this matters

Next.js uses the chosen workspace root for `outputFileTracing` (which bundles server-side files into the deployment). If Next picks the **wrong** root (repo root, which only has MCP SDK deps), output tracing will miss dashboard-specific files and production builds can fail at runtime in ways that don't show up in dev.

## Repro

```bash
cd dashboard && npm test 2>&1 | head -10
```

## Expected

Zero Next.js workspace-root warnings. Either:
- **A**: Remove the root-level `package-lock.json` (root has only `@modelcontextprotocol/sdk` — could be made dev-only or moved), OR
- **B**: Set `outputFileTracingRoot: __dirname` in `dashboard/next.config.mjs` to force the correct root.

## Hint

Option B is lower-risk (no effect on root's heartbeat scripts), just adds one line to `next.config.mjs`.

## AC

- [ ] No "multiple lockfiles" warning during `npm test` or `npm run dev`
- [ ] `next build` still succeeds
- [ ] `npm test` in `dashboard/` still green (17/17)

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T04:55:50Z
**Updated:** 2026-04-20T07:25:30Z
**Labels:** type:bug, status:backlog, autonomous-lead, phase:meta, priority:medium
