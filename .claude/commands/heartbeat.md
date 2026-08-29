---
description: Execute one tick of the autonomous programming-lead heartbeat loop per CLAUDE.md.
---

# Heartbeat

Execute **one tick** of the Polsia-style heartbeat loop as the autonomous programming lead for this repository, following `CLAUDE.md` §3 exactly.

## What to do

1. **Orient (Step 1)** — read state in parallel:
   - `git status` and `git log --oneline -10`
   - `gh issue list --state open --limit 100` with labels/dates
   - native parent/sub-issue relationships for in-progress and candidate work
   - `gh pr list --state open --limit 100`
   - the most recent `reports/run-*-summary.md` for continuity
   - active roadmap/phase parent Issues and recent decision comments
   - open `type:question` + `status:needs-user` Issues
   - `memory.md` for durable observations

2. **Pick ONE atomic task (Step 2, softened oldest-first per D-20260417-014)** in this priority order:
   1. an in-progress Issue — continue it
   2. a **leaf** Issue (no open children) over any Issue with open children (D-20260417-018)
   3. the oldest open `status:backlog` Issue, **unless** a newer Issue is a blocker or advances the core backbone while backlog is all housekeeping
   4. if plans are exhausted, summarize and stop

3. **Keep backlog ≥ 3 (Step 2b)** — if fewer than 3 `status:backlog` Issues remain, decompose the active GitHub roadmap epic into native sub-issues.

4. **Consult prior decisions (Step 3)** — search GitHub Issues/comments and resolved question Issues; read `decision-log.md` only for historical D-ID references.

5. **Execute (Step 4)** — follow current repository conventions and `AGENTS.md`, prefer `Edit` over `Write`, write tests alongside code, respect no-Docker.

6. **Capture gaps (Step 4b / Polsia Rule 2)** — any bug/inconsistency/TODO found mid-flight becomes a new GH Issue immediately, not a silent fix.

7. **Verify (Step 5)** — run `npm test` + any relevant build; never claim green without command output.

8. **Record (Step 6)** — post any new `Decision:` evidence on the relevant GitHub Issue, append to `reports/run-N-summary.md`, and update `memory.md` only for durable retrieval guidance.

9. **Commit (Step 7)** — conventional message citing the Issue #; never force-push, never skip hooks, never amend pushed commits.

10. **Close Issue(s)** — a run may claim completion only when the corresponding Issue is closed with outcome, evidence, run-report path, and any decision-comment permalink.

## Hard stops (CLAUDE.md §5 — NEVER without explicit user approval)
Force-push · `git reset --hard` · dangerous `rm -rf` · commit secrets · skip hooks · modify historical vault plans/Q&A · modify `SOUL.md` without dedicated Issue + explicit approval · publish to external services · close GH Issues you did not resolve · add Docker / containers / Python venvs · chat-platform messaging.

## One tick, one task
Do not start multiple Issues in a single tick. If the chosen Issue is too large, open child sub-Issues (`gh api graphql` `addSubIssue` mutation, per D-20260417-018) and pick a leaf. Finish → close → report → commit, then end the tick.

## Heartbeat ≡ both surfaces
Per `feedback_heartbeat_rules_apply_to_loop_and_program.md` + D-20260417-021: every heartbeat convention applied here in Claude Code's `/loop` must also flow into the `heartbeat.js` product runtime. If a rule only makes sense on one side, stop and re-check.
