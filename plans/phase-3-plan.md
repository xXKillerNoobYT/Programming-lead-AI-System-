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
3. **Hardening** — the heartbeat is guardrailed against external actions (Part 4 §4), recoverable after crashes, and observable from the dashboard (Part 6 §10).

### 1.2 In scope
- Cohesion-check infrastructure: lint, types, tests, coverage-threshold, architecture-lint, dep-graph, chaos harness.
- Rollback-on-failure: auto-revert a merge if the cohesion check regresses.
- Multi-project isolation: per-project `plans/`, `reports/`, MemPalace wing, SOUL.md.
- Heartbeat guardrails: no external HTTP or raw shell spawn outside MCP-wrapped calls; lockfile-based pause; audit trail.
- Observability: VRAM graph, hourly-Grok countdown, coverage trend, queue-depth chart — all in the Log tab (Part 6 §7.3 §10).
- UI upgrade per Part 6 §20 items 1–11 (shell through accessibility pass). Items 12–16 can slip to late Phase 3 or Phase 4 depending on capacity.
- Preferences hardening (conflict resolution, approval auto-expiry, live-effect toasts).

### 1.3 Out of scope (deferred to Phase 4)
- Cloud Postgres / S3 storage (local JSON continues for Phase 3).
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
| 3-tab dashboard shell | D-20260418-002 | Upgrade per Part 6 §20 (§D) |
| Preferences editor + localStorage | D-20260417-004 | Add conflict resolution + live-effect (§F.1) |
| Smart agent/model mapping | D-20260417-004 | Extend with dep-graph-aware parallelism (§B.5) |
| Green test baseline (12/12, 95.45%) | D-20260417-010 | Becomes regression floor for coverage-threshold check (§A.4) |
| Part 6 UI Master Plan | D-20260417-009 | Referenced by every §D Issue |
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
- **A.5** Surface cohesion-check results in the Log tab per Part 6 §7.3 column B (one evidence block per check, click-to-expand, DecisionIdPill on the commit that triggered it).
- **A.6** Chaos harness: `dashboard/scripts/chaos.js` simulates (a) MCP-server crash via killed child process, (b) network timeout via blocked fetch, (c) VRAM overload via large-buffer allocation. AC: heartbeat degrades gracefully in all three.
- **A.7** Rollback-on-failure: if cohesion check fails on a post-merge commit, `scripts/auto-revert.js` creates a revert commit tagged `revert:D-YYYYMMDD-###` and opens a `type:bug` Issue.

### B. Multi-Project  *(area:multi-project)*
- **B.1** Refactor `heartbeat.js` to accept `--project-id=<id>` and isolate run-state under `projects/<id>/`.
- **B.2** Per-project MemPalace wing: `mempalace_kg_add` calls tag `wing=<id>`; retrieval filters by active project.
- **B.3** Per-project `plans/`, `reports/`, `decision-log.md`, `memory.md` live under `projects/<id>/` — top-level versions stay as the "devlead itself" meta-project.
- **B.4** Dashboard multi-project switcher UI (Part 6 §9 implementation): route scaffolding `/projects/<id>/(coding|guidance|log)`.
- **B.5** Global concurrency cap across all active projects — read from preference `maxGlobalParallel` (default 3).
- **B.6** Per-project `SOUL.md` (Part 4 §5) with dashboard editor at `/projects/<id>/soul` (plain textarea + preview is fine for Phase 3).
- **B.7** Migration script: port the existing single-project layout into `projects/devlead-mcp/` without losing history.

### C. Heartbeat Hardening  *(area:heartbeat)*
- **C.1** Guardrail module: all outbound calls funnel through a single MCP gateway; any direct `fetch`/`https`/raw-shell-spawn call path throws a guardrail violation and auto-files a `type:bug` Issue.
- **C.2** Audit trail: every heartbeat writes its full payload (state read, decomposition output, delegation request, agent report, decision IDs, files touched) to `reports/audit/<timestamp>.json`.
- **C.3** Human-override lockfile: dashboard "Pause heartbeat" writes `.heartbeat-paused` with duration + reason; heartbeat checks and respects it on every tick.
- **C.4** Retry/backoff: on agent-delegation failure, retry 3× with exponential backoff (2 s / 8 s / 30 s); on 4th failure escalate to User Guidance.
- **C.5** Tick timeout: if a heartbeat exceeds `maxTickDurationMs` (default 5 min), abort the tick, log a `C.5-timeout` decision, and wait for the next scheduled wake.

### D. UI Upgrade (subset of Part 6 §20)  *(area:ui)*
- **D.1** Shell + routing (Part 6 §6, §3.1): top bar + left rail + main + optional inspector; WebSocket store; project routing.
- **D.2** Design tokens + shadcn install (Part 6 §4, §5.1): Tailwind config tokens, shadcn CLI init, base component set.
- **D.3** Coding tab skeleton (Part 6 §7.1): `HandoffThread`, `AgentBadge`, filter bar, inspector.
- **D.4** Guidance tab skeleton (Part 6 §7.2): `ClarifyingQCard`, `DesignerInput` with slash-commands, timeline.
- **D.5** Log tab skeleton (Part 6 §7.3): 3-column layout, feed with `DecisionIdPill` + `EvidenceBlock`.
- **D.6** Preferences editor (Part 6 §8): migrate `defaultPreferences` from `page.tsx`, introduce `PrefEditorField`, add import/export.
- **D.7** Heartbeat indicator + pause (Part 6 §6.3, §11): top-bar component wired to WebSocket + lockfile (§C.3).
- **D.8** Accessibility pass (Part 6 §13): axe-core in dev, pa11y-ci in CI (but Phase 4 owns CI wiring; Phase 3 lands the axe-core devDep).
- **D.9** Theming polish (Part 6 §14): light/dark/system, blocking theme script, syntax-highlight swap.
- **D.10** Responsive pass (Part 6 §15): mobile bottom bar, bottom-sheet modals, 44 px targets.
- **D.11** Visual Quality Bar enforcement: add a Storybook page per new component (Part 6 §4.5 checklist).

### E. Observability  *(area:observability)*
- **E.1** `VramGraph` component + `monitor_vram` MCP wiring (Part 6 §10).
- **E.2** `HourlyGrokCountdown` — local timer synced to last escalation timestamp.
- **E.3** `CoverageTrend` chart reading `reports/coverage-floor.json` history.
- **E.4** `QueueDepth` bar with red-below-3 warning (Polsia Rule 4 surface).
- **E.5** WebSocket broadcaster: single `/ws` endpoint; typed messages per Part 6 §6.2.

### F. Polish & Edge Cases  *(area:polish)*
- **F.1** Preferences conflict resolution banner (Part 6 §8.5) when project-level and global prefs disagree.
- **F.2** Approval auto-expiry — preference-configurable timeout; applies safe default + records decision ID.
- **F.3** Skippable clarifying-Q flow end-to-end (Lead posts Q → user answers/skips/applies-default → decision logged → next tick acts).
- **F.4** Dependabot alerts surfaced in Log tab column C (Part 6 §7.3) via GitHub MCP.

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
3. **§D.1** Shell + routing per Part 6 §6 (unblocks every other UI issue).

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

---

## 7. Provenance & Maintenance

- **Author**: Claude Code, 2026-04-17, per Issue #7 acceptance criteria.
- **Source material**: `Docs/Plans/Part 1.md` §§3,4,8,10,12; `Part 2.md` §§3,4,6; `Part 4.md` §§3,4,5,7; `Part 6.md` §§1,4.5,6,7,8,10,13,14,15,20; `plans/main-plan.md` §Roadmap §Testing §Considerations; `CLAUDE.md` §§1–8; `decision-log.md` D-20260417-004 through D-20260417-013.
- **Update rule**: refine this plan before producing more `phase:3` Issues whenever any subtask proves ambiguous (CLAUDE.md §3 Step 2b). Refinements land under a new Decision ID (D-20260417-017 is this document's birth ID).
- **Lock status**: Draft v1.0 — open to user revision. Next revision becomes v1.1 with a new DocVersion tag at the top.
