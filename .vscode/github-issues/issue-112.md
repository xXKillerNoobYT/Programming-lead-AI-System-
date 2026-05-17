---
id: 4290005247
number: 112
title: >-
  Stale `.next/` webpack cache causes HTTP 500 on /projects/[projectId]/[tab]
  after React 19 + zustand upgrade
state: open
created_at: '2026-04-19T05:26:26Z'
updated_at: '2026-04-20T07:25:31Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/112
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/112'
---
# Stale `.next/` webpack cache causes HTTP 500 on /projects/[projectId]/[tab] after React 19 + zustand upgrade

**Parent**: #105 (recurring bug-hunt /loop)
**Fingerprint**: `FP: dashboard/next-cache/stale-vendor-chunks-after-dep-upgrade`
**Surfaced by**: bug-hunt /loop tick 2 (2026-04-19) Playwright walk

## Symptom

Navigating to the canonical Issue #24 URL `http://localhost:3000/projects/devlead-mcp/coding` returns **HTTP 500 Internal Server Error**. Browser renders a Next.js runtime-error overlay.

Root error in server stderr:

```
Error: Cannot find module './vendor-chunks/next.js'
Require stack:
- dashboard\.next\server\webpack-runtime.js
- dashboard\.next\server\app\projects\[projectId]\[tab]\page.js
- dashboard\node_modules\next\dist\server\require.js
- dashboard\node_modules\next\dist\server\load-components.js
- dashboard\node_modules\next\dist\build\utils.js
- dashboard\node_modules\next\dist\server\dev\static-paths-worker.js
- dashboard\node_modules\next\dist\compiled\jest-worker\processChild.js
```

## Critical: HTTP / returns 200, HTTP /projects/<id>/<tab> returns 500

The preview triangle that tick 2 ran earlier (`curl http://localhost:3000` → HTTP 200 12611 bytes, `preview_logs --level error` → "No server errors found") **missed this bug** because the error is per-request, fires only when the `[projectId]/[tab]` route gets compiled, and that happens only when a client actually visits the deep URL. Root `/` served fine.

This explains why `npm test` (45/45 green) and `preview_start` (boots clean) both signaled GREEN while the canonical Issue #24 URL is broken. See companion Issue (being filed) proposing the preview triangle be extended with a deep-route probe.

## Why this matters

Issue #24's entire purpose was to make `/projects/<id>/<tab>` routes work. The feature is AC-complete in code (TopBar + LeftRail + MainPanes + Zustand WS store all landed per D-20260419-012/014/016/017) but **the URL doesn't serve** on a fresh `.next/` state that didn't get rebuilt after dependency changes. This is a silent degradation of shipped work.

## Probable cause

This is a **classic stale `.next/` cache** after a major dependency change. This repo has been bitten by it before — D-20260417-008 records resolving "PageNotFoundError on /_document" by deleting `.next/`. The current root cause is the same structure:

1. `.next/` was built against an earlier dependency tree (pre-React-19-stable, pre-zustand, possibly pre-shadcn).
2. Dep tree changed: React RC→^19.0.0 (PR #99/#103), zustand ^5.0.12 added (D-017), shadcn scaffolding in progress (untracked files visible in this session's git status: `dashboard/app/_components/ui/`, `dashboard/lib/utils.ts`, `dashboard/tailwind.config.ts`).
3. `.next/server/webpack-runtime.js` still references vendor chunks from the OLD tree.
4. Those chunks no longer exist on disk → `Cannot find module` → HTTP 500.

Next.js's incremental-rebuild logic is forgiving of small changes but not of whole dep-tree turnovers. The canonical fix is `rm -rf dashboard/.next/ && npm run dev` so webpack regenerates the chunk graph from scratch.

## Repro

```bash
cd dashboard
npm install   # or fresh clone + install
npm run dev   # boots fine, / returns 200

# In browser or curl:
curl -i http://localhost:3000/projects/devlead-mcp/coding
# → HTTP/1.1 500 Internal Server Error

# Check server logs → "Cannot find module './vendor-chunks/next.js'"
```

Reliably reproducible when `.next/` exists from a pre-upgrade build state.

## Proposed fix

Two tiers:

**Immediate** (next main-heartbeat tick):

```bash
rm -rf dashboard/.next/
cd dashboard && npm run dev   # or next build
```

Then re-navigate → should serve HTTP 200. Commit nothing — `.next/` is gitignored.

**Long-term** (prevent recurrence):

- **A.** Add a postinstall hook in `dashboard/package.json` that removes `.next/` when `node_modules/.package-lock.json`'s dep versions differ from the last-seen snapshot. Stops the drift at its source.
- **B.** Document the "blow away `.next/` after any dep upgrade" rule in `dashboard/README.md` and reference from CLAUDE.md §6 dev-loop tips.
- **C.** CI job that always does a fresh `rm -rf .next/ && next build` and fails if chunks are missing — catches this at PR time.

## AC

- [ ] `http://localhost:3000/projects/devlead-mcp/coding` returns HTTP 200 with TopBar + LeftRail + MainPanes rendered.
- [ ] At least one long-term prevention measure (A / B / C) adopted, or a conscious decision recorded to rely on developer discipline.
- [ ] bug-hunt /loop tick 3 (or whichever follows this fix) confirms via Playwright walk that the route serves 200 and no console errors.

## Related

- [#105](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105) — parent bug-hunt /loop
- #24 — the Issue whose canonical URL is currently broken by this bug
- D-20260417-008 — prior occurrence, same repo, fixed by deleting `.next/`
- Companion Issue being filed: preview triangle insufficient — must probe a deep route, not just `/`

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T05:26:26Z
**Updated:** 2026-04-20T07:25:31Z
**Labels:** type:bug, status:backlog, autonomous-lead, phase:meta, priority:medium
