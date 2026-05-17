---
id: 4289965242
number: 109
title: >-
  Bug-hunt /loop notebook lost silently across branch switches — needs
  durability strategy
state: closed
created_at: '2026-04-19T05:04:47Z'
updated_at: '2026-04-19T05:22:54Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653140
    name: 'type:bug'
    color: D73A4A
    description: Bug to fix
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
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/109
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/109'
closed_at: '2026-04-19T05:22:54Z'
---
# Bug-hunt /loop notebook lost silently across branch switches — needs durability strategy

**Parent**: #105 (recurring bug-hunt /loop)
**Fingerprint**: `FP: loop/notebook-loss/branch-switch-deletes-working-file`
**Surfaced by**: bug-hunt /loop tick 1b (2026-04-19) as a self-finding

## Symptom

Tick 1 wrote `reports/bug-hunt-notebook.md` on branch `bugfix/react-19-stable-upgrade` but did **not** commit it. Between tick 1 and tick 1b, the Claude Code harness (or a parallel session, or PR #103 landing + branch-cleanup) switched HEAD from `bugfix/react-19-stable-upgrade` → `main`. The uncommitted notebook file was deleted by the branch switch.

## Why this matters

The bug-hunt /loop ([#105](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105)) relies on its notebook as **working memory across ticks** — dedupe fingerprints, deferred items, branch/origin snapshots. Silent loss of the notebook means:

- False-positive re-filing of already-known bugs (dedupe depends on reading prior FP entries)
- Loss of "deferred to next tick" items (the tick-2 plan was partly inside the lost notebook)
- Loss of audit-history for human review

This is **the loop's own working memory being corrupted by the harness** — exactly the class of silent drift the loop exists to catch, so it's fitting that the loop caught it on itself.

## Root cause

Two design assumptions collided:

1. A Write tool call creates a file on disk, but git doesn't know it exists until `git add` / commit.
2. When the harness (or a parallel session) switches branches, uncommitted files either travel with the checkout OR get deleted, depending on tracked-status. An uncommitted, untracked file created on a branch that then gets deleted → the file is effectively unreachable.

## Options for durability

- **A. Commit the notebook to `main` on first write, and again after every tick update.** Matches the `reports/run-*.md` convention. Churn: one commit per tick; could be noisy but honest. If direct-main commits are policy-blocked, each tick ships a tiny PR.
- **B. Move the notebook to `.claude/bug-hunt-notebook.md`** (same folder as `launch.json`, `scheduled_tasks.lock`, etc). `.claude/` is Claude-Code-specific state and may have its own durability guarantees. Need to verify whether it's gitignored or tracked per-file.
- **C. Make the notebook fully regeneratable from GitHub** (Issue #105 body + comment thread + child-Issue metadata), so local loss is cheap. Write tick sections into a `## YYYY-MM-DDTHH:MMZ` GH comment on #105 as the authoritative record; local notebook is just a rendered cache.
- **D. Hybrid**: use C (GitHub as truth) + still write a local notebook as a convenience cache, explicitly stamped with a "regenerate if missing" header (that's what tick 1b did as a stopgap).

**Recommendation**: **D** — it's resilient to any harness behavior, doesn't churn commits, and aligns with CLAUDE.md §2's source-of-truth hierarchy (GitHub Issues rank above local files).

## AC

- [ ] A decision is recorded (in decision-log.md with a D-YYYYMMDD-### ID) about which durability strategy the loop uses.
- [ ] The chosen strategy is implemented in [#105](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105)'s per-tick checklist.
- [ ] Tick N+1 verifies the notebook (or its equivalent) survives a simulated branch switch.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T05:04:47Z
**Updated:** 2026-04-19T05:22:54Z
**Closed:** 2026-04-19T05:22:54Z
**Labels:** type:bug, status:backlog, autonomous-lead, phase:meta
