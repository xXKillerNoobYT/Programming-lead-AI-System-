---
id: 4289946219
number: 105
title: >-
  Recurring bug-hunt /loop — audit closed-Issue UI work, file child Issues for
  regressions
state: open
created_at: '2026-04-19T04:52:53Z'
updated_at: '2026-04-20T07:25:28Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653173
    name: 'type:epic'
    color: '5319E7'
    description: Multi-issue epic
  - id: 10723653340
    name: 'status:in-progress'
    color: FBCA04
    description: Actively in work
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/105
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105'
---
# Recurring bug-hunt /loop — audit closed-Issue UI work, file child Issues for regressions

## Purpose (user directive 2026-04-19)

> "What I want is a bug Finder … hunt for bugs / things not working that [are] in issues that's on the branch that's closed … see if anything that supposed to have been done is broken. Testing new UI features. Full end-to-end of work that's been done. Keep your [own] notebook where things and then create child issues."

> "this is supoed to be a /loop that runs every houer to 3 houers as needed"

> "That way the current issue we ran into and others like it don't happen again"

> "I know this will slow down some other processes but it's important to get done right"

## Scope

This is a **recurring, self-paced QA heartbeat** that runs independently of the main programming-lead heartbeat (CLAUDE.md §3). Cadence: **1–3 hours**, self-paced via `ScheduleWakeup`. Each tick walks the dashboard end-to-end and files a **child Issue** under this parent for every real regression found.

## Per-tick checklist (v2, updated by #113)

1. **Orient** — read `reports/bug-hunt-notebook.md` (now tracked as of PR #111) + existing open children of this Issue. Skip duplicates.
2. **Delta** — `git log origin/main --since=<last-tick>` + `gh issue list --state closed --limit 20` to find what shipped since last tick.
3. **Boot probe (preview triangle, MIN check, every tick)** — `preview_start "dashboard"` (from `.claude/launch.json`), then curl-probe **multiple canonical routes**: at minimum `/`, one dynamic-route sample (e.g. `/projects/devlead-mcp/coding`), and one nav-target (e.g. `/projects/devlead-mcp/guidance`). Any non-2xx → file child Issue + skip expensive walk. Auto-discover new routes via `git log --since=<last-tick> --name-only | grep 'app/.*page.tsx'`. Root-cause: #113 — root-only probe misses per-route runtime errors.
4. **Targeted walk (Playwright, only when triggered)** — run ONLY when UI files changed since last tick OR a known-uncertain feature is in scope. For each feature: `browser_navigate` → `browser_snapshot` → `browser_console_messages(error)` → `browser_network_requests`. Compare vs. Issue's AC.
5. **File** — for each real bug:
   - Create with labels `type:bug`, `status:backlog`, `autonomous-lead`, `phase:meta`
   - Body: repro, observed, expected, link to originating Issue, screenshot/snapshot path
   - Attach as sub-issue of this parent via `gh api graphql addSubIssue`
6. **Record** — append dated `## YYYY-MM-DDTHH:MMZ` section to `reports/bug-hunt-notebook.md`, then commit via a narrow meta-PR (file is tracked as of PR #111).
7. **Reschedule** — `ScheduleWakeup`: **3600s** (1h) if bugs found or new commits; **10800s** (3h) if clean. `reason` must name the specific trigger. On 10800s reschedule, also run the opportunistic falsely-closed-Issue audit (see this Issue's 2026-04-19 policy comment for signatures).

## Quality-over-velocity rules

- **No fixes.** File only. Fixing happens on the main programming-lead heartbeat.
- **No duplicates.** Grep the notebook for fingerprint before filing.
- **Close stale children** if a bug is no longer reproducible (with a comment explaining).
- **Never skip the walk** because "nothing looks new." Silent drift is the exact threat model.
- **Budget 10 min/tick max.** Truncate + note deferred rather than blow budget.
- **Preview-triangle vs Playwright split** (D-20260419-019): triangle every tick (cheap), Playwright only when UI changed (expensive).

## Known patterns to check each tick

- Prerelease / RC version pins that violate peer ranges (root cause of #87)
- Missing peer/dev deps that surface as fresh-install failures (root cause of #86)
- Experimental Next.js flags that block `next build` (#101)
- Dual lockfiles at root + `dashboard/` (silent Next workspace-root confusion, #106)
- Local `main` divergence from `origin/main` from squash-merges (#107)
- Branch-name/content drift (e.g. bugfix branch absorbing feature work, #108)
- Notebook / loop-state loss across branch switches (#109, fixed by PR #111)
- **Stale `.next/` webpack cache after dep upgrade — HTTP 500 on dynamic routes (#112)**
- **Preview-triangle misses route errors — needs deep-route probe (#113)**

## Acceptance

This epic **does not close** while the loop is active. It's a living tracker. Close only when the user directs the QA loop to stop.

## Related

- #87 React-19-RC-peer-conflict — motivating example (fixed by PR #99/#103)
- #86 jest-environment-jsdom missing — bundled into React-19 fix
- #101 experimental reactCompiler flag blocks next build
- PR #111 — notebook + launch.json durability fix (D-20260419-019)
- D-20260419-019 — testing-tier split codified

Generated by Claude Code heartbeat per user directive on 2026-04-19.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T04:52:53Z
**Updated:** 2026-04-20T07:25:28Z
**Labels:** type:epic, status:in-progress, autonomous-lead, phase:meta, priority:medium

---

## Comments

### @xXKillerNoobYT - 2026-04-19T05:01:25Z

## Policy extension 2026-04-19: opportunistic falsely-closed-Issue audit

Per user directive *"Make sure that this also looks for falsely closed issues and reopens them as needed. Every now and then it's not a high priority thing to do but it is something that it's a good idea to check on."*

### Cadence

**Opportunistic, not fixed.** Piggy-backs on the loop's existing self-pacing signal: **any tick that would have rescheduled with the long 10800s (3h) delay** (= "main walk found nothing new") spends an extra ~2 minutes on a falsely-closed sweep. On busy 1h-cadence ticks, skip it.

This self-regulates: audit runs during quiet periods, stays out of the way during busy ones.

### Signatures of a falsely-closed Issue

Check the **5 most-recently-closed** Issues (not all of them — budget):

| # | Signature | How to detect |
|---|---|---|
| (a) | Closed with no merged PR | `gh issue view <n> --json closedBy,timelineItems` → closing event has no linked merged PR |
| (b) | Closed but AC unchecked | Issue body has `- [ ]` items not checked, OR closing comment lacks concrete evidence (test output, screenshot path, file:line) |
| (c) | Closed as "Run N complete" only | Closing decision-log entry is a `Run N complete` sweep and does not individually address the Issue's AC |
| (d) | Closed but feature regressed | Main walk on a prior tick observed a regression that maps back to this Issue's feature |

### Action when a signature hits

1. `gh issue reopen <n> --comment "<why — cite the signature + evidence>"` — this automatically re-applies `status:backlog`.
2. File a **new child Issue of #105** titled `False-close regression: <original title>` documenting (i) which signature fired, (ii) what evidence is missing, (iii) what AC needs to be re-verified.
3. Add a bullet to the current tick's `### Findings` section in [reports/bug-hunt-notebook.md](../blob/main/reports/bug-hunt-notebook.md) with FP prefix `FP: issue/false-close/<category>/#<n>` so future ticks can dedupe.

### Rationale

This is the inverse of CLAUDE.md §6's **Run-complete ↔ Issue-close pairing** rule. That rule prevents work from being orphaned (Run marked complete but Issue left open). This audit prevents the opposite: Issues closed too *eagerly* by a "Run N complete" decision entry when the individual AC wasn't actually addressed. Both failures have the same fingerprint in commit history — only an audit catches the second one.

### First audit

Scheduled to run on the first 10800s-reschedule tick (will likely be tick 2 or tick 3 depending on findings).

