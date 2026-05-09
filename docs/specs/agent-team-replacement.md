# Agent-Team Coding Replacement for Claude Code

**Status:** Draft (spec-before-code, awaiting CEO confirmation)
**Author:** CTO agent (`328fddb9-26b4-4475-9ed3-6265d23e7816`)
**Issue:** WEI-633 (parent: WEI-472)
**Created:** 2026-05-09
**Convention:** Chaos Coding spec-before-code (scope · architecture · AC · risks · rollback)

---

## 1. Scope

### In scope
Replace the single-process Claude Code heartbeat with a **team of Paperclip agents** that collectively own coding execution for the `Programming-lead-AI-System-` repo. Concretely:

- An **Orchestrator** agent that picks the next GitHub Issue, classifies it, and dispatches to the right specialist.
- A small set of **Specialist** coding agents (coder, reviewer, tester) running on Paperclip wake-on-demand.
- A **Release** path for merging once review + tests pass.
- A documented routing contract (which agent owns which loop) that survives in `docs/specs/` and the per-agent `AGENTS.md` bundles.

### Out of scope (Phase 1 of this replacement)
- Retiring Claude Code immediately. Claude Code remains the fallback executor until the team has run cleanly for ~7 days (per WEI-71 followup phase 2 readiness criterion).
- New infrastructure (Docker, k8s, cloud queues). Paperclip's existing wake-on-demand surface is the dispatcher.
- Cross-repo orchestration. This spec covers only `Programming-lead-AI-System-`.
- Modifying `SOUL.md` or vault `Docs/Plans/*` (still locked).

### Non-goals
- Replacing the **product** runtime (`heartbeat.js`) — that is a separate program. This spec covers the *builders*, not the *built thing*.

---

## 2. Architecture

### 2.1 Operating model — who owns what loop

| Loop | Owner agent | Role | Reports to |
|---|---|---|---|
| **Plan decomposition** | DevLead Programming Lead (orchestrator) | Reads vault `AI plans/`, refills GH backlog ≥3, classifies Issues | CTO |
| **Coding (frontend)** | Frontend Specialist | Next.js / React / Tailwind work in `dashboard/` | DevLead |
| **Coding (backend)** | Backend Specialist | Node.js core, `heartbeat.js`, MCP, scripts | DevLead |
| **Test authoring** | Test Specialist | Vitest/Jest + node:test coverage, fixtures, eval suite | DevLead |
| **Code review** | Reviewer Specialist | PR review against `.roo/rules/rules.md` + CLAUDE.md guardrails; ingests security-scan output (#187) | DevLead |
| **Release / merge** | DevLead (acts as merger) | Owner-vs-contributor branching (#188), merge gate enforcement (#185) | CTO |
| **Escalation** | CTO (this agent) | Hard stops, large-direction changes, budget overruns | CEO (Isaac) |

### 2.2 Routing contract

```
GH Issue (status:backlog)
    │
    ▼
DevLead orchestrator (heartbeat tick)
    │  classify by labels: phase, area:ui|backend|test|docs
    ▼
Specialist wake-on-demand (Paperclip POST /api/agents/{id}/wake)
    │  one atomic Issue → one feature branch off origin/main
    ▼
Specialist commits, pushes, opens PR (cites Decision ID + Issue #)
    │
    ▼
Reviewer Specialist wakes on PR-opened (Paperclip webhook or wake hint)
    │  runs npm test, check-arch, security-scan, posts review
    ▼
DevLead merges if green; on red, comments + reassigns to owning specialist
    │
    ▼
Issue closed with run-complete D-ID; queue refilled to ≥3
```

### 2.3 Instruction-bundle layout

Each agent gets a `managed` instructions bundle keyed off this repo:

- `.paperclip/agents/devlead-programming-lead/AGENTS.md` — orchestrator (already seeded, commit `0313b5c`)
- `.paperclip/agents/coder-frontend/AGENTS.md` — to be created
- `.paperclip/agents/coder-backend/AGENTS.md` — to be created
- `.paperclip/agents/tester/AGENTS.md` — to be created
- `.paperclip/agents/reviewer/AGENTS.md` — to be created

All four specialists cite **`CLAUDE.md` as the canonical operating contract** (per existing seed convention). When the AGENTS.md and CLAUDE.md disagree, CLAUDE.md wins.

### 2.4 Budget envelope

| Agent | Heartbeat | Budget/mo |
|---|---|---|
| DevLead | 1/day + wake-on-demand | $30 |
| Coder-Frontend | wake-on-demand only | $40 |
| Coder-Backend | wake-on-demand only | $40 |
| Tester | wake-on-demand only | $20 |
| Reviewer | wake-on-demand only | $20 |
| **Total** | | **$150/mo** |

Budget controls scaffold (#189) gates this. If burn-rate exceeds the envelope, DevLead pauses specialists and pages CTO.

---

## 3. Acceptance Criteria

The replacement is **MVP-complete** when all of these hold for one full week:

1. **AC-1**: An Issue labeled `area:ui` is closed end-to-end via the Frontend Specialist (no Claude Code intervention) — commits, PR, review, merge all done by team agents.
2. **AC-2**: An Issue labeled `area:backend` is closed end-to-end via the Backend Specialist.
3. **AC-3**: `gh pr list --state merged --limit 5` shows ≥1 PR authored by a specialist agent and reviewed by the Reviewer Specialist.
4. **AC-4**: `decision-log.md` contains run-complete D-IDs from at least two distinct specialist agents.
5. **AC-5**: Total spend on coding agents ≤ $150 in the trial week (budget control verified).
6. **AC-6**: Zero hard-stop violations (no force-push, no `--no-verify`, no SOUL.md edits, no secret commits).
7. **AC-7**: This spec is referenced from `CLAUDE.md` (or successor) and from each specialist's `AGENTS.md`.

---

## 4. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Specialists diverge on conventions | Med | High | Each AGENTS.md is a derivative pointer to CLAUDE.md; CLAUDE.md wins on conflict. |
| Budget runaway from parallel wakes | Med | High | `maxConcurrentRuns: 1` per specialist; DevLead serializes dispatch; #189 budget gates enforce monthly cap. |
| Reviewer rubber-stamps own ecosystem's PRs | Low | High | Reviewer is a *separate* agent. PRs must pass `npm test` + `check-arch` + security scan **before** review (#185, #187). |
| Cross-agent state drift (one agent's local main is stale) | High | Med | Branch hygiene rule already in CLAUDE.md §6: branches off `origin/main`, instruction-file canonical-main rule. |
| Issue mis-classification by orchestrator | Med | Med | Labels are explicit (`area:ui|backend|test|docs`); on ambiguous label, DevLead falls back to itself (acts as generalist) and files a child Issue to add the missing label. |
| Specialist hangs / crash leaves Issue in `status:in-progress` | Med | Low | Paperclip checkout has a run timeout; DevLead's orient step detects stale `status:in-progress` and re-dispatches. |
| Merge conflict from parallel specialists | Low | Med | DevLead serializes dispatch — only one specialist works per heartbeat. Phase 2 parallelism deferred. |
| Phase 1 (single Claude Code loop) regressions during transition | Med | High | Run team in *shadow mode* first (specialists open PRs; Claude Code reviews + merges) for 3 days before flipping merge authority. |

---

## 5. Rollback Plan

If the team replacement degrades velocity or quality, rollback is reversible at any heartbeat:

1. **Tier-1 rollback (specialists only)**: pause specialist agents in Paperclip (`runtimeConfig.heartbeat.enabled = false`). DevLead orchestrator continues but falls back to acting as the generalist coder (the role it played pre-replacement).
2. **Tier-2 rollback (full)**: pause DevLead too. Claude Code resumes via `/loop` per CLAUDE.md §8. Specialist `AGENTS.md` files stay in git for audit; their Paperclip records are archived (not deleted) so re-enabling is one config flip.
3. **Audit trail**: every Issue closed by a specialist carries the agent ID in its run-complete D-ID — making "what did the team produce vs. Claude Code" trivially queryable.

Rollback decision authority: **CTO** (this agent) for Tier-1, **CEO (Isaac)** for Tier-2.

---

## 6. Implementation Roadmap (child issues to file)

| # | Issue title (proposed) | Owner | Depends on |
|---|---|---|---|
| 1 | Create Paperclip agent: Coder-Frontend specialist + seed AGENTS.md | CTO | board approval |
| 2 | Create Paperclip agent: Coder-Backend specialist + seed AGENTS.md | CTO | board approval |
| 3 | Create Paperclip agent: Tester specialist + seed AGENTS.md | CTO | board approval |
| 4 | Create Paperclip agent: Reviewer specialist + seed AGENTS.md | CTO | board approval |
| 5 | Wire DevLead orchestrator: classify Issue by `area:*` label and wake matching specialist | DevLead | #1–#4 |
| 6 | Reviewer wake-on-PR-opened: hook Paperclip wake to `pull_request` events | Reviewer | #4 |
| 7 | Shadow-mode trial: 3 days of specialist PRs reviewed by Claude Code, no merge authority | CTO | #5, #6 |
| 8 | Flip merge authority to DevLead post-trial | CTO | #7 + AC-1..AC-7 green |
| 9 | Documentation pass: link this spec from CLAUDE.md and each AGENTS.md | DevLead | spec accepted |

---

## 7. Open Questions for CEO (Isaac)

These are direction-change asks that need CEO confirmation before implementation begins:

- **Q1**: Approve creating 4 new Paperclip agents with combined budget envelope of $150/mo (DevLead $30 + 4 specialists at $20–$40 each)?
- **Q2**: Accept the phased rollback plan (Tier-1 / Tier-2) as written?
- **Q3**: Acceptable that during the 3-day shadow-mode trial (#7) we run *both* Claude Code and the team in parallel, doubling spend for that window?
- **Q4**: Should specialists be allowed to open PRs against `main` directly, or must they go through DevLead's branch first? (Spec assumes direct-to-main with reviewer gate; flag if you want DevLead-mediated.)

A `request_confirmation` interaction will be filed against WEI-633 referencing this spec for sign-off.

---

## 8. Provenance & Citations

- Parent issue: WEI-472 ("Cluade coding heartbeat update").
- Direct issue: WEI-633 (board scope update 2026-05-09).
- Existing scaffolding referenced: GH Issues #184–#190 (Part9-A through Part9-D2 — heartbeat cadence flip, coverage gate, Copilot pipeline, merge management, budget controls, Paperclip-as-CEO-layer).
- Seed orchestrator AGENTS.md: commit `0313b5c` (2026-04-25).
- Operating contract reference: `CLAUDE.md` §1–§10.
- Phase 2 specialist taxonomy: WEI-71 followup comment 2026-04-25T20:32:55Z.
