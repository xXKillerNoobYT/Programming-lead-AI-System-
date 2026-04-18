# Dev Q&A — Design Questions Awaiting User Answer

**Purpose.** This is the asynchronous, file-based channel for design questions from the heartbeat system (Claude Code in a session today; `heartbeat.js` once it can decompose plans itself) to the user. The user answers periodically — not synchronously — and answers unblock tasks.

This file is the *only* writable file under `Docs/Plans/`. All other files in that folder are locked user intent (see `CLAUDE.md` §2).

## Cross-Plan Compatibility
- Canonical map: `Docs/Plans/Plan Compatibility Index.md`
- Q&A answers must reconcile with: `Part 1.md`, `Part 3.md`, `Part 6 LLM Usage Strategy.md`, `Part 7 Polsia-Style Autonomous SDLC Lifecycle.md`, and `Part 7 UI Master Plan.md`.
- If an answer conflicts with existing locked intent, record the conflict in `decision-log.md` and route as a design-change decision before implementation.

## How This Works
1. **The system posts a question** here when a design decision is required AND one or more of these apply:
   - It blocks an Issue or the work on an Issue
   - Two or more reasonable defaults exist AND the choice is hard to reverse
   - The answer is not already in `Docs/Plans/Part *.md`, `decision-log.md`, `architecture.md`, `memory.md`, or the code
   - A `/loop` or cron heartbeat can't afford to block (no interactive user right now) but the question must be raised before work continues
2. **The system keeps working** on unblocked Issues while the question is open. Do not stall the heartbeat on an open Q&A.
3. **The user answers** when convenient. Just append your answer to the entry (or reply in-line).
4. **The next heartbeat that sees the answer**:
   - Records the decision as a new `D-YYYYMMDD-###` entry in `decision-log.md` (long-term home)
   - Removes the question from this file
   - Acts on the answer in the same heartbeat if feasible; otherwise files a new Issue
5. **Cleanup triggers** — remove an entry from this file when any of these happen:
   - a. User has answered it (record in `decision-log.md` first)
   - b. The task the question was blocking has already been completed a different way (note the removal in the next run report)
   - c. The question is no longer relevant (project scope changed, rule changed, etc. — again note in run report)

## Entry Format
Each open question is a level-3 heading block:

```markdown
### Q-YYYYMMDD-### — Short Title
**Posted**: YYYY-MM-DD by [Claude Code Run N | heartbeat.js tick TT]
**Blocks**: Issue #XX (and optionally: other Issues, other work)
**Context**: 1–3 sentences of why this came up.
**Options considered**:
- A. …
- B. …
- C. …
**Recommendation (non-binding)**: …
**Hard-to-reverse?**: yes/no

**User answer**: _(empty — awaiting)_
```

Q-IDs mirror the D-ID format but with `Q-` prefix. Reserve the same number for the matching D-ID when answered (e.g., Q-20260417-003 → D-20260417-019 if that's the next free D-slot; the mapping is 1-to-many in practice, so don't force parity).

## Open Questions

### Q-20260418-004 — Which open branches do you consider to have "uncompleted tasks"?
**Posted**: 2026-04-18 by Claude Code Run 63
**Blocks**: Tracking Issue #84 (`type:question` + `status:needs-user`). Your directive was *"there are quite a few branches without completed tasks feel free to complete those tasks first but please try and focus on a branch and get all the tasks completed on that branch so you can close it properly."* I want to act on it, but my survey disagrees with your premise so I don't want to guess wrong.
**Context**: I surveyed all 15 open PRs. Every one of them has its direct-scope closing Issue **already CLOSED**:
| PR | Branch | Closes | Issue state |
|---|---|---|---|
| #14 | run-11/ui-master-plan | (none) | — |
| #25 | run-17/phase-3-plan | #7 | CLOSED |
| #29 | run-22/phase-4-plan | #8 | CLOSED |
| #32 | run-25/dependabot-triage | #12 | CLOSED |
| #43 | run-30/phase-3-check-scripts | #17, #35 | BOTH CLOSED |
| #46 | run-36/phase-3-cohesion-runner | #23 | CLOSED |
| #47 | run-40/phase-4-ci-workflow | #26 | CLOSED |
| #48 | run-41/dependabot-transitive-fix | #30 | CLOSED |
| #49 | run-42/filesystem-mcp-portability | #41 | CLOSED |
| #50 | run-43/phase-4-env-dotenv | #27 | CLOSED |
| #51 | run-44/phase-4-pm2-ecosystem | #28 | CLOSED |
| #53 | run-45/phase-3-coverage-floor | #52 | CLOSED |
| #55 | run-46/phase-3-arch-lint | #54 | CLOSED |
| #60 | issue-37/auto-merge-gate | (none) | — |
| #63 | meta/q-002-stack-recovery | (none) | — |

From my side, all 13 scope-closing PRs have complete work — they're waiting to merge, not needing more work. I may be missing a different axis of "completeness":
**Options considered**:
- **A. CI/tests failing on some branches** — a PR can close its Issue scope but still have broken tests. I haven't run each branch's CI.
- **B. Unchecked task-list items in PR bodies** — some PR descriptions may have `- [ ]` items still unchecked even though the "closes #N" Issue is closed. I haven't grep'd bodies.
- **C. PRs #14, #60, #63 have no `closes` reference** — maybe one of those is the incomplete-looking one. #14 is the old "Part 6 UI Master Plan" (since renamed Part 7 per D-007), #60 is the auto-merge-gate script, #63 is my meta branch.
- **D. Your memory of the state is from an earlier point** — e.g., before I swept #65/#79 closed today; the user-facing queue used to show 17, now 15. Might just be "I thought there were more outstanding."
- **E. Something else I'm not detecting** — draft state, CODEOWNERS reviews needed, Dependabot relationships, branch-protection gates.
**Recommendation (non-binding)**: tell me which **specific branch** you had in mind, or which **axis** you were looking at (CI red, task-list unchecked, PR description says "TODO", etc.). I'll pick that branch and complete it.
**Hard-to-reverse?**: no

**User answer**:it A + B + C for sure all of that applys I want your workflow to be more focased on completing one branch at a time before moving to the next. making sure each feature or fix is fully completed, tested, and merged before starting on another branch. as long as your not held back by Questions or not having the necessary information, focus on finishing one branch completely before moving on to the next. then move on to the next branch in the queue. but make sure to have the the Q&A issue made and linked to the branch so that any questions or clarifications are tracked properly. and when I anser them you should address them promptly making that brach the next one in line to complete. as for now look at all the open branches and prioritize them based on which one can be fully completed, tested, and merged first. and see if there are any Q&A issues linked to those branches that need attention that did not make it into the GitHube issue tracker. as well as other blockers that might prevent a branch from being completed. those should be addressed before moving on to the next branch. or have a Q&A issue created for them if necessary. you can fail you dont have all the info fell free to ask clarifying questions. I am a desiner not a coder i know what i want this to do not how to get there thats your job to figure out. but the Q&A will help us both and will tie in nicly with this program. I got the core of how I want this to work, now I need you to execute it. and there are a lot of details to manage, so having a structured approach with Q&A issues will help ensure nothing is missed. and that the gaps get fild

---

## Related
- `decision-log.md` — long-term home for answers once the user decides
- `CLAUDE.md` §4 — Ask-Question Protocol (in-session blocking; this file is the async cousin)
- `CLAUDE.md` §6 — project conventions, including when to post here vs call `AskUserQuestion`
