# Phase 3 Execution Plan — Hybrid Polish + Cohesion + Multi-Project

**Status**: Draft v1.0 · Owner: Claude Code · Decision ID: D-20260417-017 · Date: 2026-04-17
**Source-of-truth for Issue #7** · Governs all Phase 3 atomic Issues until superseded.

> **How this file is used (per `CLAUDE.md` §1 planning chain).** Every Phase 3 GitHub Issue cites a section of this plan (e.g. *"per `plans/phase-3-plan.md` §A.2"*). If this plan is too fuzzy to produce the next 3 Issues, refine it first, then decompose — vague plans produce vague Issues.

---

## 1. Goals & Scope Boundaries

### 1.1 Goals
Phase 3 takes the system from **"works on the happy path"** (Phases 1 & 2) to **"survives real autonomous use."** Three load-bearing objectives:

1. **Cohesion layer** — nothing ships unreviewed. Every heartbeat's output passes a programmatic check battery before being accepted.
2. **Multi-project** — one DevLead instance manages several repos concurrently, with isolation per project (state, memory, preferences, reports).
3. **Hardening** — the heartbeat is guardrailed against external actions (Part 4 §4), recoverable after crashes, and observable from the dashboard (Part 7 §10).

### 1.2 In scope
- Cohesion-check infrastructure: lint, types, tests, coverage-threshold, architecture-lint, dep-graph, chaos harness.
- Rollback-on-failure: auto-revert a merge if the cohesion check regresses.
- Multi-project isolation: per-project `plans/`, `reports/`, MemPalace wing, SOUL.md.
- Heartbeat guardrails: no external HTTP or raw shell spawn outside MCP-wrapped calls; lockfile-based pause; audit trail.
- Observability: VRAM graph, hourly-Grok countdown, coverage trend, queue-depth chart — all in the Log tab (Part 7 §7.3 §10).
- UI upgrade per Part 7 §20 items 1–11 (shell through accessibility pass). Items 12–16 can slip to late Phase 3 or Phase 4 depending on capacity.
- Preferences hardening (conflict resolution, approval auto-expiry, live-effect toasts).

### 1.3 Out of scope (deferred to Phase 4)
- **Cloud Postgres / S3 storage** — **SQLite for Phase 3** per user Q-006 answer (D-20260418-152); main-plan's Postgres becomes the Phase-4 migration target. §B.1–§B.4 multi-project isolation uses file-per-project SQLite (`projects/<name>/state.sqlite`) with WAL mode for concurrent heartbeat+dashboard reads.
- CI/CD pipelines (GitHub Actions) — manual verification is enough until Phase 4.
- PM2 / Windows Task Scheduler / systemd packaging.
- Installer / one-click project setup.
- Cross-project learning (read-only shared knowledge base MCP).
- Messaging-app bridges (Telegram / WhatsApp / Slack).
- Distribution beyond `git clone` + `npm install`.

### 1.4 Hard guardrails that stay from Phase 1/2
- **No Docker, no containers, no Python venv** — user preference (D-20260417-005).
- **Pure-orchestrator runtime** — DevLead MCP product never codes; all implementation delegated via MCP.
- **CLAUDE.md rules** — Polsia 5-rule heartbeat, oldest-first pick, finish-before-switch, run-complete ↔ Issue-close pairing.
- **Never modify `Docs/Plans/*`** — locked user intent.

---

## 2. Dependencies on Phase 1 & 2

### 2.1 What Phase 1 & 2 delivered (that Phase 3 builds on)
| Deliverable | Decision | Phase 3 usage |
|---|---|---|
| `heartbeat.js` Node scheduler | D-20260417-003 | Wrap with guardrails + audit trail (§C) |
| 3-tab dashboard shell | D-20260418-002 | Upgrade per Part 7 §20 (§D) |
| Preferences editor + localStorage | D-20260417-004 | Add conflict resolution + live-effect (§F.1) |
| Smart agent/model mapping | D-20260417-004 | Extend with dep-graph-aware parallelism (§B.5) |
| Green test baseline (12/12, 95.45%) | D-20260417-010 | Becomes regression floor for coverage-threshold check (§A.4) |
| Part 7 UI Master Plan | D-20260417-009 | Referenced by every §D Issue |
| `.mcp.json` config | D-20260417-006 | Mempalace server consumed by §B.2 |

### 2.2 What Phase 3 explicitly requires be true before starting
- PR #10 (bootstrap + red baseline) merged.
- PR #14 (Part 6 UI plan) merged.
- PR #2 (dependabot `next` bump) resolved (accept or defer consciously).
- Issue #9 closed (it is — D-20260417-008).
- Issue #18 (heartbeat.js refresh) has a clear owner and ordering — §C depends on its disposition.

If any of these are untrue when a Phase 3 Issue is picked up, the heartbeat either blocks the Issue (documented in run report) or substitutes an earlier-dependency Issue. It does **not** stall.

---

## 3. Workstreams (atomic subtasks, grouped)

Each `§X.N` line below is one GitHub Issue. Titles and labels shown. Each will be created with: `type:task` (or `type:bug`), `status:backlog`, `phase:3`, `autonomous-lead`, plus an area tag (`area:cohesion` · `area:multi-project` · `area:heartbeat` · `area:ui` · `area:observability` · `area:polish`).

### A. Cohesion & Checks Layer  *(area:cohesion)*
- **A.1** Add `check:lint`, `check:types`, `check:tests`, `check:coverage-threshold`, `check:arch`, `check:deps` scripts to `dashboard/package.json`. AC: each script runs standalone and exits non-zero on any failure.
- **A.2** Create `dashboard/scripts/cohesion-check.js` that runs all `check:*` in sequence, surfaces first failure with a captured stdout/stderr block, exits 0 only if every check passes, and writes `reports/cohesion/<timestamp>.json`.
- **A.3** Wire `cohesion-check` into the heartbeat loop in `heartbeat.js` (or its successor per #18) as the gate between "agent report received" and "decision logged."
- **A.4** Coverage-threshold enforcement: write last-green coverage to `reports/coverage-floor.json` on green; `check:coverage-threshold` reads it and fails if the current run drops below it by > 1 pp.
- **A.5** Surface cohesion-check results in the Log tab per Part 7 §7.3 column B (one evidence block per check, click-to-expand, DecisionIdPill on the commit that triggered it).
- **A.6** Chaos harness: `dashboard/scripts/chaos.js` simulates (a) MCP-server crash via killed child process, (b) network timeout via blocked fetch, (c) VRAM overload via large-buffer allocation. AC: heartbeat degrades gracefully in all three.
- **A.7** Rollback-on-failure: if cohesion check fails on a post-merge commit, `scripts/auto-revert.js` creates a revert commit tagged `revert:D-YYYYMMDD-###` and opens a `type:bug` Issue.

### B. Multi-Project  *(area:multi-project)*
- **B.1** Refactor `heartbeat.js` to accept `--project-id=<id>` and isolate run-state under `projects/<id>/`.
- **B.2** Per-project MemPalace wing: `mempalace_kg_add` calls tag `wing=<id>`; retrieval filters by active project.
- **B.3** Per-project `plans/`, `reports/`, `decision-log.md`, `memory.md` live under `projects/<id>/` — top-level versions stay as the "devlead itself" meta-project.
- **B.4** Dashboard multi-project switcher UI (Part 7 §9 implementation): route scaffolding `/projects/<id>/(coding|guidance|log)`.
- **B.5** Global concurrency cap across all active projects — read from preference `maxGlobalParallel` (default 3).
- **B.6** Per-project `SOUL.md` (Part 4 §5) with dashboard editor at `/projects/<id>/soul` (plain textarea + preview is fine for Phase 3).
- **B.7** Migration script: port the existing single-project layout into `projects/devlead-mcp/` without losing history.

### C. Heartbeat Hardening  *(area:heartbeat)*
- **C.1** Guardrail module: all outbound calls funnel through a single MCP gateway; any direct `fetch`/`https`/raw-shell-spawn call path throws a guardrail violation and auto-files a `type:bug` Issue.
- **C.2** Audit trail: every heartbeat writes its full payload (state read, decomposition output, delegation request, agent report, decision IDs, files touched) to `reports/audit/<timestamp>.json`.
- **C.3** Human-override lockfile: dashboard "Pause heartbeat" writes `.heartbeat-paused` with duration + reason; heartbeat checks and respects it on every tick.
- **C.4** Retry/backoff: on agent-delegation failure, retry 3× with exponential backoff (2 s / 8 s / 30 s); on 4th failure escalate to User Guidance.
- **C.5** Tick timeout: if a heartbeat exceeds `maxTickDurationMs` (default 5 min), abort the tick, log a `C.5-timeout` decision, and wait for the next scheduled wake.

### D. UI Upgrade (subset of Part 7 §20)  *(area:ui)*
- **D.1** Shell + routing (Part 7 §6, §3.1): top bar + left rail + main + optional inspector; WebSocket store; project routing.
- **D.2** Design tokens + shadcn install (Part 7 §4, §5.1): Tailwind config tokens, shadcn CLI init, base component set.
- **D.3** Coding tab skeleton (Part 7 §7.1): `HandoffThread`, `AgentBadge`, filter bar, inspector.
- **D.4** Guidance tab skeleton (Part 7 §7.2): `ClarifyingQCard`, `DesignerInput` with slash-commands, timeline.
- **D.5** Log tab skeleton (Part 7 §7.3): 3-column layout, feed with `DecisionIdPill` + `EvidenceBlock`.
- **D.6** Preferences editor (Part 7 §8): migrate `defaultPreferences` from `page.tsx`, introduce `PrefEditorField`, add import/export.
- **D.7** Heartbeat indicator + pause (Part 7 §6.3, §11): top-bar component wired to WebSocket + lockfile (§C.3).
- **D.8** Accessibility pass (Part 7 §13): axe-core in dev, pa11y-ci in CI (but Phase 4 owns CI wiring; Phase 3 lands the axe-core devDep).
- **D.9** Theming polish (Part 7 §14): light/dark/system, blocking theme script, syntax-highlight swap.
- **D.10** Responsive pass (Part 7 §15): mobile bottom bar, bottom-sheet modals, 44 px targets.
- **D.11** Visual Quality Bar enforcement: add a Storybook page per new component (Part 7 §4.5 checklist).
- **D.12** In-app Q&A board surface (Part 7 §5): dedicated view/panel showing open/answered/blocked questions, dependency links, and blocked-task links.
- **D.13** In-app visible task queue surface (Part 7 §5A): dedicated view with status filters, owner/agent, blockers, timestamps, and evidence links.
- **D.14** In-app User Plans management surface (Part 7 §5B, UI Part 7 §7.4): full CRUD/version/map/archive/restore flow with done/not-done rollups and evidence linkage.
- **D.15** Concept-to-Spec elicitation surface (Part 7 §5C): intake vague/detailed idea, run requirement gap detection, generate targeted clarifying questions, and output implementation-ready spec with completeness score.
- **D.16** Post-run anti-hallucination verification surface + protocol (Part 7 §4A): analyze AI-generated run output, flag hallucination-risk claims, block confirmation, and track correction-to-verified workflow.
- **D.17** Pre-delegation knowledge-resolution gate (Part 7 §5 Pre-Delegation Q&A Rule): resolve task context from answered Q&A/plans/project artifacts first, then ask only uncovered questions before coding delegation.
- **D.18** Planning-buffer manager (Part 7 Planning Buffer Policy): maintain 3+ ready backlog and up to 10 preplanned non-bug coding issues, with separate reactive bug/fix lane.
- **D.19** Context Intelligence packet engine (Part 7 §4B): assemble source-cited next-step context from plans/Q&A/decisions/code-tests/issues-reports with confidence scoring.
- **D.20** Self-analysis assumption/hallucination detector (Part 7 §4B): run pre-delegation + pre-confirmation self-check and enforce correction loop for flagged claims.
- **D.21** Uncertainty protocol engine (Part 7 §4C): enforce explicit "I don't know" disclosure, unknown-field tracking, no-guess blocking, and targeted question generation.

### E. Observability  *(area:observability)*
- **E.1** `VramGraph` component + `monitor_vram` MCP wiring (Part 7 §10).
- **E.2** `HourlyGrokCountdown` — local timer synced to last escalation timestamp.
- **E.3** `CoverageTrend` chart reading `reports/coverage-floor.json` history.
- **E.4** `QueueDepth` bar with red-below-3 warning (Polsia Rule 4 surface).
- **E.5** WebSocket broadcaster: single `/ws` endpoint; typed messages per Part 7 §6.2.

### F. Polish & Edge Cases  *(area:polish)*
- **F.1** Preferences conflict resolution banner (Part 7 §8.5) when project-level and global prefs disagree.
- **F.2** Approval auto-expiry — preference-configurable timeout; applies safe default + records decision ID.
- **F.3** Skippable clarifying-Q flow end-to-end (Lead posts Q → user answers/skips/applies-default → decision logged → next tick acts).
- **F.4** Dependabot alerts surfaced in Log tab column C (Part 7 §7.3) via GitHub MCP.

### G. Plan-to-Code Readiness Engine  *(area:planning)*
- **G.1** Coding-ready context packet generator: compile objective, dependencies, resolved Q&A, touched files/tests, AC, and verification commands per Issue.
- **G.2** Dependency-chain validator: ensure ordered tasks only run when upstream deliverables are implemented and linked.
- **G.3** Role-specific prompt template library: user/developer/coder/debugger/reviewer templates with strict required fields.
- **G.4** Coding-ready queue compiler: maintain up to 10 preplanned non-bug Issues with complete packets; reject incomplete entries.
- **G.5** Missing-info guard: if packet fields are unresolved, auto-generate targeted questions and block coding handoff until resolved/defaulted.

---

## 4. Success Criteria & Verification

Phase 3 is complete when **all** of these are true (evidence-backed, per `CLAUDE.md` §3 Step 5):

- [ ] Every A/B/C/D/E/F subtask above has a closed GitHub Issue referencing `plans/phase-3-plan.md §<id>`.
- [ ] `npm run check:all` (calls `cohesion-check.js`) exits 0 on a clean repo and outputs a JSON report.
- [ ] Multi-project isolation test: two projects run one heartbeat each in the same process; no state bleed (verified by isolated `reports/` + `memory.md`).
- [ ] Heartbeat guardrail test: synthetic attempt to reach `google.com` outside MCP is blocked and logs a violation Issue automatically.
- [ ] UI: 10 minutes + zero-CLI designer test passes §1.4 of Part 6 (observe / tweak pref / pause / approve Q / diagnose failure).
- [ ] Test coverage ≥ 90 % (regression floor from Run 12's 95.45 %; enforced by A.4).
- [ ] `npm run build` green on all dashboards (current one + any new multi-project route).
- [ ] `decision-log.md` has `D-YYYYMMDD-###` entries for every Phase 3 Issue closure and references them from the Phase 3 run-reports.
- [ ] `architecture.md` + `memory.md` updated to reflect Phase 3 behaviors.
- [ ] Part 6 Visual Quality Bar passes for every new / modified component.

### 4.1 Mandatory Release Gate — Q&A + Task Visibility (from Part 7)
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] **Q&A view exists in the app** (not file-only) and is reachable from main navigation.
- [ ] Q&A view supports filters for `open`, `answered`, and `blocked`.
- [ ] Each Q&A item shows the task(s) it blocks, and each linked task is navigable.
- [ ] Answering a blocking question updates task unblocked state on the next heartbeat cycle.
- [ ] **Task visibility view exists in the app** and is reachable from main navigation.
- [ ] Task view shows: ID/title, status, owner/agent, blockers, last update timestamp, and evidence link(s).
- [ ] Task view supports quick filtering by status (`backlog`, `in_progress`, `blocked`, `review`, `done_verified`, `done_unverified`).
- [ ] Active task (currently executing) is clearly highlighted in the UI.
- [ ] At least one end-to-end demo recorded in `reports/run-*-summary.md` proves both views working from a user perspective.

### 4.2 Mandatory Release Gate — User Plans Full Management (from Part 7 §5B)
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] **User Plans view exists in the app** and is reachable from main navigation.
- [ ] User can create/import/upload plans inside the app.
- [ ] User can edit, rename, archive/unarchive, and restore prior versions inside the app.
- [ ] Plan-section ↔ task mapping is visible and editable.
- [ ] Plan dashboard clearly shows `done / in_progress / not_started / blocked` at section and plan rollup levels.
- [ ] User can open evidence links (run report / decision / task link) directly from plan sections.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves full User Plans management works without CLI.

### 4.3 Mandatory Release Gate — Concept-to-Spec Precision Engine (from Part 7 §5C)
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] User can submit a vague concept in-app and receive a structured missing-information analysis.
- [ ] System generates targeted clarification questions tied to specific missing requirement fields.
- [ ] User answers are stored as structured spec fields and linked to decisions/tasks.
- [ ] Spec completeness score is visible and updates after each answer.
- [ ] System blocks implementation when critical fields are unresolved (unless explicit default/override is chosen).
- [ ] System produces an implementation-ready spec artifact that links to downstream task decomposition.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves vague→specific conversion works without CLI.

### 4.4 Mandatory Release Gate — Anti-Hallucination Verification (from Part 7 §4A)
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] Every run executes anti-hallucination verification before confirmation.
- [ ] Unverified/contradictory claims are automatically flagged with source comparison evidence.
- [ ] Confirmation is blocked while blocking hallucination-risk findings are open.
- [ ] System creates correction workflow items and re-verifies after fixes.
- [ ] Final run confirmation includes a passed anti-hallucination verification record.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves flag→fix→recheck flow works without CLI.

### 4.5 Mandatory Release Gate — Pre-Delegation Knowledge Resolution
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] Before delegation, each task runs knowledge lookup across answered Q&A, decision log, plans, and project artifacts.
- [ ] Task context packet shows which fields were auto-resolved from existing sources.
- [ ] New questions are generated only for uncovered critical fields.
- [ ] Delegation is blocked until required fields are either resolved or explicitly defaulted.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves this pre-delegation gate runs before coding handoff.

### 4.6 Mandatory Release Gate — Planning Buffer Policy
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] Backlog-ready queue is maintained at 3+ items.
- [ ] Planned coding queue supports up to 10 ready non-bug issues.
- [ ] Reactive bug/fix issues are tracked in a separate lane and do not consume the 10 planned-item cap.
- [ ] Buffer depletion automatically triggers decomposition/refinement before further delegation.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves queue policy enforcement.

### 4.7 Mandatory Release Gate — Plan-to-Code Readiness & Prompt Contracts
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] Every coding-ready Issue has a complete context packet linked from the Issue.
- [ ] Dependency-chain validator blocks execution when upstream implementation is missing.
- [ ] Role-specific prompt templates are enforced and versioned.
- [ ] Missing required fields trigger targeted Q&A instead of assumption-based delegation.
- [ ] Coding-ready queue accepts only issues with complete packets and testable AC.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves ordered plan→packet→coding handoff workflow.

### 4.8 Mandatory Release Gate — Context Intelligence & Self-Analysis
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] System auto-builds a next-step context packet from all relevant project sources.
- [ ] Every critical next-step claim is source-cited.
- [ ] Context packet exposes confidence and unresolved-field indicators.
- [ ] Pre-delegation self-analysis flags assumption/hallucination risk before handoff.
- [ ] Pre-confirmation self-analysis flags risk before final status confirmation.
- [ ] Flagged claims trigger correction workflow and re-check.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves context→self-analysis→safe handoff/confirmation flow.

### 4.9 Mandatory Release Gate — Uncertainty & "I Don't Know" Handling
Phase 3 cannot be marked complete until **all** checks below pass:

- [ ] System explicitly labels unknown critical fields as `unknown_insufficient_evidence`.
- [ ] System states "I don't know yet" instead of generating unsupported claims.
- [ ] Delegation is blocked when unknown critical fields remain unresolved.
- [ ] Confirmation is blocked when unresolved unknowns could invalidate claims.
- [ ] Targeted Q&A generation is triggered automatically for unresolved unknowns.
- [ ] At least one end-to-end user-perspective demo recorded in `reports/run-*-summary.md` proves no-guess behavior under uncertainty.

Each Issue carries its own atomic AC. Phase-level AC is this list; workstream-level AC is implied by the subtask descriptions in §3.

---

## 5. Open Questions (capture, do not resolve here)

These are **unblocking** — the heartbeat picks a different Issue if it hits one of these before the user resolves it.

1. **Local-JSON vs. Postgres for per-project state** — main-plan locks "shared Postgres" but Phase 3 can stay local-JSON until Phase 4. Confirm the slippage is acceptable.
2. **Chaos harness scope** — in-process only (cheaper, lower fidelity) or full fault injection via MCP-server process management? Default: in-process for Phase 3; full injection Phase 4.
3. **Auto-revert target** — revert to last committed SHA, or last "green" SHA (requires green-tracking)? Default: last green, tracked via `reports/coverage-floor.json` companion `reports/green-sha.txt`.
4. **`dashboard/Dockerfile`** — Copilot flagged during Run 15 review; user preference is no-Docker. Disposition: delete during §D.1 shell work; tracked separately if user overrides.
5. **`maxGlobalParallel` default** — 3 feels right for a solo designer; confirm or adjust before §B.5.
6. **Multi-project migration reversibility** — if §B.7 migration proves regrettable, is there a rollback mode? Default: keep a pre-migration git tag `pre-phase-3-migration` and document `git checkout` recovery.
7. **`heartbeat.js` vs. #18/#20 disposition** — Phase 3 §C assumes the heartbeat code exists in some form. If the user prefers to start from scratch under #20's "minimal bootstrap", §C rewires onto that; §A.3 edits follow whichever file wins.
8. **Messaging-app bridge** (Part 4 §5) — Phase 3 or Phase 4? Default: Phase 4 (keeps Phase 3 scope tight).

---

## 6. Issue Decomposition Order

Issues will be created in this order. Each one lands on `status:backlog` and is picked up per the oldest-first rule (CLAUDE.md §6 softened variant).

**Wave 1 — unblocks everything** (create first 3 from this wave to hit queue-depth ≥ 3 today):
1. **§A.1** Add `check:*` scripts to `dashboard/package.json`.
2. **§A.2** Create `cohesion-check.js` runner + `reports/cohesion/` output.
3. **§D.1** Shell + routing per Part 7 §6 (unblocks every other UI issue).

**Wave 2 — parallelizable once Wave 1 lands:**
- §A.3, §A.4, §A.5 (cohesion wiring + coverage floor + Log tab surfaces)
- §B.1, §B.2, §B.3 (multi-project isolation)
- §D.2, §D.3, §D.4, §D.5 (tokens + tab skeletons)

**Wave 3 — after the shell + cohesion layer exist:**
- §A.6, §A.7 (chaos + rollback)
- §B.4, §B.5, §B.6, §B.7 (multi-project polish + migration)
- §C.1, §C.2, §C.3, §C.4, §C.5 (heartbeat hardening)
- §D.6, §D.7 (prefs editor + indicator)
- §E.* (observability)

**Wave 4 — polish after functional completeness:**
- §D.8, §D.9, §D.10, §D.11 (a11y, theming, responsive, Storybook)
- §F.* (prefs conflict, auto-expiry, clarifying Q, dependabot surface)

**Wave 5 — plan-engine hardening:**
- §G.1, §G.2 (packet + dependency validator)
- §G.3, §G.5 (role templates + missing-info guard)
- §G.4 (queue compiler)

**Wave 6 — context intelligence hardening:**
- §D.19 (context packet engine)
- §D.20 (self-analysis detector + correction loop)

**Wave 7 — uncertainty hardening:**
- §D.21 (explicit unknown handling and no-guess gates)

---

## 7. Provenance & Maintenance

- **Author**: Claude Code, 2026-04-17, per Issue #7 acceptance criteria.
- **Source material**: `Docs/Plans/Part 1.md` §§3,4,8,10,12; `Part 2.md` §§3,4,6; `Part 4.md` §§3,4,5,7; `Part 6.md` §§1,4.5,6,7,8,10,13,14,15,20; `plans/main-plan.md` §Roadmap §Testing §Considerations; `CLAUDE.md` §§1–8; `decision-log.md` D-20260417-004 through D-20260417-013.
- **Update rule**: refine this plan before producing more `phase:3` Issues whenever any subtask proves ambiguous (CLAUDE.md §3 Step 2b). Refinements land under a new Decision ID (D-20260417-017 is this document's birth ID).
- **Lock status**: Draft v1.0 — open to user revision. Next revision becomes v1.1 with a new DocVersion tag at the top.
