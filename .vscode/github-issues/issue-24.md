---
id: 4286734818
number: 24
title: >-
  Phase 3 §D.1: Shell + routing (Part 6 §6) — top bar, left rail, project
  routes, WebSocket store
state: closed
created_at: '2026-04-18T04:46:25Z'
updated_at: '2026-04-19T04:58:06Z'
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
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/24
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/24'
closed_at: '2026-04-19T04:58:06Z'
---
# Phase 3 §D.1: Shell + routing (Part 6 §6) — top bar, left rail, project routes, WebSocket store

Per `plans/phase-3-plan.md` §D.1 and `Docs/Plans/Part 6 UI Master Plan.md` §3, §6 (D-20260417-015, D-20260417-009).

## Goal
Replace the single-page `dashboard/app/page.tsx` with a multi-route shell matching Part 6 §3 site map. This is the **foundation** for every subsequent UI Issue (§D.2 through §D.11).

## Acceptance criteria
- [ ] Routes exist at `/projects/<id>/coding`, `/projects/<id>/guidance`, `/projects/<id>/log` (Next 15 App Router group layout).
- [ ] Top bar (48 px) with: project switcher (stub OK for now), breadcrumb, heartbeat indicator (stub), pause button (stub), ⌘K command palette trigger (stub), avatar menu (stub).
- [ ] Left rail (64 px, collapsed-by-default, icons-only): Coding · Guidance · Log · Prefs · SOUL · Help.
- [ ] Main content renders the active tab from the URL — tab selection reflected in URL so deep-links survive reload (Part 6 §3.3).
- [ ] WebSocket store (Zustand) keyed by projectId at `dashboard/lib/ws-store.ts`; establishes a single `/ws` connection per project; typed `kind`s per Part 6 §6.2. For now, mock the server side with an in-process event emitter until §E.5 ships the real endpoint.
- [ ] Zero runtime errors on first render of each route.
- [ ] `npm test` and `npm run build` still green.
- [ ] Part 6 §4.5 Visual Quality Bar passes for the shell (spot-check both light and dark theme, focus ring on all top-bar buttons, keyboard nav between left-rail items).

## Dependencies
- Part 6 UI Master Plan (#14 / D-20260417-009) — currently open PR, assume merged before this Issue starts; if still open, that's a block per the Phase 3 plan §2.2.

## Notes
- `dashboard/Dockerfile` is still flagged (§5 open-Q #4). §D.1 is a good moment to delete it — capture as a trivial follow-up Issue if doing so expands scope.
- The existing preferences localStorage logic in `page.tsx` stays working; §D.6 migrates it out. Keep it compiling.
- Don't install shadcn components in this Issue — that's §D.2. Plain Tailwind / HTML is fine for the shell chrome.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T04:46:25Z
**Updated:** 2026-04-19T04:58:06Z
**Closed:** 2026-04-19T04:58:06Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-19T02:53:35Z

Picking up per user directive 'plan→ask→code' + D→B→C priority order. Starting on fresh branch off modernized main. Will implement via TDD + subagent-driven-development per user directive.

### @xXKillerNoobYT - 2026-04-19T03:06:46Z

Status update Run 191: pivoting from implementation → planning per user redirect. PR #99 opened with:
- `AI plans/` folder rename
- 5-area planning framework (D-20260419-003)
- 5 Qs posted in Dev-Q&A (Q-20260419-001..005)
- Naming convention for Part N files (D-20260419-004)

Issue #24 stays open for the shell+routing code work. Next tick picks up once user answers Q-20260419-001 (they've started — 'A with...'). If answer stalls, will proceed on recommendation A (Operator console).

### @xXKillerNoobYT - 2026-04-19T04:58:05Z

All 8 AC bullets satisfied; work landed on main via PR #99 (squash SHA 3b1372d) 2026-04-19. Decision IDs D-20260419-010 (routes) / -012 (TopBar) / -014 (LeftRail) / -016 (MainPanes) / -017 (Zustand WS store). Full dashboard suite 53/53 green, npm run build green, Parts 6 §§3/4.5/6 honored for layout + WebSocket contract.

