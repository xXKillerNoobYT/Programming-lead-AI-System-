# Memory — /heartbeat

Append-only observation log. Each entry is ONE line, tagged with a date and a short pattern description. Used by `/weekly-agent-update` to promote ≥3-time patterns into SOUL rules and retire ≥3-contradiction rules.

## Format

```
YYYY-MM-DD — [PATTERN|CONTRADICTION|FACT] short description (Issue #N or D-ID optional)
```

## What to record

- **PATTERN**: a behavior that helped this tick succeed (e.g., "skipping station 4a for mechanical doc Issues kept the tick to 5 minutes")
- **CONTRADICTION**: a SOUL rule that produced bad output this tick (e.g., "leaf-first picked #X but #Y was a higher-priority blocker")
- **FACT**: a durable observation about the project that future ticks need (e.g., "parallel sessions commit to the same branch — branch-per-Issue is theoretical when >1 session is running")

## What NOT to record

- Task-specific details that belong in the run report (what was changed, what tests passed)
- Speculation ("maybe X is causing Y") — wait for ≥3 occurrences
- Anything already captured in `decision-log.md`, CLAUDE.md, or the project-level `memory.md`

## Observations

2026-04-18 — FACT three parallel Claude Code sessions ran simultaneously today and collided on D-IDs and "Run N" titles three times; the Option-D concurrent-ban rule in SOUL is the response (D-20260418-011 Run 34)
2026-04-18 — PATTERN small config fixes (.npmrc + devDeps) are TDD-exempt when the existing test suite already protects the behavior — declaring exemption explicitly in the run report satisfies §9 (D-20260418-010 Run 33)
2026-04-18 — CONTRADICTION D-20260418-001 claimed a fix was applied "via overrides" with no `overrides` field ever landing in git — future ticks should verify claims in the decision-log against git history before treating them as authoritative (D-20260418-010 callout)
