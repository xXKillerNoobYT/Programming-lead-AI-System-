---
id: 4286840236
number: 28
title: >-
  Phase 4 §A.1: PM2 ecosystem file + npm run start:pm2 — keep heartbeat.js alive
  across reboots
state: closed
created_at: '2026-04-18T05:19:56Z'
updated_at: '2026-04-18T10:05:34Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/28
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/28'
closed_at: '2026-04-18T10:05:34Z'
---
# Phase 4 §A.1: PM2 ecosystem file + npm run start:pm2 — keep heartbeat.js alive across reboots

Per `plans/phase-4-plan.md` §A.1 (D-20260417-022).

## Goal
`heartbeat.js` runs as a supervised daemon via PM2. Survives crashes (auto-restart), survives reboots (via PM2 startup hook), emits rotating logs. Baseline for §A.2–§A.4 (Windows / systemd / launchd get same behavior via OS-native means).

## Acceptance criteria
- [ ] `ops/pm2/ecosystem.config.js` exists with one app entry: `name: "devlead-heartbeat"`, `script: "heartbeat.js"`, `args: "--watch"`, `max_memory_restart: "512M"`, `log_date_format: "YYYY-MM-DD HH:mm:ss Z"`, `out_file: "logs/pm2-out.log"`, `error_file: "logs/pm2-err.log"`.
- [ ] `npm run start:pm2` → `pm2 start ops/pm2/ecosystem.config.js`; `npm run stop:pm2` → `pm2 stop devlead-heartbeat`; `npm run logs:pm2` → `pm2 logs devlead-heartbeat --lines 100`.
- [ ] `Docs/ops/PM2.md` — install (`npm install -g pm2`), startup hook (`pm2 startup` → generated command), save (`pm2 save`), uninstall.
- [ ] `logs/` is git-ignored; `logs/.gitkeep` checked in so the dir exists on clone.
- [ ] `pm2` is **not** added to `package.json` — PM2 is installed globally by the user (documented), not as a repo devDep. Avoids the "must use Docker" escalation pattern.
- [ ] Verified on at least one OS (Windows is fine): `pm2 start` → watch logs stream → `pm2 restart devlead-heartbeat` → tick reports continue into `reports/heartbeat-tick-*.md`. Capture the output in the run report.

## Dependencies
- `heartbeat.js` with `--watch` mode must work (D-20260417-015). ✓
- No dependency on CI (§B.1) or dotenv (§C.2) — can land independently.

## Notes
- This is the **foundation** for §A.2/§A.3/§A.4 (Windows Task Scheduler / systemd / launchd) but those are separate Issues.
- Do NOT ship a crash-loop detector here; that's §A.7.
- Do NOT ship structured JSON logging here; that's §D.1. PM2's plain-text logs are fine for v1.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T05:19:56Z
**Updated:** 2026-04-18T10:05:34Z
**Closed:** 2026-04-18T10:05:34Z
**Labels:** type:task, status:in-progress, phase:4, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T10:05:33Z

Closed per D-20260418-022 (Run 44). PM2 ecosystem + wrappers + docs shipped; config loads as valid JS; `npm test` stays 41/41. See `reports/run-44-summary.md`.

