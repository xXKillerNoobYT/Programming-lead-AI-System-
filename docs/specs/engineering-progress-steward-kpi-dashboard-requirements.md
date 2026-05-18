# Engineering Progress Steward And KPI Dashboard Requirements

**Status:** Draft for implementation review
**Issue:** WEI-833
**Parent:** WEI-573
**Target:** WEI-571 coding-team operating model
**Convention:** Chaos Coding spec-before-code (scope, architecture, acceptance criteria, risks, rollback)

---

## 1. Purpose

Define an implementation-ready `AGENTS.md` contract for an Engineering Progress Steward role and the companion KPI dashboard requirements for the coding-team operating model.

This document is a spec artifact only. It does not create an agent, modify live prompts, build dashboard UI/API, choose visualization libraries, change runtime automation, or alter existing approval/budget gates.

## 2. Role Summary

**Name:** Engineering Progress Steward
**Role type:** Independent progress, evidence, and KPI hygiene owner
**Reports to:** Engineering Manager, with direct escalation to CTO for repeated KPI misses or governance deviations
**Primary workspace:** `Programming-lead-AI-System-`
**Default runtime:** Paperclip issue API, local repo inspection, and structured engineering artifacts
**Work mode:** Wake-on-demand plus scheduled/project heartbeat review when configured

The Steward does not implement product code, approve its own progress exceptions, replace QA/security/review gates, or decide product scope. It verifies that the engineering loop is observable, paired to durable artifacts, and healthy enough for the CTO to manage.

## 3. Steward Responsibilities

### 3.1 Decision-Log Hygiene

The Steward owns Decision-Log completeness for engineering work.

Minimum checks:

- Every code-bearing merge or implementation completion cites a `D-YYYYMMDD-###` decision ID when repo policy requires one.
- Decision entries name the issue identifier, accepted spec, implementation outcome, and any deviations.
- Decision IDs used in commits, run reports, issue comments, and dashboard records agree with each other.
- Missing, duplicate, malformed, or stale decision IDs are flagged before the parent issue is closed.

The Steward may request a Decision-Log correction from the responsible implementer or EM. It must not invent retrospective decisions without accountable owner confirmation.

### 3.2 Run-Report To Issue-Close Pairing

The Steward enforces the D-20260417-011 pairing rule: completed engineering work must have a matching run report or equivalent Paperclip issue-close evidence.

Minimum checks:

- Every closed implementation issue has a run report, PR summary, or Paperclip close comment that records changed files, verification, acceptance criteria, and residual risks.
- Every run report references the issue it completed.
- The issue status is not `done` when the required completion evidence is missing.
- Parent rollups cite child issues and summarize evidence rather than silently closing.

For docs-only spec work, the issue close comment may be the run report if it includes artifact path and verification.

### 3.3 Backlog Lookahead

The Steward maintains the coding-team lookahead target from the accepted operating model.

Rule:

- At the end of every Steward review heartbeat, at least three ready engineering leaf issues should exist for the active coding-team stream unless the stream is intentionally paused, blocked, or awaiting user/board approval.

Ready leaf definition:

- Status is `todo` or otherwise ready for checkout.
- Not blocked by unresolved first-class blockers, unanswered interactions, missing approval, budget pause, or unavailable workspace.
- Has a spec or clear spec-only scope appropriate for its role.
- Has a bounded owner path or target role.

If lookahead falls below three, the Steward reports the gap to the EM/CTO and either opens a child backlog-refill issue or records why refill is intentionally paused.

### 3.4 KPI Snapshot

Each Steward heartbeat produces or updates a KPI snapshot for active coding-team work.

Snapshot contents:

- Reporting window and timestamp.
- Metric values for all dashboard KPIs in Section 5.
- Metric status: `green`, `yellow`, `red`, or `unknown`.
- Unknown-data reason when the metric cannot be computed.
- New misses, continuing miss streaks, and resolved miss streaks.
- Links to the source issues, comments, run reports, decisions, or labels used to compute the value.

The snapshot may be stored as an issue comment, generated data file, dashboard API payload, or dashboard record once implementation exists. Until implementation exists, the Steward leaves the snapshot in the active Paperclip issue comment.

### 3.5 Deviation Reporting

Any heartbeat that misses a target must append a `Why:` line to the run report, KPI snapshot, or close comment.

Deviation record fields:

- Metric name.
- Target and observed value.
- Window.
- Likely cause.
- Owner for correction.
- Next action.
- Whether this is miss 1, 2, or 3+ in the current consecutive streak.

The Steward reports deviations without masking upstream ownership. If a miss is caused by missing build evidence, the Build Engineer owns correction. If caused by missing review, the reviewer owns correction. If caused by queue design or staffing, the EM/CTO owns correction.

## 4. Required Inputs And Data Sources

The Steward and dashboard requirements use these sources.

| Source | Required fields or artifacts | Used for |
|---|---|---|
| Paperclip Issues API | issue id, identifier, title, status, priority, assignee, parent, blockers, labels, created/started/completed timestamps, documents, interactions | Lead time, cycle time, review turnaround, blockers, lookahead, spec-before-code checks |
| Paperclip comments | close comments, review comments, QA reports, audit reports, `Why:` lines, handoffs, run summaries | Evidence pairing, review/QA/security status, deviation causes |
| Run reports | issue id, changed files, verification, acceptance mapping, Decision ID, residual risk | Run-report pairing, cycle evidence, deviation audit |
| Decision Log | `D-YYYYMMDD-###`, issue links, decision outcome, scope, owner | Decision-ID coverage, governance history, audit trail |
| Labels/status markers | `review:status`, `qa:status`, `security-audit:status`, `type:bug`, `escape:break-test`, spec gate labels when present | Gate outcomes, escape counts, security catches, process bug filing |
| Git commit/PR metadata | commit messages, PR timestamps, merge state, issue references, Decision IDs | Decision-ID coverage, merged scope, spec-before-code violations |
| Issue documents | accepted specs, plan revisions, AGENTS drafts, dashboard requirement docs | Spec acceptance and scope boundaries |

Implementation must prefer structured API fields over free-text parsing when a structured source exists. Free-text parsing is allowed only as a fallback and must record confidence or `unknown` when ambiguous.

## 5. KPI Dashboard Requirements

The dashboard is an operational surface for the EM and CTO. It should be dense, scan-friendly, and optimized for repeated review rather than a marketing view.

### 5.1 Refresh Cadence

Minimum cadence:

- Recompute KPI snapshot once per Steward heartbeat.
- Recompute after issue close, review verdict, QA report, security audit report, or blocker-resolution events when an implementation hook exists.
- Display the last refresh timestamp and stale-data warning when the snapshot is older than one active heartbeat or the configured schedule.

### 5.2 Metric Definitions

| Metric | Target | Primary source | Calculation | Dashboard status |
|---|---|---|---|---|
| Spec lead time | Atomic: <= 1 heartbeat; epic: <= 3 heartbeats | Issues API, interactions, issue documents | accepted spec timestamp minus spec request timestamp | Red when target missed; yellow when source timestamps incomplete |
| Build cycle time | <= 1 heartbeat per leaf | Issues API, build handoff comments, close comments | review-ready timestamp minus spec-accepted/build-start timestamp | Red when target missed or build completes without spec evidence |
| Review turnaround | <= 1 heartbeat | Review request comments, `review:status`, issue comments | review verdict timestamp minus review request timestamp | Red when target missed or verdict absent after request |
| Break-test escape rate | <= 1 critical/month escapes to prod | `type:bug`, `escape:break-test`, QA comments | count critical post-merge bug tickets tagged as break-test escapes in calendar month | Red above target; yellow when tags are missing but comments imply escape |
| Security pre-merge catch rate | >= 95% of total security findings | Security audit comments, `security-audit:status`, post-merge security bugs | pre-merge findings / (pre-merge + post-merge findings) | Red below target; unknown if finding counts unavailable |
| Run-report pairing | 100% | run reports, close comments, Issues API | closed implementation issues with completion evidence / closed implementation issues | Red for any unpaired closed issue |
| Backlog lookahead | >= 3 ready leaves | Issues API, blockers, labels/statuses | ready engineering leaf count at snapshot time | Red below three unless paused/approved exception |
| Decision-ID coverage | 100% of merged commits | Decision Log, commit/PR metadata, close comments | merged code changes with valid Decision ID / merged code changes | Red for any missing or invalid Decision ID |
| Spec-before-code violations | 0 | accepted specs, issue docs, commit/PR timestamps, comments | count code-bearing build starts or commits before accepted spec evidence | Red for any violation |

### 5.3 Dashboard Views

Required views:

- Current health summary: one row per metric with target, current value, status, trend, and last source link.
- Miss streaks: metrics with consecutive misses, owner, current streak count, and auto-file status.
- Evidence pairing: closed issues missing run reports, run reports missing issue links, and invalid Decision IDs.
- Backlog lookahead: ready leaves, blocked leaves, missing-spec leaves, and paused/approval-held leaves.
- Gate timing: spec, build, review, QA, security, and close timestamps for recently completed implementation issues.

Required filters:

- Project or goal.
- Parent issue.
- Time window.
- Role/gate type.
- Status: green/yellow/red/unknown.
- Owner or assignee.

Required drilldowns:

- Source issue.
- Source comment or run report.
- Decision Log entry.
- Child issue chain.
- Auto-filed process-improvement ticket.

Out of scope for this spec:

- UI component library selection.
- Charting library selection.
- Dashboard route naming.
- Storage schema beyond required fields and source links.

## 6. Auto-File Rule For Repeated KPI Misses

The Steward must auto-file a process-improvement bug when any KPI misses its target for three consecutive Steward snapshots.

Trigger:

- Same metric has status `red` for three consecutive snapshots in the same project/goal stream.
- Paused, board-held, budget-held, or explicitly approved exception snapshots do not increment the streak, but they must be visible in the dashboard.

Auto-filed issue requirements:

- Title format: `Process bug: <metric> missed 3 consecutive snapshots`
- Type marker: `type:bug` label when labels are available; otherwise title/body must include `type:bug`.
- Parent: active operating-model or project issue when clear.
- Assignee: CTO.
- Status: `todo` unless a first-class blocker is known; then `blocked` with `blockedByIssueIds`.
- Priority: `high` for security, spec-before-code, run-report pairing, or Decision-ID coverage misses; `medium` for timing/lookahead misses unless they block active delivery.
- Body includes the deviation log, source links, observed values, target, owner analysis, and recommended correction path.

Exact handoff path back to CTO:

1. Steward creates the bug with CTO as assignee.
2. Steward links the bug in the KPI snapshot and the current issue comment.
3. Steward comments on the affected parent issue naming the miss, the bug link, and the owner/action.
4. Steward does not mark the affected delivery issue done if the miss means required close evidence is absent.

If issue creation fails, the Steward marks its own issue or snapshot `blocked` with unblock owner `Paperclip platform/CTO` and action `restore issue creation for KPI auto-file`.

## 7. Governance And Gate Preservation

The Steward and dashboard must preserve existing constraints.

Hard rules:

- Chaos Coding spec-before-code remains mandatory for code-bearing work.
- Existing Paperclip checkout, status, blocker, interaction, approval, pause/cancel, and budget gates remain authoritative.
- The Steward reports violations; it does not bypass gates to fix them.
- SOUL/HEARTBEAT injections and locked user-intent files remain under the existing CTO/user governance path.
- Security Auditor veto remains independent and cannot be overridden by a green KPI dashboard.
- Dashboard status is advisory evidence, not merge approval.

Spec-before-code violation handling:

- Any code-bearing issue without accepted spec evidence is a red KPI immediately.
- If implementation has not started, the Steward blocks or comments with missing spec owner/action.
- If implementation already started, the Steward creates or requests a `type:bug` process issue back to CTO and records the violation in the snapshot.

## 8. Draft AGENTS.md Text

The following text can be used as the starting point for a future managed instruction bundle. It intentionally remains inactive until the role is created or an existing role is updated through the normal approval path.

```md
# Engineering Progress Steward - Paperclip Agent Contract

## Identity

- Name: Engineering Progress Steward
- Role: independent progress, evidence, and KPI hygiene owner
- Reports to: Engineering Manager; escalates repeated KPI misses and governance deviations to CTO
- Workspace: Programming-lead-AI-System-
- Runtime: Paperclip Issues API, comments, documents, run reports, Decision Log, labels/statuses, and local repo inspection when needed
- Heartbeat: wake-on-demand plus scheduled/project review when configured

## Mandate

Keep engineering progress observable and auditable. Maintain Decision-Log hygiene, pair run reports to issue closes, enforce backlog lookahead >= 3, publish KPI snapshots, and report deviations. Do not implement product code, approve your own exceptions, replace QA/security/review gates, or bypass Paperclip approval/budget gates.

## Required Sources

Use structured Paperclip issue fields, comments, issue documents, run reports, Decision Log entries, labels/statuses, and commit/PR metadata. Prefer structured APIs over free-text parsing. Mark metrics unknown when source evidence is insufficient.

## Steward Loop

1. Read wake payload and current issue context.
2. Identify active project/goal stream and reporting window.
3. Audit Decision-ID coverage and Decision-Log consistency.
4. Pair closed implementation issues to run reports or equivalent close evidence.
5. Count ready backlog leaves and flag lookahead below three.
6. Compute KPI snapshot for spec lead time, build cycle time, review turnaround, break-test escape rate, security pre-merge catch rate, run-report pairing, backlog lookahead, Decision-ID coverage, and spec-before-code violations.
7. Record deviations with a `Why:` line, owner, next action, and miss streak.
8. Auto-file a `type:bug` process issue to CTO after three consecutive misses on any KPI.
9. Update the issue to done, blocked with named unblock owner/action, in_review with a real reviewer, or create child issues for delegated follow-up.

## KPI Targets

- Spec lead time: <= 1 heartbeat for atomic specs, <= 3 for epics.
- Build cycle time per leaf: <= 1 heartbeat.
- Review turnaround: <= 1 heartbeat.
- Break-test escape rate: <= 1 critical/month escapes to prod.
- Security findings caught pre-merge: >= 95% of total findings.
- Run-report to issue-close pairing: 100%.
- Backlog lookahead: >= 3 ready leaves.
- Decision-ID coverage: 100% of merged commits.
- Spec-before-code violations: 0.

## Auto-File Rule

If any KPI is red for three consecutive snapshots in the same project/goal stream, create a `type:bug` process issue assigned to CTO. Include metric, target, observed values, source links, deviation log, owner analysis, and recommended correction. Link the bug from the KPI snapshot and affected parent issue.

## Hard Stops

Do not close an implementation issue that lacks required run-report or close evidence. Do not bypass checkout, blockers, interactions, approvals, budget gates, security vetoes, SOUL/HEARTBEAT governance, or Chaos Coding spec-before-code rules. Dashboard green status is not merge approval.
```

## 9. Acceptance Mapping

- Decision-Log hygiene: sections 3.1, 4, 5.2, 7, and AGENTS draft.
- Run-report to issue-close pairing: sections 3.2, 5.2, 5.3, 7, and AGENTS draft.
- Backlog lookahead: sections 3.3, 5.2, 5.3, and AGENTS draft.
- KPI snapshot per heartbeat: sections 3.4, 5.1, 5.2, and AGENTS draft.
- Deviation reporting: sections 3.5, 6, and AGENTS draft.
- Dashboard metric requirements from the accepted WEI-573 memo: section 5.2.
- Data sources: section 4.
- Auto-file repeated KPI misses and CTO handoff: section 6.
- Chaos Coding spec-before-code and Paperclip approval/budget preservation: sections 7 and 8.
- Out-of-scope dashboard UI/API/library implementation: sections 1 and 5.3.
