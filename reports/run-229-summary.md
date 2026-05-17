# Run 229 — Issue #152 §D.3.b inspector polish + #155 peer-dep regression + #157 self-improvement

**UTC timestamp**: 2026-04-20 (scheduled remote heartbeat)
**Branch**: `issue-152/inspector-polish` → PR #156 (draft)
**Collision check**: PASS — `git fetch --all --prune` + `git log --since="15 minutes ago" --all` returned zero fresh commits. Local `main` fast-forwarded 38 commits to `63253df` before branching.

## Insights this tick
- **Peer-dep regressions keep biting fresh remote sessions.** #86 (2026-04-18, `jest-environment-jsdom`) and now #155 (this tick, `@testing-library/dom`) are the same class — npm 10+ prunes un-owned peer deps on clean install. Each costs ~4 tool calls of debugging before the first productive edit. Filed #157 (`check:peer-deps` script) to catch the whole class at once instead of playing whack-a-mole per package.
- **TDD discipline paid off concretely here.** Writing the 6 new tests first caught that ACs 3a and 3b were already green without any code change — the existing `CodingTabContent` discriminator (`selectedMessage !== undefined`) already handles `null` correctly. Without TDD I'd have "fixed" a non-bug or missed locking the semantic.
- **`document.activeElement` restoration works in jsdom without user-event.** `trigger.focus()` + `fireEvent.click()` transfers focus correctly enough that the unmount-cleanup restoration round-trip is observable. No need to upgrade to `@testing-library/user-event` for this leaf — `fireEvent` was sufficient.
- **Inline-fixing a blocker Issue inside the feature PR is justified** when the blocker directly gates the feature's own verification criterion. #155 blocked #152's AC (`npm test` all green), so landing both together in PR #156 is the correct call; the alternative (separate PR for #155, then rebase #152) would have added a full round-trip before the feature could even be verified.

## Issues touched

| Issue | Outcome | D-ID |
|---|---|---|
| **#152** — §D.3.b inspector polish (focus + copy feedback + null-selection) | **Delivered** on branch `issue-152/inspector-polish`; PR #156 opened as draft. All 6 new tests + 148 baseline tests green. Closes via PR merge. | D-20260420-001 |
| **#155** — @testing-library/dom missing from devDependencies (filed + fixed this tick) | **Captured and delivered** in the same PR. `dashboard/package.json` now lists `@testing-library/dom ^10.4.1`; `npm install --legacy-peer-deps` regenerates a clean lockfile. | D-20260420-001 |
| **#157** — `check:peer-deps` script to catch unowned peers (self-improvement) | **Captured** (self-improvement pass). Motivated by the #86+#155 pattern costing ~4 tool calls per occurrence. | — |
| **#86** — `jest-environment-jsdom` missing from devDependencies | **Commented** — dep is already in `package.json` today (line 42); original symptom no longer reproduces. Recommended close after PR #156 merges, left open for user's explicit close (§5 guardrail — "No closing GH Issues you did not resolve"). | — |

## PRs opened

| PR | Head | Base | State at tick end |
|---|---|---|---|
| **#156** — `feat(dashboard): Issue #152 inspector polish + #155 @testing-library/dom` | `issue-152/inspector-polish` | `main` | Draft; CI status **pending**; 0 check runs; 0 review comments; user subscribed to PR-activity webhook. |

Auto-merge **NOT** attempted — #152 does not carry `auto-merge:ok`, and gate-3 (no-merge-conflicts) + gate-2 (no blocker findings) haven't been evaluated by CI yet. One PR this session.

## Pipeline stations (CLAUDE.md §3 + §0b skill mapping)

| Station | Skill invoked? | Notes |
|---|---|---|
| Orient (Step 1) | — | Prefetch stale; used `mcp__github__list_issues` (persisted to disk at 98 KB — same pattern #96 called out) and parsed via Python one-liner. `Dev-Q&A.md` clean — no user answers to transcribe. |
| Pick (Step 2) | — | Priority walk: `status:in-progress` → **#152** (the most recent in-progress task; other in-progress items #64 #105 are epics whose children are user-merge tasks or polling loops). Oldest-first not needed — #152 was the obvious continuation of last session's §D.3.b landing. |
| Consult decisions (Step 3) | — | Reviewed D-20260419-045 (parent §D.3.b landing) — confirmed the polish approach matches the Issue's own recommended implementation pattern. No prior decision covers focus-trap policy; this leaf's self-contained mount/unmount approach defers that to a later leaf. |
| Brainstorm | — | Not invoked — AC was prescriptive (specific code locations + test assertions listed in the Issue), no design-space to explore. |
| Plan | — | Not invoked — single-file implementation + test file, scope < 1 heartbeat. |
| TDD (Step 4) | `superpowers:test-driven-development` (spirit) | **Red run evidence**: `Tests: 4 failed, 23 passed, 27 total` — tests 21 (focus-on-mount), 22 (focus-restore), 23 (Copied), 24 (Copy failed). Tests 25–26 green without code change (existing discriminator). **Green run evidence**: `Tests: 27 passed, 27 total` coding-tab; `Tests: 154 passed, 154 total` suite-wide. |
| Capture (Step 4b) | — | Mid-flight capture: **#155** filed and fixed (peer-dep regression that blocked #152's verification). |
| Verify (Step 5) | `superpowers:verification-before-completion` (spirit) | `npm test` → 154/154 green. `npm run build` → Next 15.5.15 compiled successfully; 4/4 static pages. `npm run check:types` → clean. `node scripts/check-arch.js` → 3/3 PASS. Every AC claim above backed by a command I actually ran. |
| Record (Step 6) | — | This report + D-20260420-001 appended; no `memory.md` update (peer-dep pattern is already implicitly captured in #157 — promoting to `memory.md` once #157 lands). |
| Commit (Step 7) | — | Conventional commit with D-ID + Issue #s (`Closes #152`, `Closes #155`), pushed to `origin`, PR #156 created via `mcp__github__create_pull_request`. |
| PR review panel | — | Pending — CI not yet started; webhook subscription active. |

## Superpowers skills invoked
- `superpowers:test-driven-development` (spirit) — red run before green run; both runs' output captured in PR body.
- `superpowers:verification-before-completion` (spirit) — every AC claim backed by a command's actual output.
- `post-dev-qa` — not needed this tick; no design ambiguity surfaced.

## Self-improvement recommendations filed
- **#157** — `dashboard/scripts/check-peer-deps.js` that fails if any devDep's peer is unlisted. Solves the #86+#155 class; would cost ~40 lines of Node + a `check:peer-deps` package.json script; wired into `check:all` closes the loop on fresh-install surprises.

## Dev-Q&A housekeeping
- `Docs/Plans/Dev-Q&A.md` had no open questions at Step 1 orient. No transcription needed.

## Notes for the next heartbeat
- **PR #156 is the live PR** — subscribe hook already active per user instruction. If CI turns green and no blocker reviews arrive, it's a prime candidate to carry the `auto-merge:ok` label once the gate runner (Issue #37, PR #60) lands.
- **§D.3.c inline diff rendering (Issue #154)** is the backbone continuation once #152 lands. That's the next §D backbone leaf.
- **#157 (check:peer-deps)** would, in retrospect, prevent Runs 29 + 229 from eating ~4 tool calls each at the top. Prioritize it before the next remote tick if possible — high leverage for small scope.
- Do not open a 2nd PR this session. Stack-drain is still governed by D-20260418-025 (user action); each new PR adds merge pressure. #156 is this session's ceiling.
