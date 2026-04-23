---
id: 4289940647
number: 104
title: 'Phase 3 §D.2: Design tokens + shadcn install (Part 6 §4, §5.1)'
state: closed
created_at: '2026-04-19T04:49:21Z'
updated_at: '2026-04-19T05:31:08Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/104
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/104'
closed_at: '2026-04-19T05:31:08Z'
---
# Phase 3 §D.2: Design tokens + shadcn install (Part 6 §4, §5.1)

Per `AI plans/phase-3-plan.md` §D.2 and `Docs/Plans/Part 6 UI Master Plan.md` §4 (Design tokens) + §5.1 (shadcn baseline). Unblocked by #24 shell landing (waiting on PR #99 merge).

## Goal
Install shadcn/ui + configure Tailwind tokens so every new component inherits consistent design-system values.

## Acceptance criteria
- [ ] `dashboard/tailwind.config.ts` (or .js) extends the theme with Part 6 §4 tokens (colors, typography scale, spacing, motion curves).
- [ ] `npx shadcn@latest init` run; `components.json` committed.
- [ ] Base shadcn components installed: Button, Input, Label, Select, Switch, Slider, Dialog, DropdownMenu, Toast.
- [ ] `globals.css` imports the shadcn layer CSS variables.
- [ ] `npm test`, `npm run build`, `npm run dev` all green after install.
- [ ] Visual smoke: existing TopBar + LeftRail + MainPanes unaffected (no regressions).

## Dependencies
- PR #99 (Issue #24 shell) merged first — §D.2 builds on the TopBar/LeftRail/MainPanes primitives.
- PR #103 (React 19 stable) merged first OR this PR carries the same diff.

## Scope notes
- Do NOT rewrite TopBar/LeftRail/MainPanes to use shadcn primitives in this tick — that's §D.3-§D.5 (tab skeletons) territory. §D.2 is *install + config only* so primitives are available.
- Visual Quality Bar enforcement (§D.11) requires Storybook; that's a separate issue.

## Notes
Captured at end of Run 203 (D-20260419-017) when Issue #24 closed out its last AC bullet. Backlog refill per Polsia Rule 3.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T04:49:21Z
**Updated:** 2026-04-19T05:31:08Z
**Closed:** 2026-04-19T05:31:08Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-19T05:31:07Z

Phase 3 §D.2 complete — shipped via PR #114 (D-20260419-019). 61/61 tests green + build green. Scaffold ready for §D.3-§D.11 leaves to compose against.

