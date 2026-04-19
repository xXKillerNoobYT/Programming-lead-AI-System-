---
description: Execute one tick of the autonomous programming-lead heartbeat loop per CLAUDE.md.
---

# Heartbeat

Execute **one tick** of the Polsia-style heartbeat loop as the autonomous programming lead for this repository, following `CLAUDE.md` §3 exactly.

## What to do

1. **Orient (Step 1)** — read state in parallel:
   - `git status` and `git log --oneline -10`
   - `plans/main-plan.md` for current phase
   - `gh issue list --state open --limit 20` (on remote without `gh`: `mcp__github__list_issues` with `state: OPEN`, `perPage: 30` — see #62)
   - the most recent `reports/run-*-summary.md` for continuity
   - the last ~5 entries in `decision-log.md`
   - `memory.md` for durable observations
   - `Docs/Plans/Dev-Q&A.md` for new user answers (CLAUDE.md §4b)

2. **Pick ONE atomic task (Step 2, softened oldest-first per D-20260417-014)** in this priority order:
   1. an in-progress Issue — continue it
   2. a **leaf** Issue (no open children) over any Issue with open children (D-20260417-018)
   3. the oldest open `status:backlog` Issue, **unless** a newer Issue is a blocker or advances the core backbone while backlog is all housekeeping
   4. if plans are exhausted, summarize and stop

3. **Keep backlog ≥ 3 (Step 2b)** — if fewer than 3 `status:backlog` Issues remain, decompose `plans/main-plan.md` into new Issues (use `gh issue edit --add-parent` / sub-issues where applicable, per D-20260417-018; on remote without `gh`, use `mcp__github__issue_write` + `mcp__github__sub_issue_write` — see #62).

4. **Consult prior decisions (Step 3)** — search `decision-log.md` for relevant `D-YYYYMMDD-###` entries; reuse them rather than re-asking.

5. **Execute (Step 4)** — follow `.roo/rules/rules.md`, prefer `Edit` over `Write`, write tests alongside code, respect no-Docker.

6. **Capture gaps (Step 4b / Polsia Rule 2)** — any bug/inconsistency/TODO found mid-flight becomes a new GH Issue immediately, not a silent fix.

7. **Verify (Step 5)** — run `npm test` + any relevant build; never claim green without command output.

8. **Record (Step 6)** — append to `reports/run-N-summary.md` (create `run-(N+1)-summary.md` if starting a new run); append a new `D-YYYYMMDD-###` in `decision-log.md`; update `memory.md` only for durable facts.

9. **Commit (Step 7)** — conventional message citing the Decision ID and Issue #; never force-push, never skip hooks, never amend pushed commits.

10. **Close Issue(s)** — per CLAUDE.md §6 "Run-complete ↔ Issue-close pairing": every decision-log entry marking a Run complete MUST close the corresponding GH Issue(s) via `gh issue close` (local) or `mcp__github__issue_write` with `method: "update"` + `state: "closed"` (remote, see #62), with a comment citing the Decision ID + run report path.

11. **Merge station (auto-merge gate passed)** — on pass: merge the PR via `gh pr merge --squash --delete-branch` on local, or `mcp__github__merge_pull_request` with `merge_method: "SQUASH"` on remote (see #62). Delete the branch after merge either way.

## Hard stops (CLAUDE.md §5 — NEVER without explicit user approval)
Force-push · `git reset --hard` · dangerous `rm -rf` · commit secrets · skip hooks · modify `Docs/Plans/*` (except `Dev-Q&A.md`) · modify `SOUL.md` · publish to external services · close GH Issues you did not resolve · add Docker / containers / Python venvs · chat-platform messaging.

## One tick, one task
Do not start multiple Issues in a single tick. If the chosen Issue is too large, open child sub-Issues (`gh api graphql` `addSubIssue` mutation, per D-20260417-018) and pick a leaf. Finish → close → report → commit, then end the tick.

## Heartbeat ≡ both surfaces
Per `feedback_heartbeat_rules_apply_to_loop_and_program.md` + D-20260417-021: every heartbeat convention applied here in Claude Code's `/loop` must also flow into the `heartbeat.js` product runtime. If a rule only makes sense on one side, stop and re-check.
