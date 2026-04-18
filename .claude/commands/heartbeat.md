---
description: Execute one tick of the autonomous programming-lead heartbeat loop per CLAUDE.md.
---

# Heartbeat

Execute **one tick** of the Polsia-style heartbeat loop as the autonomous programming lead for this repository, following `CLAUDE.md` §3 exactly.

## What to do

1. **Orient (Step 1)** — read state in parallel:
   - `git status` and `git log --oneline -10`
   - `plans/main-plan.md` for current phase
   - `gh issue list --state open --limit 20`
   - the most recent `reports/run-*-summary.md` for continuity
   - the last ~5 entries in `decision-log.md`
   - `memory.md` for durable observations
   - `Docs/Plans/Dev-Q&A.md` for new user answers (CLAUDE.md §4b)

2. **Pick ONE atomic task (Step 2, softened oldest-first per D-20260417-014)** in this priority order:
   1. an in-progress Issue — continue it
   2. a **leaf** Issue (no open children) over any Issue with open children (D-20260417-018)
   3. the oldest open `status:backlog` Issue, **unless** a newer Issue is a blocker or advances the core backbone while backlog is all housekeeping
   4. if plans are exhausted, summarize and stop

3. **Keep backlog ≥ 3 (Step 2b)** — if fewer than 3 `status:backlog` Issues remain, decompose `plans/main-plan.md` into new Issues (use `gh issue edit --add-parent` / sub-issues where applicable, per D-20260417-018).

4. **Consult prior decisions (Step 3)** — search `decision-log.md` for relevant `D-YYYYMMDD-###` entries; reuse them rather than re-asking.

5. **Execute (Step 4)** — follow `.roo/rules/rules.md`, prefer `Edit` over `Write`, write tests alongside code, respect no-Docker.

6. **Capture gaps (Step 4b / Polsia Rule 2)** — any bug/inconsistency/TODO found mid-flight becomes a new GH Issue immediately, not a silent fix.

7. **Verify (Step 5)** — run `npm test` + any relevant build; never claim green without command output.

8. **Record (Step 6)** — append to `reports/run-N-summary.md` (create `run-(N+1)-summary.md` if starting a new run); append a new `D-YYYYMMDD-###` in `decision-log.md`; update `memory.md` only for durable facts.

9. **Commit (Step 7)** — conventional message citing the Decision ID and Issue #; never force-push, never skip hooks, never amend pushed commits.

10. **Close Issue(s)** — per CLAUDE.md §6 "Run-complete ↔ Issue-close pairing": every decision-log entry marking a Run complete MUST close the corresponding GH Issue(s) via `gh issue close` with a comment citing the Decision ID + run report path.

11. **Merge + Security Audit (qualifying ticks only)** — per user directive 2026-04-18. A tick **qualifies** for this station if ANY of these are true:
    - ≥ 2 open PRs against `main` where `mergeable == MERGEABLE` and `mergeStateStatus == CLEAN` (branch drift accumulating)
    - Any open Dependabot alert with severity `critical` OR `high`
    - The latest run report's `Open Concerns` section names an unmerged PR

    When it qualifies, in priority order:

    a. **Safe merges first** — for each PR above that's MERGEABLE + CLEAN + `baseRefName == main`:
       - `gh pr view N` to confirm no secret-touching changes (scan diff for `.env`, tokens, `GITHUB_PERSONAL_ACCESS_TOKEN` values, etc.)
       - `gh pr merge N --squash --delete-branch` (NEVER `--admin` — that bypasses branch protection and is not authorized)
       - If merge fails with protection-rule message, stop and file a Dev-Q&A entry per §4b explaining which rule is blocking
       - After merge, `git fetch` to sync local `origin/main`

    b. **Dependabot alerts** — `gh api repos/{owner}/{repo}/dependabot/alerts --jq '.[] | select(.state == "open")'`:
       - For each `critical` + `high` alert: if a Dependabot-authored PR exists (`gh pr list --author app/dependabot`), merge it under rule 11a; else file an Issue per Polsia Rule 2
       - For `medium` + `low`: batch into a single triage Issue rather than one-per-alert

    c. **Supersession sweep — with 3-day grace period** (per user directive 2026-04-18: *"Close them after three days if they're not ending up being used again"*):
       - **First detection**: when a PR becomes CONFLICTING+DIRTY AND all its commits are already in `main`, post a comment of the form:
         ```
         Superseded by <merge-PR#> merge at <SHA> on <YYYY-MM-DD>. Auto-close scheduled for <YYYY-MM-DD + 3 days> if no new activity.
         ```
         Do **not** close it this tick. The comment is the durable aging marker — future heartbeats read its timestamp.
       - **Subsequent ticks**: for each CONFLICTING+DIRTY PR, check whether a "Superseded by … Auto-close scheduled for …" comment exists AND whether the scheduled date has passed AND whether no new commits have landed since the comment. If all three: `gh pr close N --comment "Grace period elapsed; closing per D-20260418-012."` If any condition fails, leave the PR open and move on.
       - **Never auto-close** a PR that still has unique commits relative to `main`.
       - **Never auto-close** a PR during the grace period even if it meets the structural criteria.

    d. **Record** — the run report must include a `## Merge + Security Audit` section listing: PRs merged (with SHA), PRs closed-as-superseded, Dependabot alerts resolved, any unresolved-and-file Issue numbers.

## Hard stops (CLAUDE.md §5 — NEVER without explicit user approval)
Force-push · `git reset --hard` · dangerous `rm -rf` · commit secrets · skip hooks · modify `Docs/Plans/*` (except `Dev-Q&A.md`) · modify `SOUL.md` · publish to external services · close GH Issues you did not resolve · add Docker / containers / Python venvs · chat-platform messaging.

## One tick, one task
Do not start multiple Issues in a single tick. If the chosen Issue is too large, open child sub-Issues (`gh api graphql` `addSubIssue` mutation, per D-20260417-018) and pick a leaf. Finish → close → report → commit, then end the tick.

## Heartbeat ≡ both surfaces
Per `feedback_heartbeat_rules_apply_to_loop_and_program.md` + D-20260417-021: every heartbeat convention applied here in Claude Code's `/loop` must also flow into the `heartbeat.js` product runtime. If a rule only makes sense on one side, stop and re-check.
