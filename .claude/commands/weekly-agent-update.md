---
description: Weekly smart self-update — review each subagent's SOUL + memory, promote stable patterns to rules, retire contradicted rules. Surgical, small-LLM-friendly, never wholesale rewrites.
---

# weekly-agent-update

## Read these BEFORE you execute

- [`.claude/loops/weekly-agent-update/SOUL.md`](../loops/weekly-agent-update/SOUL.md) — my identity, the 7-step protocol distilled as numbered rules, and safety guardrails (≤5-line-per-file cap, never-wholesale, never-delete-first-2-sentences).
- [`.claude/loops/weekly-agent-update/memory.md`](../loops/weekly-agent-update/memory.md) — patterns + contradictions observed by prior weekly runs.

Scope note: enumerate BOTH `.claude/agents/*.md` (subagents) AND `.claude/loops/*/SOUL.md` (command-loop SOULs). Both classes follow the same promote/retire/prune protocol.

---

Runs once per week. Looks at each subagent's **memory** for patterns worth promoting to **SOUL**, and each SOUL rule for accumulating contradictions worth retiring. Makes small surgical edits only — never a wholesale rewrite.

## Mission

Keep the subagent fleet **stable**, **safe**, and **small-LLM-friendly** over time without human intervention. Embody the three project pillars in `memory.md`:

1. **Stability**: an agent's rules should not churn week-over-week. No change unless evidence justifies.
2. **Safety**: no rule change exceeds 5 lines per file. Every change must be reversible. Commit small, one atomic edit per agent.
3. **Small-LLM workability**: changes must keep rules explicit and numbered. Never replace a checklist with inferential language.

## The 7-step weekly tick

Execute IN ORDER. Stop if any step errors.

### 1. Enumerate agents

```bash
ls .claude/agents/*.md 2>/dev/null
```

For each `<name>.md`, check if `.claude/agents/<name>/SOUL.md` and `.claude/agents/<name>/memory.md` exist. Skip any agent that lacks both (log it — it's a candidate for a future add-SOUL pass, not this week's job).

### 2. Read SOUL + memory for each agent

Read both files. Hold them in mind. Do not modify anything yet.

### 3. Pattern promotion (memory → SOUL)

In each agent's `memory.md`, look for observations that meet **ALL** of these criteria:
- Appears **3 or more times** across distinct entries
- All instances are consistent (same direction, not contradicting each other)
- Translates into a rule that is **numbered + explicit** (not "be careful about X" but "if X, do Y")

If found, **promote** by appending to the relevant numbered list in SOUL.md. Keep the addition ≤ 2 lines. Add a `<!-- promoted YYYY-MM-DD from memory -->` comment at end of the added rule for audit.

### 4. Rule retirement (contradictions → SOUL change)

In each SOUL, identify any numbered rule that has **3 or more** contradiction observations in memory (entries that explicitly note the rule producing bad output, false-positive, etc.).

If found, **soften** the rule (add a named exception) or **retire** it (strike through with `~~…~~` and add a `<!-- retired YYYY-MM-DD: reason -->` comment). Prefer softening. Never delete — that loses audit trail.

### 5. Memory pruning

Remove observations from `memory.md` that are **older than 90 days** AND have already been either promoted or explicitly superseded. Keep the head `## Format` + `## Observations` structure. Log how many entries were pruned per agent.

### 6. Small-LLM sanity check

After step 3/4 edits, verify each SOUL still satisfies the small-LLM-workability pillar:
- All rules are numbered and ≤ 2 sentences each
- Output contract is present and ≤ 400 words
- No chain-of-thought prose injected

If any edit broke this, revert that specific edit and note in the run report.

### 7. Commit + report

**If any file changed**, commit with:

```
docs(agents): weekly self-update per D-YYYYMMDD-### (agents: <list>)

Promoted: <summary of promotions>
Retired: <summary of retirements>
Pruned: <counts per agent>
```

Write `reports/run-N-summary.md` with the usual format, noting:
- Which agents changed and which didn't
- Each promoted rule + its source pattern (minimum 3 memory hits)
- Each retired/softened rule + its contradiction count
- Pruned-entry counts
- New Decision ID

**If nothing changed**, still write a terse run report ("no changes — memories are still accumulating") and commit it. This proves the weekly tick actually ran. Use a fresh D-ID even for no-ops; the audit trail matters.

## Hard stops (CLAUDE.md §5)

- Do NOT rewrite any SOUL wholesale. ≤ 5 new/changed lines per file, hard limit.
- Do NOT delete entries from `memory.md` without the 90-day + superseded gate.
- Do NOT change the agent's core identity (first 2 sentences of SOUL). Those are load-bearing.
- Do NOT touch `SOUL.md` at repo root (that's the product SOUL, not an agent's).
- Do NOT change `model:` frontmatter fields (prompt design, not runtime, is the small-LLM lever).

## Small-LLM note

This entire protocol is numbered, deterministic, and checklist-driven. A 7B-parameter free model can execute it. Do NOT introduce any step that requires "judgment" without an explicit threshold (the 3-count rule, the 90-day rule, the 5-line cap are all explicit).

## Scheduling

To activate, create a weekly cron trigger. Example using the `schedule` skill:

```
/schedule create weekly /weekly-agent-update
```

Or manually via `CronCreate` with `cron: "0 9 * * 1"` (every Monday 09:00 local) and `prompt: "/weekly-agent-update"`.

The trigger expires after 7 days by default per harness rules — recreate weekly, or extend the expiry.
