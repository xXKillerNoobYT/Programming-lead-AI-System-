---
id: 4289647261
number: 98
title: >-
  session-prefetch should emit a `## Recommended pick` section — pre-compute §3
  Step 2 priority tree at orient
state: open
created_at: '2026-04-19T01:25:05Z'
updated_at: '2026-04-20T07:25:57Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653121
    name: 'type:task'
    color: 0E8A16
    description: Atomic implementation task
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
  - id: 10728044845
    name: 'phase:meta'
    color: ededed
  - id: 10739055869
    name: 'priority:low'
    color: C5DEF5
    description: Nice-to-have; work on when higher bands empty
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/98
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/98'
---
# session-prefetch should emit a `## Recommended pick` section — pre-compute §3 Step 2 priority tree at orient

## Pattern observed

**Run 34 (this session)** — Step 2 ("pick ONE atomic task") required walking the §3 Step 2 priority tree manually from scratch:

1. Find any `status:in-progress` → #64 is in-progress, but it's an epic with 17 open children, so not a leaf.
2. Find any open sub-issue of an in-progress parent → 17 sub-Issues, all of shape "Merge PR #X" which are *user* actions per D-20260418-025.
3. Find the oldest `status:backlog` Issue that isn't a sub-Issue of an in-progress epic → #19 (epic), #24 (Part 6 §D.1), then #62.
4. Deviation check: is #19 a better pick? It's an epic (children needed), and blocked on PR #14. #62 wins.
5. Read #62, verify it's tractable, pick it.

That's **~8 tool calls of Issue-tree navigation** before a single edit lands. Every session repeats this.

## Impact

- ~5 min of the session is spent re-deriving a decision tree the system could render once during prefetch.
- New sessions are more likely to deviate from the priority tree (get distracted, skip the leaf-first rule, etc.) because the tree isn't surfaced directly — only the raw Issue list is.
- Worse: small-LLM workability suffers — if we eventually let Haiku or a local model drive the heartbeat, the priority tree is exactly the kind of reasoning it'll struggle with under context pressure.

## Proposed change

Extend `session-prefetch.sh` (or its REST helper from sibling Issue for compact tables) to emit a **`## Recommended pick`** section with:

1. **Top candidate** — Issue # + title + why it matches §3 Step 2 rules (which rule fired, whether it's a leaf, whether it's in-progress, etc.).
2. **Runner-up** — one alternative, so the agent can compare and deviate consciously per §6 "softened oldest-first".
3. **Backbone check** — flag if the backbone-override rule from §6 might apply (newer Issue advancing `heartbeat.js` / MCP orchestrator / branch-management vs. housekeeping older queue).

Algorithm (pseudo):
```
issues = open_issues_sorted_by_created_asc
in_progress = [i for i in issues if 'status:in-progress' in i.labels]
if in_progress:
    # prefer any open leaf under in_progress parent
    leaves = leaves_of(in_progress)
    if leaves: return leaves[0]
    return in_progress[0]
backlog = [i for i in issues if 'status:backlog' in i.labels and not i.is_sub_of_in_progress]
leaves = [i for i in backlog if not i.has_open_children]
return leaves[0]  # oldest-first default
```

This is exactly the tree documented in CLAUDE.md §3 Step 2 — shifting it from "agent re-derives every tick" to "prefetch computes once, agent verifies".

## Acceptance
- [ ] `.claude/session-state.md` has a `## Recommended pick` section after the Issues table.
- [ ] Format: 2–3 lines max, naming Issue #, title, and rule that fired.
- [ ] Runner-up listed too, with a one-line delta.
- [ ] On a session where a `status:in-progress` epic has open leaves, pick is a leaf (not the epic).
- [ ] Graceful degradation: if the Issues table helper didn't run (no `$GITHUB_TOKEN`), section says *"(no data — run orient manually)"*.

## Pattern source

Captured by the Run 34 self-improvement pass — see `reports/run-34-summary.md`.

## Related
- Sibling Issue for the compact Issues/PRs tables (prerequisite — this Issue consumes that data).
- `issue-triage-picker` subagent defined in the harness already does similar reasoning — consider calling it from prefetch, or porting its logic.
- CLAUDE.md §3 Step 2 (the tree being encoded).
- CLAUDE.md §6 ("softened oldest-first") — the "why" behind listing the runner-up.

## Labels
`type:task`, `phase:meta`, `status:backlog`

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T01:25:05Z
**Updated:** 2026-04-20T07:25:57Z
**Labels:** type:task, status:backlog, autonomous-lead, phase:meta, priority:low
