---
id: 4286498057
number: 8
title: >-
  Write plans/phase-4-plan.md — decompose Phase 4 (production scale: PM2, CI,
  immutable deploys) into atomic subtasks
state: closed
created_at: '2026-04-18T03:16:20Z'
updated_at: '2026-04-18T05:22:38Z'
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
  - id: 10723653672
    name: 'phase:4'
    color: C5DEF5
    description: Phase 4 — production scale
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/8
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/8'
closed_at: '2026-04-18T05:22:38Z'
---
# Write plans/phase-4-plan.md — decompose Phase 4 (production scale: PM2, CI, immutable deploys) into atomic subtasks

**Planning task per heartbeat D-20260417-006 (Polsia Rule 3 — refill).**

## Goal
\`plans/main-plan.md\` §Roadmap describes Phase 4 as "Production scale (PM2, GitHub Actions, immutable deploys)" — too fuzzy to generate atomic Issues. Write \`plans/phase-4-plan.md\` so future heartbeats can pull atomic tasks out of it.

## Acceptance criteria
- [ ] Reconcile with user preference: **local Node.js only, no Docker** — so "immutable deploys" must be achieved without containers.
- [ ] Research: PM2 for heartbeat daemon, GitHub Actions for CI (lint/type/test on PR), Windows Task Scheduler or systemd alternatives.
- [ ] Draft \`plans/phase-4-plan.md\` with sections: Goals, Dependencies, Atomic subtasks, Success criteria, Open questions.
- [ ] Commit with a Decision ID.
- [ ] Open first 3 \`phase:4\` Issues from the plan (queue depth ≥ 3).

## Notes
Depends on Issue "Write plans/phase-3-plan.md" being further along (Phase 4 builds on Phase 3 output).

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T03:16:20Z
**Updated:** 2026-04-18T05:22:38Z
**Closed:** 2026-04-18T05:22:38Z
**Labels:** type:task, status:in-progress, phase:4, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T05:22:37Z

**Closed — all 5 AC items met per D-20260417-022 (Run 23).**

- [x] Reconciled with **no-Docker** preference: §1.3 Out-of-Scope explicitly bans Docker, Podman, Lima, devcontainers, and Nix-shells built on container primitives. §A uses PM2 + Windows Task Scheduler + systemd user units + launchd — all OS-native, no containers.
- [x] Research covered in §A (PM2, Task Scheduler, systemd user, launchd), §B (GitHub Actions + CodeQL), §D.2 (status endpoint), §G (budget enforcement).
- [x] Drafted `plans/phase-4-plan.md` with all required sections (Goals, Dependencies, 11 workstream subtasks, Success criteria, 10 Open Questions) + wave ordering (§6).
- [x] Committed with **D-20260417-022** (PR #29).
- [x] Opened first 3 `phase:4` Issues:
  - #26 §B.1 GitHub Actions CI workflow
  - #27 §C.2 `.env.example` + Node-20 dotenv loader (consumes #17)
  - #28 §A.1 PM2 ecosystem file + `npm run start:pm2`

See [`reports/run-23-summary.md`](../blob/run-22/phase-4-plan/reports/run-23-summary.md) for the full run report. Four D-ID collisions in three ticks captured as a pattern worth addressing.

