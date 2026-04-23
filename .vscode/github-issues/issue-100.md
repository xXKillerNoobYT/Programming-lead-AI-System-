---
id: 4289789458
number: 100
title: Sync documentation baseline across all open branches (D-20260419-005)
state: open
created_at: '2026-04-19T03:05:55Z'
updated_at: '2026-04-20T07:25:27Z'
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
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/100
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/100'
---
# Sync documentation baseline across all open branches (D-20260419-005)

Per user directive 2026-04-18: *"make sure to merge all the documentation and sync it between all the branches at the very minimum That way … you don't go working on a different branch and then carry off with a different set of instructions"*.

## Goal
Every currently-open branch must carry the same baseline documentation (`CLAUDE.md`, `SOUL.md`, `.claude/commands/heartbeat.md`, `.claude/agents/issue-triage-picker.md`, `.claude/loops/heartbeat/SOUL.md`, `.claude/loops/heartbeat/memory.md`, `AI plans/*.md`, `architecture.md`, `memory.md`) so that heartbeats on any branch follow the same set of instructions.

## Acceptance criteria
- [ ] After PR #99 merges, every open branch listed below has been rebased/merged against `main` to pick up the latest docs, OR closed if it's superseded.
- [ ] `CLAUDE.md §6` gains a rule: *"any PR touching operational docs must branch off latest `main`; any branch > N commits behind `main` on doc files must rebase before continuing."*
- [ ] A `scripts/verify-doc-sync.js` checker (or equivalent) reports the hash of each operational doc across `HEAD` of every open branch, flagging drift.

## Branches to sync (as of 2026-04-19)
- `issue-24/shell-routing` — current tick (source of the doc updates)
- `meta/q-002-stack-recovery` — 180+ accumulated tick commits, most drift
- `backup/sync-before-cleanup-20260417`
- `run-11/ui-master-plan` (pending close after #14 merge)
- `run-17/phase-3-plan`
- `run-22/phase-4-plan`
- `run-25/dependabot-triage` (pending close after #32 merge)
- `run-30/phase-3-check-scripts`
- `run-36/phase-3-cohesion-runner`
- `run-40/phase-4-ci-workflow`
- `run-41/dependabot-transitive-fix`
- `run-42/filesystem-mcp-portability`
- `run-43/phase-4-env-dotenv`
- `run-44/phase-4-pm2-ecosystem`
- `run-45/phase-3-coverage-floor`
- `run-46/phase-3-arch-lint`
- `run-48/stack-decision-qa`
- `run-9/red-baseline`

## Approach
1. Merge PR #99 first (brings `AI plans/` rename + 5-area framework + naming convention to `main`).
2. For each active branch that has unique work worth saving: rebase onto `main`, resolve conflicts, push.
3. For superseded branches: close the PR, delete the branch.
4. For the big `meta/q-002-stack-recovery` branch: cherry-pick the most-valuable commits into a fresh branch off `main`; close the meta branch.
5. Add the doc-sync check to `dashboard/scripts/cohesion-check.js` (Phase 3 §A.2).

## Notes
- This is the practical form of "one branch of reality" — user's concern is that divergent branch instructions led to the 7-month-behind-main drift.
- The `CLAUDE.md §6` rule + `scripts/verify-doc-sync.js` together institutionalize the sync so future drift gets caught automatically.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T03:05:55Z
**Updated:** 2026-04-20T07:25:27Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead, priority:medium

---

## Comments

### @xXKillerNoobYT - 2026-04-19T03:17:57Z

User re-emphasized this directive on Run 192: 'Rember to sync all the Doumintashion Files for all the branches that way they all have the same info at lest for your use and the Q&A'. Elevating priority. Plan stays the same:
1. Merge PR #99 → baseline docs on main
2. Rebase/close each of the 17 other open branches
3. Add a doc-sync check to cohesion-check.js (Phase 3 §A.2) so future drift trips CI
4. New CLAUDE.md §6 rule: any PR touching operational docs must branch off latest main; any branch > 5 commits behind main on those files must rebase before continuing

User has also now directed: every new Dev-Q&A posting MUST file a companion GH Issue with type:question + status:needs-user (CLAUDE.md §4b updated this tick, commit 204943c).

