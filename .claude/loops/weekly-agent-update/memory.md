# Memory — /weekly-agent-update

Append-only observation log. My own `/weekly-agent-update` runs read this file too; patterns that appear ≥ 3 times get promoted into my SOUL, contradictions ≥ 3 times get retired.

## Format

```
YYYY-MM-DD — [PATTERN|CONTRADICTION|FACT] short description (D-ID optional)
```

## What to record

- **PATTERN**: a maintenance heuristic that worked well this week (e.g., "softening a rule with an explicit exception retained 90% of its value while addressing the 3 contradictions")
- **CONTRADICTION**: a protocol step that produced bad output (e.g., "step 3's 3-count threshold was too aggressive for the `issue-triage-picker` memory — 3 hits spanning 1 day is noise, need time-dispersion check")
- **FACT**: a durable observation about the subagent fleet (e.g., "run-report-validator's memory grows ~2 entries/week, well below pruning threshold")

## What NOT to record

- Details of specific promotions/retirements this week — those belong in the run report
- Speculation before 3 occurrences
- Anything already in `decision-log.md` or CLAUDE.md

## Observations

2026-04-18 — FACT SOUL + memory pattern extended from subagents (D-005) to command loops (D-011 Run 34); /heartbeat and /weekly-agent-update now both have the same file layout
