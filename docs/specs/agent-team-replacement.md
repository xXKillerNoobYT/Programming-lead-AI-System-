# Agent-Team Coding Replacement for Claude Code

**Status:** Revised r2 (reconciled with org-v1 four-gate model, 2026-05-09 evening)
**Author:** CTO agent (`328fddb9-26b4-4475-9ed3-6265d23e7816`)
**Issue:** WEI-633 (parent: WEI-472)
**Created:** 2026-05-09 (r1); revised 2026-05-09 (r2 — see §0 Reconciliation)
**Convention:** Chaos Coding spec-before-code (scope · architecture · AC · risks · rollback)

---

## 0. Reconciliation with org-v1 four-gate model (r2 update)

Between r1 of this spec and r2, an adjacent stream of work landed on this same branch (commits `ee0c31f` WEI-715 → `53b761d` WEI-716 → `764f6e8` → `fcdf4b7` WEI-727+WEI-728) that **already activated** a four-gate enforcement model with R2/R4/R5/R6 role specialists. References:

- `docs/specs/org-v1-enforcement-points.md` — the four independent gates (Spec / QA / Release / Security) and their token grammar.
- `docs/specs/r5-security-veto-protocol.md` — Sev1/Sev2/Sev3 model + standing veto + CTO+CEO override path.
- `.paperclip/agents/r2-tech-lead-execution/AGENTS.md` — Spec gate owner.
- `.paperclip/agents/r4-qa-break-testing/AGENTS.md` — QA gate owner.
- `.paperclip/agents/r5-security-reliability/AGENTS.md` — Security gate owner.
- `.paperclip/agents/r6-devops-release/AGENTS.md` — Release gate owner.
- `.paperclip/agents/reviewer/AGENTS.md` — now mechanically enforces all four gate tokens (commit `fcdf4b7`, WEI-727+WEI-728).

**This reframes WEI-633.** The original r1 spec proposed a 5-agent team (DevLead + Coder-FE + Coder-BE + Tester + Reviewer) as a self-contained replacement. r2 positions those agents as the **executor + orchestrator layer** that operates *within* the four-gate model:

- The four R-roles (R2/R4/R5/R6) are the **gate-holders** — they certify the change.
- The two coder specialists (Coder-FE, Coder-BE) and Tester are the **executors** — they author the change.
- DevLead is the **orchestrator** — it picks Issues and dispatches.
- Reviewer is the **token-enforcer** — it mechanically blocks merges when any of the four gate tokens is missing or invalid.

This is additive, not a contradiction. The r1 cost envelope and rollback plan still apply to the executor layer; the R-role layer is governed by WEI-572/576/715/716 and is out of WEI-633's scope to change.

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

### 2.1 Operating model — who owns what loop (r2)

The model now has **three layers**: Orchestrator → Executors → Gate-holders. The Reviewer is a cross-cutting token-enforcement role.

| Layer | Loop | Owner agent | Role | Reports to |
|---|---|---|---|---|
| Orchestrator | **Plan decomposition + Issue dispatch** | DevLead Programming Lead | Reads vault `AI plans/`, refills GH backlog ≥3, classifies Issues by `area:*`, wakes the right executor | CTO |
| Executor | **Coding (frontend)** | Coder-Frontend Specialist | Next.js / React / Tailwind work in `dashboard/` | DevLead |
| Executor | **Coding (backend)** | Coder-Backend Specialist | Node.js core, `heartbeat.js`, MCP, scripts | DevLead |
| Executor | **Test authoring** | Tester Specialist | Vitest/Jest + node:test coverage, fixtures, eval suite | DevLead |
| Gate-holder 1 | **Spec gate** | R2 Tech Lead — Execution | `spec-gate:approved D-… spec=…` token in PR review | CTO |
| Gate-holder 2 | **QA gate** | R4 QA — Break-Testing | `qa-gate:approved scenarios=N` token; `qa:hold` label on PR | CTO |
| Gate-holder 3 | **Release gate** | R6 DevOps / Release | `release-gate:cut tag=… ci=…` in tag/release-commit | CTO |
| Gate-holder 4 | **Security gate** | R5 Security / Reliability | `sec-gate:approved sev=…` or `sec-veto:hold sev=…` token; standing veto on Sev≥2 | CTO + CEO (joint for Sev2 override; Sev1 fix-forward only) |
| Cross-cutting | **Token enforcement on PRs** | Reviewer Specialist | Mechanically scans PR review bodies for the four gate tokens; `request-changes` if any missing/invalid (per `.paperclip/agents/reviewer/AGENTS.md` checklist item 10 + "Gate token grammar" section) | DevLead |
| Cross-cutting | **Release / merge** | DevLead (acts as merger) | Merges only when all four gate tokens are clear and Reviewer approves | CTO |
| Escalation | **Hard stops + direction** | CTO (this agent) | Cross-gate tie-break (gates 1–3); CTO+CEO joint override (gate 4 Sev2 only); large-direction changes | CEO (Isaac) |

### 2.2 Routing contract

```
GH Issue (status:backlog)
    │
    ▼
DevLead orchestrator (heartbeat tick)
    │  classify by labels: phase, area:ui|backend|test|docs
    ▼
Executor (Coder-FE | Coder-BE | Tester) wake-on-demand
    │  one atomic Issue → one feature branch off origin/main
    │  commits, pushes, opens PR (cites Decision ID + Issue #)
    ▼
Four gate-holders run in parallel (no chain — each independent):
  ├─ R2 Spec gate      → posts `spec-gate:approved D-… spec=…`     in PR review
  ├─ R4 QA gate        → posts `qa-gate:approved scenarios=N`      in PR review
  ├─ R5 Security gate  → posts `sec-gate:approved sev=…`           in PR review
  │                       OR `sec-veto:hold sev=…` (≥2hr grace, Sev1 no override)
  └─ R6 Release gate   → posts `release-gate:cut tag=… ci=…`       in tag/release-commit
    │
    ▼
Reviewer Specialist wakes on PR-opened (poll-based MVP via DevLead)
    │  scans PR for all four gate tokens (per AGENTS.md item 10 + grammar)
    │  any missing/invalid → `gh pr review --request-changes`
    │  all clear           → `gh pr review --approve`
    ▼
DevLead merges if Reviewer approves + CI green; on red, reassigns to executor
    │
    ▼
Issue closed with run-complete D-ID; queue refilled to ≥3
```

### 2.3 Instruction-bundle layout (r2)

All bundles live under `.paperclip/agents/<id>/AGENTS.md` in `managed` mode and cite **`CLAUDE.md` as the canonical operating contract** (CLAUDE.md wins on conflict).

Within scope of WEI-633 (this spec):
- `devlead-programming-lead/AGENTS.md` — orchestrator (seeded `0313b5c`).
- `coder-frontend/AGENTS.md` — executor (seeded `240b893`).
- `coder-backend/AGENTS.md` — executor (seeded `240b893`).
- `tester/AGENTS.md` — executor (seeded `240b893`).
- `reviewer/AGENTS.md` — token-enforcer (seeded `240b893`, four-gate grammar added in `fcdf4b7`).

Outside WEI-633's scope but referenced (governed by WEI-715/716):
- `r2-tech-lead-execution/AGENTS.md` — Spec gate (commit `ee0c31f`).
- `r4-qa-break-testing/AGENTS.md` — QA gate (commit `ee0c31f`).
- `r5-security-reliability/AGENTS.md` — Security gate (commit `53b761d`).
- `r6-devops-release/AGENTS.md` — Release gate (commit `ee0c31f`; routing updated `fcdf4b7`).

### 2.4 Budget envelope (r1 spec → r2 deployed reality)

**Spec target (r1, claude_local Sonnet/Opus):**

| Agent | Heartbeat | Budget/mo |
|---|---|---|
| DevLead | 1/day + wake-on-demand | $30 |
| Coder-Frontend | wake-on-demand only | $40 |
| Coder-Backend | wake-on-demand only | $40 |
| Tester | wake-on-demand only | $20 |
| Reviewer | wake-on-demand only | $20 |
| **Spec total** | | **$150/mo** |

**Deployed reality (r2, codex_local gpt-5.3-codex per CEO/operator choice 2026-05-10):**

| Agent | Paperclip ID | Adapter / model | Budget/mo |
|---|---|---|---|
| DevLead Programming Lead | _not created — orchestration is a CTO function via `scripts/devlead-route.js` (L9, commit `9ca2da4`)_ | — | $0 |
| Coder-Frontend Specialist | `9769380d-f550-4967-98df-b2b4a1b10d6e` | codex_local / gpt-5.3-codex | $30 |
| Coder-Backend Specialist | `d7edb4d2-edec-4ffe-b4b1-dbe7b507e2b1` | codex_local / gpt-5.3-codex | $30 |
| Tester Specialist | `1c95405c-845c-447a-9734-9af294520077` | codex_local / gpt-5.3-codex | $25 |
| Reviewer Specialist | `e7619d0d-175f-430d-9337-06e16c8a0cbe` | codex_local / gpt-5.3-codex | $25 |
| **Deployed total** | | | **$110/mo** |

Net **$40/mo under spec envelope**. The DevLead seat was inlined into the CTO role + a routing script rather than a separate agent — reduces budget and keeps orchestration auditable through the CTO's existing run log. Worth re-evaluating after the L11 trial: if the routing volume warrants it, spin up a dedicated DevLead seat at the originally specced $30 (still leaves ~$10 headroom).

**Adapter substitution caveat:** the AGENTS.md operating contract was authored assuming Claude. Codex (gpt-5.3-codex) may interpret some instructions differently. The L11 trial should track contract-fidelity issues per agent (e.g., does Codex respect "request-changes with at most 5 issues per round"? Does it cite Decision IDs in commit messages?). If contract drift is high, switch back to claude_local — budget stays under spec either way.

### 4.1 Model-routing plan (owner-approved 2026-08-22)

GitHub Copilot desktop is the preferred agent-management surface, with the configured OpenAI provider supplying the default worker models. Model choice is capability-first and quality-first; affordability decides among models that meet the bar, while speed is only a tie-breaker.

| Team responsibility | Preferred model | Routing note |
|---|---|---|
| Direction, architecture, decomposition, escalation | `gpt-5.6-sol` | Directs difficult work; not the default executor |
| Substantial implementation | `gpt-5.6-terra` | Primary cross-file implementation worker |
| Affordable bounded implementation | `gpt-5.6-luna` | Use only when it meets the same task quality bar |
| Repository-focused coding | `gpt-5.3-codex` | Coding-specialist and test-repair path |
| Independent review and debugging | `gpt-5.5` | Prefer a different role from the implementer |
| Low-risk utility work | `gpt-5.4-mini` | Inventory, search, formatting, and routine checks |
| Informal questions and brainstorming | `chat-latest` | Never a reproducible build or release gate |

The root `AGENTS.md` is the operational contract for this routing policy. Every run should record the selected provider/model, role, result, and available cost signal. Non-OpenAI or GitHub-hosted models are reserved for a specific missing capability or a measured quality/cost advantage. Availability and tool support must be checked before dispatch, and a fallback substitution must be recorded.

All roles and all work in this plan use the universal operating loop from the canonical Notion doctrine: `OBSERVE → FRAME → DIAGNOSE → DECIDE → ARCHITECT → BUILD → VALIDATE → REVIEW → SHIP → MEASURE → IMPROVE → OBSERVE`. It governs the whole system, not only coding. The MEASURE and IMPROVE stages must feed evidence back into model routing, skill selection, prompt design, tests, durable lessons, and the next observation cycle. The owner approved global spread on 2026-08-22, resolving the scope question recorded in the canonical loop page.

Budget controls scaffold (GH #189) is the long-term enforcement; until it lands, manual review of `spentMonthlyCents` per agent each week (CTO weekly self-update — see §provenance comment thread).

---

## 3. Acceptance Criteria (r2)

The replacement is **MVP-complete** when all of these hold for one full week:

1. **AC-1**: An Issue labeled `area:ui` is closed end-to-end via Coder-Frontend — commits, PR, all four gate tokens posted by R2/R4/R5/R6, Reviewer approves, DevLead merges. No Claude Code intervention.
2. **AC-2**: An Issue labeled `area:backend` is closed end-to-end via Coder-Backend with the same four-gate flow.
3. **AC-3**: `gh pr list --state merged --limit 5` shows ≥1 PR authored by a specialist agent and reviewed by Reviewer with all four gate tokens present in the PR conversation.
4. **AC-4**: `decision-log.md` contains run-complete D-IDs from at least two distinct executor agents.
5. **AC-5**: Total spend on the WEI-633 executor + orchestrator + reviewer agents (DevLead, Coder-FE, Coder-BE, Tester, Reviewer) ≤ $150 in the trial week. R2/R4/R5/R6 budgets are governed separately by WEI-715/716.
6. **AC-6**: Zero hard-stop violations (no force-push, no `--no-verify`, no SOUL.md edits, no secret commits, no Sev1 override attempts).
7. **AC-7**: This spec is referenced from `CLAUDE.md` (or successor) and from each WEI-633 specialist's `AGENTS.md`. Cross-referenced from `docs/specs/org-v1-enforcement-points.md` so future readers find the executor-layer spec from the gate-layer spec.
8. **AC-8** (new in r2): At least one PR in the trial week exercises a non-trivial gate token path — e.g., a `sec-gate:approved sev=3 finding=… followup=#…` or a `qa-gate:approved scenarios=≥1` — proving Reviewer's mechanical enforcement works end-to-end, not just the happy path.

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
