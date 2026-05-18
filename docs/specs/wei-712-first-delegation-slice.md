# WEI-712 — heartbeat.js first delegation slice

## Goal
Advance `heartbeat.js` from read-only reporting to one concrete delegation write-path.

## Scope (Slice 1)
- Add an opt-in first delegation step in `tick()` that:
- finds one open `status:in-progress` issue via `gh issue list`.
- posts a delegation sync comment via `gh issue comment`.
- records delegation status in the heartbeat markdown report.

## Non-goals
- Full routing across multiple issues/agents.
- Idempotency/dedup logic for repeat comments.
- Child-issue creation or interaction workflows.

## Acceptance checks
- AC1: `heartbeat.js` exports a delegation helper that can parse issue-list JSON safely.
- AC2: delegation helper attempts `gh issue comment` on first in-progress issue and returns posted/skipped/failed status.
- AC3: report includes a `## Delegation` section reflecting delegation status.

## Evidence plan
- Unit tests in `tests/heartbeat.test.js` for parse + post + skip paths.
- Regression assertion that report renders delegation block.
