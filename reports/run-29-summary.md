# Run 29 — SessionStart npm install + self-improvement pass

**UTC timestamp**: 2026-04-18 ~19:40–20:15 UTC
**Session kind**: scheduled remote heartbeat (single tick, shipped #61 + 4 captures)
**Collision check**: PASS — `git fetch --all --prune` + `git log --since="15 minutes ago"` showed only bot (copilot-swe-agent) and user (xxkillernoobyt) commits; no concurrent Claude Code session. `HEAD` arrived detached at `43c18a9` (Run 28's abort notice); checked out `main`, fast-forwarded 2 commits.

## Insights this tick:
- **Dashboard install is actively broken on `main`**: `cd dashboard && npm install` errors `ERESOLVE` (React-19-RC vs `@testing-library/react@16.3.2`). D-20260418-001 claims an `overrides`-based fix exists, but the `overrides` field is absent from `dashboard/package.json`. Captured as #87; `session-prefetch.sh` now uses `--legacy-peer-deps` as a workaround. Any future heartbeat picking a dashboard Issue needs to know this first.
- **`npm install` silently rewrites lockfiles** when `package.json` drifts — dashboard's lockfile shed 120 lines of `overrides` resolution branches. Switching the prefetch to `npm ci` (when lockfile present) would surface drift loudly instead of hiding it. Captured as #89.
- **PR stack is the load-bearing orient signal, but isn't prefetched**: had to burn ~4 tool calls to learn there are 17 open PRs (15 conflicting). Adding an `## Open PRs` block to `session-prefetch.sh` would put the stack-drain state front-and-center. Captured as #90.
- **Remote session starts HEAD-detached**: every remote tick pays the `git checkout main` paper cut before anything useful happens. Minor; not filed.

## Issues touched
| Issue | Outcome | D-ID |
|---|---|---|
| #61 — SessionStart `npm install` prefetch | **Delivered** on branch `issue-61/session-prefetch-npm-install`; PR #88 opened, Prepare CI green, Agent review queued. | D-20260418-040 |
| #86 (new) — dashboard `jest-environment-jsdom` missing | **Captured** (Polsia Rule 2). Surfaced when verifying #61 AC: root `npm test` passes 24/24 but dashboard tests fail on missing env. | — |
| #87 (new) — dashboard `overrides` drift forces `--legacy-peer-deps` | **Captured** (Polsia Rule 2). Root cause of the ERESOLVE that motivated the `--legacy-peer-deps` flag in #61's PR. | — |
| #89 (new) — prefer `npm ci` over `npm install` in prefetch | **Captured** (self-improvement pass). Pattern surfaced during #61 verification. | — |
| #90 (new) — prefetch should render open-PR block | **Captured** (self-improvement pass). 4 tool calls' worth of toil per tick. | — |

## PRs opened
| PR | Head | Target | State at tick end |
|---|---|---|---|
| **#88** — `feat(harness): npm install on SessionStart (#61)` | `issue-61/session-prefetch-npm-install` | `main` | Open; Prepare ✓, Agent review queued (Copilot). Subscribed to PR-activity webhook per user instruction. |

No auto-merge attempted — gates aren't wired yet (#37 ships the evaluator but not the caller), and the Issue does not carry `auto-merge:ok`. Merge remains in the manual stack-drain flow per #64.

## Decisions recorded
- **D-20260418-040** — new entry appended below; this report.

## Superpowers skills explicitly invoked
- (None called via the Skill tool this tick.) TDD was not applicable — the deliverable is a shell prefetch script and the AC is behavioral ("run the script, confirm `npm test` works"); verified via direct execution. `superpowers:verification-before-completion` discipline **was applied in spirit** — every claim in the PR body is backed by a command that was actually run this tick (root `npm test` 24/24 pass; `sed -n '1,16p' .claude/session-state.md` shows the new block populated).
- Mid-flight captures used `mcp__github__issue_write` rather than a skill, consistent with Polsia Rule 2.

## Self-improvement recommendations filed
- **#89** — prefer `npm ci` in `session-prefetch.sh` to avoid silent lockfile rewrites.
- **#90** — add `## Open PRs` block to the prefetch so the stack state is visible at orient.

## Dev-Q&A housekeeping
- `Q-20260418-001` (two-"Part 6"-files naming) — still awaiting user answer; no action this tick.

## Notes for the next heartbeat
- Do **not** open a 2nd PR this session — the stack (17 open, 15 conflicting per #64) is the primary drag on forward progress. One PR per tick is the ceiling until the stack drains.
- Webhook subscription active on #88; Agent review conclusion will arrive asynchronously. If findings are small+tractable, address on the branch; if ambiguous, ask the user first.
- #86 and #87 together define the minimum work to get `dashboard/ && npm test` green on a fresh clone. Worth bundling into a single future PR if scope allows.
