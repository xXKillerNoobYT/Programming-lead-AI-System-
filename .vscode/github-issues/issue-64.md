---
id: 4288746132
number: 64
title: 'EPIC: Drain open PR stack — merge each open PR into main (per D-20260418-025)'
state: open
created_at: '2026-04-18T17:47:10Z'
updated_at: '2026-04-20T07:25:36Z'
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
  - id: 10728222117
    name: 'area:stack-recovery'
    color: FBCA04
    description: 15-PR conflict-stack recovery per D-20260418-025
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/64
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/64'
---
# EPIC: Drain open PR stack — merge each open PR into main (per D-20260418-025)

## Goal

Per user directive 2026-04-18: *"Make sure that we have a github Issues for merging each and every single branch"* — one tracking Issue per open PR, each closed as the user merges the PR.

## Recovery path (per D-20260418-025 Option A)

For each open PR (15 CONFLICTING + 2 clean = 17 PRs), the user opens the PR's conflicts URL, resolves additive conflicts (keep both sides of any `<<<<<<<`/`=======`/`>>>>>>>` block), squash-merges, and deletes the branch.

Conflict class is ~100% additive — each PR appends distinct rows to `decision-log.md` and/or distinct files in `reports/`.

## Sub-issues (one per open PR)

Children are listed in creation order as they're opened; link via GitHub's native sub-issue graph (`addSubIssue` GraphQL). The parent closes automatically when all children close.

## Acceptance

- All open PRs either merged or explicitly closed-without-merge
- All sub-Issues closed
- Main is clean and ready for `beta` creation (first post-drain tick)

## Related

- `D-20260418-025` — Q-002 Option-A click-through plan
- `D-20260418-026` + `D-20260418-030` — git-flow-lite branching + one-in-dev cap
- `reports/run-49-summary.md` — detailed click-through instructions per PR

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T17:47:10Z
**Updated:** 2026-04-20T07:25:36Z
**Labels:** type:epic, status:in-progress, autonomous-lead, area:stack-recovery, priority:medium

---

## Comments

### @xXKillerNoobYT - 2026-04-18T19:34:39Z

## Stack-drain progress update (D-20260418-047)

**Copilot resolved 8 of 17 PRs to MERGEABLE** (per user's parallel `@copilot` trigger on all branches):

| Tracker | PR | Branch | State |
|---|---|---|---|
| #66 | #14 | run-11/ui-master-plan | **✅ MERGEABLE** — ready to squash-merge |
| #67 | #25 | run-17/phase-3-plan | **✅ MERGEABLE** |
| #69 | #32 | run-25/dependabot-triage | **✅ MERGEABLE** |
| #70 | #43 | run-30/phase-3-check-scripts | **✅ MERGEABLE** |
| #73 | #48 | run-41/dependabot-transitive-fix | **✅ MERGEABLE** |
| #74 | #49 | run-42/filesystem-mcp-portability | **✅ MERGEABLE** |
| #75 | #50 | run-43/phase-4-env-dotenv | **✅ MERGEABLE** |
| #76 | #51 | run-44/phase-4-pm2-ecosystem | **✅ MERGEABLE** |
| #68 | #29 | run-22/phase-4-plan | Copilot still working (CONFLICTING) |
| #71 | #46 | run-36/phase-3-cohesion-runner | Copilot just merged; state pending |
| #72 | #47 | run-40/phase-4-ci-workflow | Copilot still working (CONFLICTING) |
| #77 | #53 | run-45/phase-3-coverage-floor | Copilot still working (CONFLICTING) |
| #78 | #55 | run-46/phase-3-arch-lint | Copilot still working (CONFLICTING) |
| #80 | #60 | issue-37/auto-merge-gate | Not triggered yet; my commits |
| #81 | #63 | meta/q-002-stack-recovery | Not triggered yet; my meta branch |

**Action**: the 8 MERGEABLE ones are ready to squash-merge. Click-through sequence (oldest-first, preserves Issue history):
1. #14 → squash + delete branch → close #66
2. #25 → squash + delete branch → close #67
3. #32 → squash + delete branch → close #69
4. #43 → squash + delete branch → close #70
5. #48 → squash + delete branch → close #73
6. #49 → squash + delete branch → close #74
7. #50 → squash + delete branch → close #75
8. #51 → squash + delete branch → close #76

I can close the tracker Issues automatically via the D-033 sweep pattern after each PR merges.

**Next Copilot wave**: the 4 CONFLICTING ones (#29, #47, #53, #55) are still being worked. Per user 2026-04-18: *"it does take time it's designed to do a good job not a fast one."* I'll wait and sweep.

**Not yet delegated**: #60 (my auto-merge-gate code), #63 (my meta branch). I can `@copilot` those next if main stabilizes first, or leave them for manual merge after.

### @xXKillerNoobYT - 2026-04-18T19:38:02Z

**Update**: PR #46 flipped to MERGEABLE. Stack is now **9 of 17 resolved**:

Add to previous list: **#71** → #46 (run-36/phase-3-cohesion-runner)

Also just triggered `@copilot` on **#60** (auto-merge-gate, closes #37) — the remaining small non-delegated code branch.

Still-CONFLICTING: #29, #47, #53, #55, #60 (just triggered), #63 (my meta — not yet delegated).

### @xXKillerNoobYT - 2026-04-18T20:10:24Z

## ⚠️ Main advanced — merge window narrowing

Main just advanced to `36cd630`. Previously-MERGEABLE PRs regressed — only **4 survive** as MERGEABLE right now:

- **#14** run-11/ui-master-plan
- **#25** run-17/phase-3-plan
- **#32** run-25/dependabot-triage
- **#88** issue-61/session-prefetch-npm-install (new; closes #61)

**Regressed to CONFLICTING** (need re-resolve): #43, #46, #48, #49, #50, #51 (6 PRs).

**Still CONFLICTING** (Copilot's first-pass didn't finish): #29, #47, #53, #55, #60, #63.

### Urgency

Every time main advances, unmerged MERGEABLE ones become CONFLICTING and need re-resolve. To break the cycle: **merge the 4 current MERGEABLE ones NOW**, then re-trigger `@copilot` on the 6 regressed ones. Serial-merge discipline saves Copilot quota and narrows the re-conflict window.

Click-merge sequence (oldest first):
1. #14 → squash+delete → close #66
2. #25 → squash+delete → close #67
3. #32 → squash+delete → close #69
4. #88 → squash+delete → (#61 closes automatically)

After those 4 land, I'll re-trigger `@copilot` on the 6 regressed PRs — one at a time this time to avoid main advancing mid-wave.

