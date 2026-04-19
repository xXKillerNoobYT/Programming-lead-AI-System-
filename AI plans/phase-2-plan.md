# Phase 2 Execution Plan — Preferences + Smart Agent Model Mapping + Planning Enforcement (retrospective backfill)

**Status**: v1.0 — retrospective · Owner: Claude Code · Decision ID: D-20260419-021 · Date: 2026-04-19 (backfill)
**Phase status**: **COMPLETE** (D-20260417-004) — with late-Phase-2 additions through Run 192 (2026-04-19)
**Source-of-truth for Phase 2 deliverables** · Backfilled 2026-04-19 per user directive.

> **Why this file exists as a backfill.** Phase 2 completed on 2026-04-17 Run 3 (D-20260417-004) without a dedicated `phase-2-plan.md`. The "planning enforcement" third pillar kept accreting through Runs 4–192 as the Dev-Q&A protocol, 5-area framework, companion GH Issue rule, and naming conventions matured. This doc captures the full Phase 2 envelope so `AI plans/` has continuous phase coverage.

---

## 1. Phase goal

Make the Phase 1 MVP *usable* by a designer:
1. Expose every configurable knob in the dashboard (preferences editor)
2. Let the user map each mode (design-lead, orchestrator, code, debug, etc.) to its own preferred model
3. Enforce planning discipline so the heartbeat never fabricates scope (single-task rule, decision IDs, Dev-Q&A, run reports, multi-layer decomposition, GH Issue as to-do list)

## 2. Delivered scope

### 2.1 Preferences editor (D-20260417-004)
- `dashboard/app/page.tsx` Guidance tab includes:
  - Model mappings — 12 mode slots (design-lead, orchestrator, code, architect, debug, security-review, documentation-writer, jest-test-engineer, user-story-creator, devops, skill-writer, mode-writer)
  - Toggles: MemPalace, AutoGPT, Hourly Grok
  - Sliders: Heartbeat interval (30-300s), Max parallelism (1-20)
  - Select: Approval gate threshold (low/medium/high)
- localStorage persistence, JSON import/export deferred to Phase 3 §D.6
- Save feedback banner with 3-second auto-clear

### 2.2 Smart agent/model mapping (D-20260417-004)
- Preferences JSON schema with per-mode model slots (see 2.1)
- Heartbeat + SOUL honor the mapping via `preferences.modelMappings[mode]` lookup
- Dynamic mode creation supported (mode slots are keys, not enum)

### 2.3 Planning enforcement (Runs 3–192, culminating in D-20260419-017)
- **Single-task-per-heartbeat rule** (D-20260417-004)
- **Decision IDs** — `D-YYYYMMDD-###` format, append-only `decision-log.md` (D-20260417-001)
- **Run reports** — every productive heartbeat appends `reports/run-N-summary.md` (D-20260417-004)
- **Oldest-first Issue pick, softened by backbone/blocker/user-redirect overrides** (D-20260417-014)
- **Multi-layer sub-issue decomposition** via GitHub native `addSubIssue` GraphQL (D-20260417-018)
- **Dev-Q&A async design-question board** at `Docs/Plans/Dev-Q&A.md` (D-20260417-019)
- **5-area parallel planning framework** (UI-SURFACE · HEARTBEAT-CORE · COHESION-CI · MULTI-PROJECT · CONTEXT-IQ) — D-20260419-003
- **Companion GH Issue for every Dev-Q&A posting** (`type:question` + `status:needs-user`) — D-20260418-033/039 + D-20260419 reinforcement
- **Part N naming convention** — subtitle required when multiple files share a Part number (D-20260419-004)
- **Reversibility classifier** — strict on irreversible, pragmatic on reversible (D-20260419-009)
- **Self-merge authorization** — user allows Claude to self-merge Claude-authored PRs (D-20260419-018)

## 3. Phase 2 non-goals (deferred)

- Cohesion-check battery (→ Phase 3 §A)
- Multi-project isolation (→ Phase 3 §B scaffold, Phase 4 §D real)
- Heartbeat guardrails (→ Phase 3 §C)
- Two-pane hybrid UI shell (→ Phase 3 §D.1 — Issue #24, closed 2026-04-19)
- shadcn + design tokens (→ Phase 3 §D.2 — Issue #104, closed 2026-04-19)
- CI/CD workflow (→ Phase 4 §B)
- PM2 supervision (→ Phase 4 §A)

## 4. Acceptance criteria (retrospective check — all met)

### 4.1 Preferences editor
- [x] Guidance tab renders all 12 mode inputs
- [x] Save persists to localStorage
- [x] Load reads from localStorage on mount
- [x] Save banner appears, auto-dismisses after 3s
- [x] Tests cover the editor (95.45% coverage at Run 12; later grew to 61/61 tests by Run 206)

### 4.2 Smart mapping
- [x] Mapping schema stable across sessions (preferences JSON)
- [x] Heartbeat code reads preferences (future Phase 3 §C wires actual LLM routing)

### 4.3 Planning enforcement
- [x] Every heartbeat has a D-ID + run report + GH Issue reference
- [x] Dev-Q&A protocol functional: 6 Qs asked Run 191–192, all 6 answered by user within minutes, all resolved to D-entries + Dev-Q&A cleanup
- [x] Companion GH Issue rule documented in CLAUDE.md §4b
- [x] 5-area planning framework doc exists at `AI plans/5-area-planning-framework.md`
- [x] Multi-layer sub-issue decomposition used for Issue #24 (6 TDD leaves)
- [x] Part N naming convention codified in CLAUDE.md §2

## 5. Exit criteria (triggered Phase 3)

Phase 2 → Phase 3 transition required:
- Preferences editor visible + functional in the dashboard
- Each mode has a model slot (populated or not)
- Heartbeat loop runs with single-task-per-tick discipline
- At least one run report exists citing a D-ID + an Issue #
- Dev-Q&A file is writable and cleans up answered questions

All hit by Run 3 (2026-04-17); "planning enforcement" kept maturing through Run 192 (2026-04-19) without blocking Phase 3 work.

## 6. What Phase 3+ builds on

- Phase 3 §C hardens the heartbeat loop with guardrails + audit trail
- Phase 3 §D.6 migrates preferences editor out of the root dashboard into a dedicated `/projects/<id>/prefs` route + adds import/export
- Phase 3 §G (Plan-to-Code Readiness Engine) operationalizes the planning enforcement rules into programmatic gates
- Phase 4 §A.1 PM2 ecosystem wraps the heartbeat daemon around the single-task + preferences-honoring runtime

## 7. Provenance + maintenance

- **Backfill author**: Claude Code, 2026-04-19, per user directive "fill backfill what's been done … Phase one's properly done and we're working on phase two not phase three as the naming suggests"
- **Scope clarification**: the user's observation that "we're working on phase two" reflected the mismatch between the plan files (which skipped to phase-3-plan.md without documenting Phase 1+2) and the decision log (which DID mark both phases complete at D-20260417-002/003/004). Plan files are now continuous; phase labels are **Phase 1 ✓ complete, Phase 2 ✓ complete, Phase 3 in progress, Phase 4 planned**.
- **Source material**: `Docs/Plans/Part 2.md`; `decision-log.md` D-20260417-001 through D-20260419-019; `reports/run-3-summary.md`; `AI plans/5-area-planning-framework.md`; `CLAUDE.md` §§3–6
- **Lock status**: v1.0 retrospective — Phase 2 scope is complete; future revisions only refine provenance.
