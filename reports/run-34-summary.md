# Run 34 — `gh` CLI remote-session fix (#62) + 2 self-improvement captures

**UTC timestamp**: 2026-04-19 ~01:17–01:30 UTC
**Session kind**: scheduled remote heartbeat (single productive tick, shipped #62 as PR #94)
**Collision check**: PASS — `git fetch --all --prune` + `git log --since="15 minutes ago" --all` returned zero fresh commits. Local `HEAD` arrived detached at `345d3e8` (Run 33's abort notice); checked out `main`, fast-forwarded 7 commits from `a1d0f02` to `345d3e8` (pulling in Runs 28–33 reports that hadn't propagated locally).

## Insights this tick:
- **The very bug #62 describes bit this session immediately at orient.** `session-prefetch.sh` wrote `gh: command not found` into `session-state.md`, and every doc reference to `gh issue list` / `gh issue close` / `gh api graphql` pointed at a binary that isn't here. Strong confirmation that #62's fix is the right scope.
- **`mcp__github__list_issues` returned 56 KB of JSON** for 28 open Issues. Over the inline-output cap → persisted to disk → parsed with a custom Python one-liner to get a 28-row table. That's ~5 tool calls and a parsing hop every session. Same with `list_pull_requests` (54 KB). Captured as #96 — compact REST-API-rendered tables in prefetch.
- **§3 Step 2 priority tree gets re-derived every tick** — ~8 Issue-tree navigations before the first edit landed. The prefetch could compute the tree once and emit a `## Recommended pick` block. Captured as #98.
- **PR #88 (Run 29's deliverable) is still open and mergeable-clean** — waiting on the stack-recovery user flow (D-20260418-025 Option A). I did not merge it; the epic explicitly defines that as a user action. This session deliberately added no extra merge pressure.

## Issues touched
| Issue | Outcome | D-ID |
|---|---|---|
| #62 — prefer GitHub MCP over `gh` CLI in remote sessions | **Delivered** on branch `issue-62/prefer-github-mcp-over-gh-cli`; PR #94 opened; Prepare CI queued; user subscribed to PR-activity webhook. | D-20260419-001 |
| #96 (new) — session-prefetch should render compact Issues/PRs tables via GitHub REST | **Captured** (self-improvement pass). Motivated by this session's 56 KB / 54 KB MCP outputs. | — |
| #98 (new) — session-prefetch should emit a `## Recommended pick` section | **Captured** (self-improvement pass). Motivated by ~8 tool calls of Step 2 priority-tree re-derivation. | — |

No mid-flight Polsia Rule 2 captures (the scope of #62 was tight: 3 files, text-only).

## PRs opened
| PR | Head | Target | State at tick end |
|---|---|---|---|
| **#94** — `docs(harness): prefer GitHub MCP over gh CLI in remote sessions (#62)` | `issue-62/prefer-github-mcp-over-gh-cli` | `main` | Open; `Prepare` check **queued**; no reviews; no review comments; user subscribed to PR activity per in-session instruction. |

No auto-merge attempted — #62 does not carry `auto-merge:ok` and the Merge-station wiring from #62 hasn't been consumed by a real auto-merge run yet.

## Pipeline stations (CLAUDE.md §3 + §0b skill mapping)

| Station | Skill invoked? | Notes |
|---|---|---|
| Orient (Step 1) | — | `session-prefetch.sh` already wrote most state; supplemented with `mcp__github__list_issues` and `mcp__github__list_pull_requests` because prefetch's `gh issue list` failed (the very bug being fixed). |
| Pick (Step 2) | — | Manual walk of priority tree: `status:in-progress` → #64 epic (all children are user-merge tasks, defer); oldest `status:backlog` leaf that isn't a user-merge task → **#62**. Backbone-override not triggered (#62 is itself meta but directly unblocks every future remote tick). |
| Consult decisions (Step 3) | — | Reviewed D-20260418-025 (stack-recovery), D-20260418-040 (Run 29), D-20260418-013 (singular-heartbeat). No prior decision covers the `gh`-vs-MCP dual-path question. |
| Execute (Step 4) | *(none — pure docs + shell)* | TDD not applicable: changes are documentation + a `command -v gh` detection branch. Verification done by running the script and grepping the docs. |
| Capture (Step 4b) | — | No new bug/gap surfaced. |
| Verify (Step 5) | `verification-before-completion` (spirit) | `bash .claude/scripts/session-prefetch.sh` exits 0 and writes the friendly note instead of `gh: command not found`. `grep -n "gh " CLAUDE.md .claude/commands/heartbeat.md` shows every `gh` command paired with an MCP equivalent. Root `npm test` → **24/24 pass** on the branch. |
| Record (Step 6) | — | This report + D-20260419-001 appended below; no `memory.md` update (nothing durable enough). |
| Commit (Step 7) | — | `docs(harness): prefer GitHub MCP over gh CLI in remote sessions (#62)` on branch, pushed to `origin`, PR #94 created via `mcp__github__create_pull_request`. |
| PR review panel | — | `Prepare` check queued; no reviews yet; webhook subscription active per user instruction. |

## Superpowers skills explicitly invoked
- None called via the Skill tool this tick — the work was pure doc editing + one-line shell branch. `verification-before-completion` applied in spirit (every AC claim is backed by a command that was actually run: `npm test` output, `grep` results, `bash .claude/scripts/session-prefetch.sh` exit code).
- `post-dev-qa` not needed — no design ambiguity surfaced.

## Self-improvement recommendations filed
- **#96** — session-prefetch should render compact Issues + PRs tables via GitHub REST API (bypasses `gh` AND MCP output-size limits). Likely subsumes #90.
- **#98** — session-prefetch should emit a `## Recommended pick` section with the §3 Step 2 priority tree pre-computed (saves ~8 tool calls per orient, improves small-LLM workability).

## Dev-Q&A housekeeping
- `Q-20260418-001` (two-"Part 6"-files naming) — still awaiting user answer; no action this tick. PR #14 (which would land the second "Part 6 <suffix>.md") remains open and cleanly mergeable; the naming decision is reversible via later `git mv` per the Q's own recommendation.

## Notes for the next heartbeat
- PR #94 is the new live PR; #88 is still open from Run 29. The stack is now 17 open PRs.
- If PR #94 gets a tractable Copilot review comment (e.g., "prefer `command -v gh` returning early" or "group the two install loops"), the fix is small + in-scope — apply on branch. If the review asks for something architectural (e.g., "kill the `gh` path entirely"), post a Q-20260419-### and pick a different Issue next.
- Do not open a 3rd PR in the next session either — stack drain is still the primary drag per D-20260418-025. One PR per tick remains the ceiling.
- #96 and #98 together would shave ~5 minutes + ~8 tool calls off every future orient. Worth prioritizing once the stack drains.
