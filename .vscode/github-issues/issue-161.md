---
id: 4292913849
number: 161
title: >-
  chore(meta): Heartbeat collision protocol — detect
  PR-pending-but-doc-committed state at orient
state: open
created_at: '2026-04-20T03:30:57Z'
updated_at: '2026-04-20T16:10:43Z'
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
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
  - id: 10739055639
    name: 'priority:urgent'
    color: B60205
    description: Blocks heartbeat or production; jump the queue
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/161
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/161'
---
# chore(meta): Heartbeat collision protocol — detect PR-pending-but-doc-committed state at orient

## Problem

When two concurrent heartbeat sessions (local /loop + scheduled remote agent) pick the same Issue, the D-ID collision protocol currently only describes how to handle D-ID numbering collisions in the decision-log. It does NOT describe what to do when one session **commits its decision-log entry + run-report directly to main BEFORE its own feature PR merges**, while the other session is mid-implementation on a separate branch.

This happened today (Run 229, Issue #152):
- Session A (scheduled remote) committed `D-20260420-001` + `reports/run-229-summary.md` to `main` (commit 2e6259f) declaring #152 "delivered", but the actual feature code is on draft PR #156 (still OPEN at time of detection).
- Session B (my local tick) had independently implemented #152 on branch `issue-152/d3b-inspector-polish` with a slightly different approach (8 tests vs 6, different inline fixes, no peer-dep fix).
- My PR #160 showed `mergeStateStatus: DIRTY` at push because the decision-log on main already had an overlapping entry.
- Issue #152 state on GitHub was still OPEN (neither PR was merged).

## Acceptance Criteria

### 1. Orient-step detection

- [ ] Update `CLAUDE.md` §3 Step 1 (Orient) OR add a new substep: before picking an Issue, `git log --since="60 minutes ago" main -- decision-log.md reports/run-*-summary.md` AND `gh pr list --state open` to detect **PR-pending-but-doc-committed** state.
- [ ] If the most recent decision-log entry references an OPEN Issue whose linked PR is STILL OPEN (not merged), treat the Issue as effectively "claimed" — do not pick it, and flag in the run report.

### 2. D-ID collision protocol extension

- [ ] Extend memory file `feedback_d_id_collision_protocol.md` (if it exists) OR the equivalent rule in CLAUDE.md §6: add an explicit "doc-committed-before-PR-merge" case.
- [ ] Add a "What to do if it's already happened to you" recovery section: (a) close own PR as superseded with a comment linking the other PR; (b) delete own branch; (c) capture additive-value tests in a follow-up Issue against whichever PR merges; (d) schedule next wakeup on a different Issue.

### 3. Prevention: don't commit decision-log to main before own PR merges

- [ ] Add a hard rule to CLAUDE.md §3 Step 6: decision-log entries + run-reports that declare "Issue #N delivered" MUST ship in the same commit that merges the feature PR (i.e., part of the squash-merge body, NOT a separate direct-to-main commit).
- [ ] For direct-to-main doc-only commits, the commit MUST only declare things that are already on main (e.g., "documenting what PR #X delivered yesterday") — NEVER something still on an unmerged branch.
- [ ] The parallel session's commit style (`docs(run-229): Run 229 summary + decision-log D-20260420-001` referring to a draft PR) is the anti-pattern to catch.

### 4. Orient tooling

- [ ] Nice-to-have: extend `session-prefetch.sh` (per Issue #98's "recommended pick" directive) to also render "PR-pending-but-doc-committed" warnings surfaced to the heartbeat at orient time.

## Out of scope

- Detecting the collision server-side via a GitHub Action (too invasive; heartbeat orient-step detection is enough).
- Preventing parallel heartbeat sessions entirely (user may legitimately run both local `/loop` + scheduled remote for throughput).

## Links

- Today's collision: PR #156 (parallel session's open draft) + PR #160 (my closed-as-superseded).
- Decision-log entry that exposed the gap: `D-20260420-001`.
- Related self-improvement Issue: #157 (peer-dep detection — complementary; together they harden remote-session ergonomics).
- Memory reference: `feedback_heartbeat_polsia_rules.md`, `feedback_stack_drift.md`.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T03:30:57Z
**Updated:** 2026-04-20T16:10:43Z
**Labels:** type:task, status:backlog, phase:meta, priority:urgent

---

## Comments

### @xXKillerNoobYT - 2026-04-20T16:10:43Z

**Second data-loss incident this session** — escalating severity.

Commit `36a2de5` (overseer's weekly-agent-update no-op tick, 15:26 UTC 2026-04-20) rewrote `decision-log.md` and deleted D-20260419-016 through D-20260420-003 — ~60 D-entries spanning all §C.2/C.3/C.4/C.5 backbone work + the §D.3.a/b/c session. Their commit message acknowledged collisions ("D-001/002/003 already used by parallel sessions; this tick uses D-004") but the diff showed `-52 +6` lines. Unclear whether:
- (a) the overseer session fetched before my D-002/D-003 landed, then edited from a stale base, OR
- (b) the overseer's code explicitly rewrote the file with a new template.

Restored from `6497bf7` in PR #170 / D-20260420-005. All 80 entries now on main. No data lost from git history — the COMMITS were preserved — but the FILE had to be hand-restored by a subsequent heartbeat.

**This is now the second data-loss event** (first was the PR #156 non-merged-but-doc-claimed-delivery incident from Run 229 that motivated this Issue). Both share the same root cause: a parallel session committed a decision-log change to main that was inconsistent with what other sessions were doing concurrently.

**Proposed AC escalation for #161** (adding on top of the existing ACs):
- [ ] **HARD RULE**: any commit that modifies `decision-log.md` MUST, as its first action, `git fetch origin main && git log --oneline -10 main -- decision-log.md` to detect recent writers. If any entry within the last 60 minutes is by a different author/session ID, pause and surface via Dev-Q&A instead of rewriting.
- [ ] **DELETION-GUARD**: reject any decision-log change that has MORE deletions than additions (diff stat `-N +M` where N > M). Decision-log is append-only by policy; deletions are always a mistake except for explicit reformatting commits that the user approves.
- [ ] **CI GATE**: add a GitHub Action that parses `decision-log.md` on every PR and fails if any D-ID that existed on main's tip is missing from the PR's version.

Priority stays `urgent`. This directly blocks safe autonomous operation under multi-session use.

