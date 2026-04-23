---
id: 4290005692
number: 113
title: >-
  Bug-hunt /loop: preview triangle must probe a deep route, not just `/` (missed
  HTTP 500 regression)
state: open
created_at: '2026-04-19T05:26:47Z'
updated_at: '2026-04-20T07:25:33Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/113
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/113'
---
# Bug-hunt /loop: preview triangle must probe a deep route, not just `/` (missed HTTP 500 regression)

**Parent**: #105 (recurring bug-hunt /loop)
**Fingerprint**: `FP: loop/preview-triangle/root-only-probe-misses-route-errors`
**Surfaced by**: bug-hunt /loop tick 2 (2026-04-19) as a self-finding

## Symptom

Tick 2 ran the preview-triangle check per D-20260419-019:

- `preview_start "dashboard"` → boots OK on port 3000
- `curl http://localhost:3000` → **HTTP 200, 12611 bytes, 0.73s** ✓
- `preview_logs --level error` → **"No server errors found"** ✓

All three green. **But** the subsequent Playwright walk to the canonical Issue #24 URL `/projects/devlead-mcp/coding` immediately returned **HTTP 500** with `Cannot find module './vendor-chunks/next.js'` (filed as companion Issue).

## Why this matters

The preview triangle was supposed to be the MIN per-tick health check. If it misses a 500 on the canonical route of the most-recently-shipped feature, it's providing **false-green signal** — exactly the D-20260417-007 anti-pattern the repo has been explicitly disciplined against.

The root cause is architectural: the triangle only probes `/`, which in the Next.js App Router is `app/page.tsx` (home page). It never triggers compilation of the dynamic `app/projects/[projectId]/[tab]/page.tsx` route, so per-route runtime failures go undetected.

## Proposed fix

Extend the preview triangle's curl step to include **one canonical deep route per recently-touched feature area** (not all of them — that's Playwright's job). Candidates for this repo:

1. **Home** (`/`) — current check, keep.
2. **Canonical dynamic route** (`/projects/devlead-mcp/coding`) — smoke-tests the App Router dynamic segment + whatever components ship in the current shell.
3. **Canonical nav target** (`/projects/devlead-mcp/guidance` OR `/log`) — cheap additional probe that verifies LeftRail nav doesn't break.

Each HTTP probe is ~1s. Three probes = ~3s of additional budget per tick. Still well under the 10-min-per-tick cap and within the "cheap, every tick" tier.

## Update to #105 procedure

Replace the current step 3 ("Boot — `preview_start "dashboard"` … Hard-fail → file child Issue") with:

```
3. **Boot probe** — `preview_start "dashboard"`, then curl-probe N canonical routes (minimum: `/`, one dynamic-route sample, one nav-target). Any non-2xx → file child Issue + skip expensive walk.
```

And update D-20260419-019's testing-tier split to codify: preview-triangle = boot + **multi-route HTTP probe** (every tick), Playwright = targeted deep inspection (only when UI changed).

## Route-discovery heuristic

Each tick can auto-derive the "canonical deep route" by running once against `git log origin/main --since=<last-tick> --name-only | grep 'app/.*page.tsx'` — every new page file added since last tick is a candidate route. Curl-probe each. This is automatic, doesn't require the loop to know the UI shape ahead of time, and scales as the app grows.

## AC

- [ ] #105's per-tick checklist updated with multi-route probe step
- [ ] The notebook `reports/bug-hunt-notebook.md` tick template's `### Walked` section requires a `**Routes probed**:` line
- [ ] Tick 3 (or first tick after this Issue closes) demonstrates the multi-route probe catching the same class of HTTP 500 that tick 2 missed

## Related

- [#105](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105) — parent bug-hunt /loop
- Companion Issue (being filed): stale `.next/` cache → HTTP 500 on /projects/<id>/<tab>
- D-20260419-019 — codifies the preview-triangle; this Issue amends it
- D-20260417-007 — false-green anti-pattern this bug embodies

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T05:26:47Z
**Updated:** 2026-04-20T07:25:33Z
**Labels:** type:bug, status:backlog, autonomous-lead, phase:meta, priority:medium
