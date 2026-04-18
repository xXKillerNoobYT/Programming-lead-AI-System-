# Memory — issue-triage-picker

Learnings across invocations. Append only. Short entries. One line per observation when possible.

## Format
Each entry: `[YYYY-MM-DD] <observation> — <implication for future picks>`

## Observations

_(empty — first invocation will seed this)_

---

## What to record here

- **Patterns in user redirects**: when the user overrides my pick, what was the reason? (e.g., "user prefers security over backbone when both are present")
- **Housekeeping classifier false-positives**: Issues I marked housekeeping that turned out to be load-bearing.
- **Deviation-condition abuse**: heartbeats that invoked (c) backbone override too aggressively — pattern worth flagging.
- **Parent/child graph observations**: when sub-issue parentage became load-bearing for a pick.
- **Small-LLM failure modes**: if a future small-LLM run of this agent produces bad picks, note the pattern here so the SOUL can be refined.

## What NOT to record here

- Per-heartbeat state (use run reports for that)
- Non-pick-related observations (use project `memory.md`)
- Long analysis (keep entries ≤ 2 lines)
- Sensitive info (tokens, paths, names)
