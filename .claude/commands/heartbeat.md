---
description: Execute one tick of the autonomous programming-lead heartbeat loop per CLAUDE.md.
---

# Heartbeat

## Read these BEFORE you execute

- [`.claude/loops/heartbeat/SOUL.md`](../loops/heartbeat/SOUL.md) — my identity, numbered priority rules, Singular-Heartbeat rule, and output contract.
- [`.claude/loops/heartbeat/memory.md`](../loops/heartbeat/memory.md) — patterns, contradictions, and durable observations from prior ticks.

The SOUL is the load-bearing identity: **singular heartbeat, no parallel peer**. If you see parallel-session signals mid-tick (D-ID collisions, Run-N title thrashing, unattributed commits on your branch), stop and end the tick per the Singular-Heartbeat rule.

---

Execute **one tick** of the intelligent heartbeat pipeline per `CLAUDE.md` §3 + **D-20260418-009**. The pipeline is a sequence of numbered stations; each station names the skill or subagent it invokes. Skip a station only when it does not apply — and note why in the run report.

## Pipeline (14 stations)

### 1. Orient
Read state in parallel:
- `git status` and `git log --oneline -10`
- `plans/main-plan.md` — current phase
- `gh issue list --state open --limit 30`
- Latest `reports/run-*-summary.md` for continuity
- Last ~5 entries in `decision-log.md`
- `memory.md` for durable observations
- `Docs/Plans/Dev-Q&A.md` for new user answers (CLAUDE.md §4b — transcribe answers to `decision-log.md` as new `D-` entries and remove the question block)

### 2. Pick ONE atomic task
Invoke the **`issue-triage-picker`** subagent (via `Agent` tool). It returns a ranked candidate + reason per the 4-layer tree:
1. `status:in-progress` Issue → continue it
2. Open leaf sub-issue of open parent → pick leaf (D-20260417-018)
3. Softened oldest-first with backbone/user-redirect/blocker overrides (D-20260417-014)
4. If backlog empty → decompose the current phase plan into a new Issue

Mark the picked Issue `status:in-progress`.

### 3. Plan (conditional — creative/multi-step Issues only)
If the Issue is creative or spans >1 heartbeat:
- Invoke `superpowers:brainstorming` skill to resolve intent + design
- Invoke `superpowers:writing-plans` skill to write a `plans/*.md` entry

Skip for atomic mechanical Issues (single-file edits, doc-only fixes, settings tweaks).

### 4. Branch (code-producing Issues)
- `git fetch origin`
- `git checkout beta && git pull --ff-only`  (fall back to `main` ONLY if `beta` doesn't exist yet — pre-stack-drain state)
- `git checkout -b <type>/issue-<N>-<slug>` where `<type>` is `feature`, `bugfix`, or `hotfix`

Per **D-20260418-026** (branching strategy): feature/bugfix branches off `beta`; hotfixes off `main` (rare, user-authorized only). Per D-20260418-009: branches per Issue (not worktrees) unless parallel ticks genuinely require isolation. Docs-only Issues MAY skip this station if they commit to a `meta/<slug>` branch-tag (per D-20260418-025) — note in run report.

### 5. Build with TDD (all new program parts and updates — per §6)
Invoke **`superpowers:test-driven-development`** skill. Follow red → green → refactor.

**No production code without a failing test first.** Per user directive 2026-04-18 (D-20260418-028), TDD is THE development method for new parts of the program and updates — not just "backbone." Capture verbatim red-run output and green-run output in the run report. That evidence is what proves TDD happened.

Scope (per CLAUDE.md §6): **all** production code. Exempt ONLY: docs (`*.md`, `*.txt`), config files (`.json`, `.yml`, `.toml`, `.npmrc`, `.env*`), generated files, throwaway diagnostics. Exempt changes must declare "TDD exempt — <category>" in the run report.

### 5b. Debug (conditional — on ≥3 failed fix attempts)
If TDD's green phase stalls: invoke **`superpowers:systematic-debugging`** skill. Follow its four phases (root-cause → pattern analysis → hypothesis → implementation) before any more fix attempts.

### 6. Capture gaps (Polsia Rule 2 — always)
Any bug/TODO/doc-drift/inconsistency noticed mid-flight → open a new GH Issue immediately. Do not let captures die in context. Trivial fixes may be applied *after* the Issue exists.

### 7. Verify
Invoke **`superpowers:verification-before-completion`** skill. Run the full relevant suite — root `node --test`, dashboard `npm test`, any build/lint/type-check the project exposes. Paste command + result into the run report.

For UI changes: start dev server (`npm install && npm run dev` in `dashboard/` — user's preferred dev command) and verify via `mcp__plugin_playwright_playwright__*` tools. Coverage must not regress.

### 8. Commit
Invoke **`commit-commands:commit`** skill. Conventional message citing Decision ID + Issue #. Never force-push, never skip hooks, never amend pushed commits.

### 9. PR
Invoke **`commit-commands:commit-push-pr`** skill. Pushes branch and opens PR against `main`. Skip only for docs-only fixes explicitly authorized for direct-to-dev-branch.

### 10. Review
Invoke **`pr-review-toolkit:review-pr`** skill — a panel of `code-reviewer`, `silent-failure-hunter`, `pr-test-analyzer`, `type-design-analyzer`, and `comment-analyzer` subagents. Capture each verdict in the run report.

### 11. Merge (gated auto-merge of THIS tick's PR → `beta`)
Per CLAUDE.md §6 auto-merge policy + **D-20260418-026** branching strategy. Target is **`beta`**, not `main`. All FIVE gates must pass:
1. Full relevant suite green on the PR branch
2. No review finding rated ≥ blocker
3. No open `silent-failure-hunter` findings on the PR
4. No merge conflicts vs. `beta`
5. The Issue (referenced in the PR body) carries the `auto-merge:ok` label

If all five pass: `gh pr merge <N> --squash --delete-branch` (NEVER `--admin` — that bypasses branch protection). Else: leave PR open, comment with the blocker summary, move on. The next heartbeat (or the user) picks it up.

**Pre-stack-drain fallback**: if `beta` branch does not yet exist (the 15-PR Q-002 click-through hasn't landed yet), PRs target `main` as they do today. Once `beta` is created off cleaned `main`, switch targets on new PRs from that tick forward.

### 11b. Merge + Security Audit (conditional cross-tick sweep)
A tick **qualifies** for this station if ANY of:
- ≥ 2 open PRs against `main` where `mergeable == MERGEABLE` and `mergeStateStatus == CLEAN` (branch drift accumulating)
- Any open Dependabot alert with severity `critical` OR `high`
- The latest run report's `Open Concerns` names an unmerged PR

When it qualifies, in priority order:

a. **Safe merges of OTHER MERGEABLE+CLEAN PRs** — for each: `gh pr view N` confirm no secret-touching diff, then `gh pr merge N --squash --delete-branch` (never `--admin`). On protection-rule block: file a Dev-Q&A entry explaining which rule. `git fetch` after each merge.

b. **Dependabot alerts** — `gh api repos/{owner}/{repo}/dependabot/alerts --jq '.[] | select(.state == "open")'`. For each `critical`/`high`: merge the Dependabot PR if one exists (under 11b.a); else file an Issue (Polsia Rule 2). Batch `medium`/`low` into one triage Issue.

c. **Supersession sweep — 6-hour grace** (per **D-20260418-027**, retuning D-20260418-012 per user directive 2026-04-18): on first detection of a CONFLICTING+DIRTY PR whose commits are already in `main` (or `beta`, once that branch exists), post a timestamped "Superseded by ... Auto-close scheduled for `<now + 6h>` if no new activity" comment; do NOT close this tick. On subsequent ticks, close if (i) the comment exists, (ii) the scheduled time has passed, (iii) no new commits landed since. Never auto-close a PR with unique commits. The 6-hour window matches the 1–4.5-min self-pacing cadence from D-20260418-014 — at ≥15 ticks/hour, 6h is ample for the PR owner to react.

d. **Record** — run report must include a `## Merge + Security Audit` section listing PRs merged (with SHA), PRs closed-as-superseded, Dependabot alerts resolved, and any filed Issue numbers.

### 12. Record
- Append/create `reports/run-N-summary.md` with the usual structure (Overview, Changes, Tests with command output, Decisions, Metrics, Next task, Open concerns)
- Append a new `D-YYYYMMDD-###` entry in `decision-log.md`
- Update project-level `memory.md` ONLY for durable facts that affect future runs (not task-specific noise)
- Close the GH Issue(s) with a comment citing the Decision ID + run report path — per CLAUDE.md §6 Run-complete ↔ Issue-close pairing
- Optional: dispatch the **`run-report-validator`** subagent to verify the fresh run report against D-007's false-green checklist + CLAUDE.md §6 discipline before committing

### 13. Plan ahead
- Count `status:backlog` Issues. If < 3: decompose `plans/main-plan.md` (or the active phase plan) into new Issues until backlog ≥ 3.
- If `plans/` is too fuzzy to produce 3 clear Issues, **refine the plan first** (that becomes the task) — write the next section of `plans/main-plan.md` or create `plans/run-N-<topic>-plan.md`, then decompose. Do not produce vague Issues off vague plans.

### 14. Schedule the next tick (always — last station before end)
Per **D-20260418-014** + **D-20260418-016**. After committing and closing the Issue, call:

```
ScheduleWakeup({
  delaySeconds: clamp(ideal, 60, 270),
  prompt: "<<autonomous-loop-dynamic>>",
  reason: "tick N complete, next tick in Xm (backlog: N open | plan: healthy/fuzzy | PRs: N pending merge-audit)"
})
```

**Ideal-delay heuristic** (pick the first that matches):
- Backlog empty AND no PRs pending AND no `status:in-progress` → **270s** (≈4.5 min, cache-warm idle)
- Something actively queued (backlog ≥ 1, PR pending merge-audit, leaf sub-issue waiting) → **60s** (go fast)
- Tick ended on an UNRESOLVED Singular-Heartbeat collision → **270s** (let the other session finish)

**Clamp is mandatory**: 60s is ScheduleWakeup's hard floor; 270s stays under the 5-min prompt-cache TTL so re-entry is cache-warm.

**End of tick.** After `ScheduleWakeup` returns, the tick is complete. The harness will invoke `/heartbeat` again at the scheduled time.

---

## Escape hatch — Design questions

At ANY station: if a blocking design decision emerges that cannot be safely auto-resolved and no live user is in session, invoke the **`post-dev-qa`** skill to file a `Q-YYYYMMDD-###` block in `Docs/Plans/Dev-Q&A.md`. Then pick a different queued Issue and continue — do not stall.

## Hard stops (CLAUDE.md §5 — NEVER without explicit user approval)

Force-push · `git reset --hard` · dangerous `rm -rf` · commit secrets · skip hooks · modify `Docs/Plans/*` (except `Dev-Q&A.md`) · modify `SOUL.md` · publish to external services · close GH Issues you did not resolve · add Docker / containers / Python venvs · chat-platform messaging.

## One tick, one task (Singular-Heartbeat rule)

Per D-20260418-013: only ONE tick runs at a time. Do not start a second Issue in the same tick. If the chosen Issue is too large, open child sub-Issues (`gh api graphql` `addSubIssue` mutation, per D-20260417-018) and pick a leaf. Finish → close → report → commit, then schedule next tick and end.

If you see parallel-session signals mid-tick (D-ID collisions, Run-N title thrashing, unattributed commits on your branch, `decision-log.md` gaining entries you didn't write), STOP — commit what you have, note the collision in the run report, schedule the next tick with a 270s delay to let the peer finish, and end the tick. Do not race.

## Heartbeat ≡ both surfaces

Per D-20260417-021 + the "heartbeat rules apply to /loop AND heartbeat.js" memory: every convention in this file must also flow into the `heartbeat.js` product runtime. If a rule makes sense on only one side, stop and re-check.
