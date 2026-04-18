# Phase 4 Execution Plan — Production Scale & Distribution (Local Node.js, No Docker)

**Status**: Draft v1.0 · Owner: Claude Code · Decision ID: D-20260417-022 · Date: 2026-04-17
**Source-of-truth for Issue #8** · Governs all Phase 4 atomic Issues until superseded.

> **How this file is used (per `CLAUDE.md` §1 planning chain).** Every Phase 4 GitHub Issue cites a section of this plan (e.g. *"per `plans/phase-4-plan.md` §B.1"*). Multi-layer sub-issues (D-20260417-018): section headers (A, B, C …) become parent epics; leaf subtasks (A.1, A.2 …) become child Issues via GitHub's native `addSubIssue` graphql mutation.

---

## 1. Goals & Scope Boundaries

### 1.1 Goals
Phase 4 takes DevLead MCP from **"works on the designer's machine if they're paying attention"** (end of Phase 3) to **"runs 24/7 unattended, survives crashes, ships as a product other designers can install."** Five load-bearing objectives:

1. **Process supervision without Docker** — PM2 + OS-native schedulers keep `heartbeat.js` alive, restart on crash, rotate logs, honor system reboots. The `no Docker` preference (D-20260417-005) stands; we cover Windows, macOS, and Linux via native mechanisms.
2. **CI/CD gating** — GitHub Actions runs lint / type-check / tests / security scans on every PR. Merges are blocked until green. No more "false green" regressions (D-20260417-007).
3. **One-command install** — `git clone` + `npm install` + `npm run setup` brings a fresh machine to a working state, including `.mcp.json` templating, required binaries sanity-check, first-run onboarding (Part 6 §17).
4. **Production observability** — `heartbeat.js` emits structured logs, exposes a health endpoint, and surfaces cost/budget telemetry in the Log tab (Part 6 §10).
5. **Release & documentation** — LICENSE, CHANGELOG, installation guide, troubleshooting playbook, and one-command release flow (`npm run release` → tag + changelog + GitHub Release).

### 1.2 In scope
- PM2 ecosystem file + Windows Task Scheduler (`schtasks`) + systemd unit (user-level, no root).
- GitHub Actions workflows: `ci.yml` (PR gating), `release.yml` (tag → artifacts).
- `.env.example`, dotenv loader, `scripts/setup.js` installer, `.mcp.json` templating to parameterize per-machine paths (consumes #17).
- Coverage-trend gating (post-Phase 3 §A.4 in production use).
- Structured JSON logging out of `heartbeat.js` + log rotation.
- Health/status endpoint at `GET /status` (Part 6 §3.1) and CLI `heartbeat --status`.
- Cost budget enforcement for hourly Grok: per-day / per-month caps + dashboard-surfaced alert.
- Backup/restore: per-project state export (JSON tarball) + rollback from backup.
- User-testing telemetry (opt-in, local-only by default).
- LICENSE file, attribution/third-party notices, CONTRIBUTING.md.
- Troubleshooting playbook (`Docs/troubleshooting.md`).
- Release automation: changelog generation, semver, tag → GitHub Release with `CHANGELOG.md` excerpt.
- Benchmarking harness: local LLM perf vs hourly Grok; heartbeat-tick latency over time.

### 1.3 Out of scope (deferred to Phase 5+ or abandoned)
- **Any form of Docker / container runtime.** Hard user preference (D-20260417-005). Includes Podman, Lima, devcontainers, Nix-shells built on container primitives. Native Node.js only.
- Multi-user / SSO / cloud-tenant hosting.
- Public web-accessible deployments (DevLead is local-first by design).
- Messaging-app bridges (Telegram / WhatsApp / Slack) — Part 4 §5, deferred.
- Cross-project knowledge-base MCP — deferred past 1.0.
- Distribution via an App Store / Homebrew tap / winget / installer `.msi` — out of scope for 1.0; `git clone` + npm is enough.
- Closed-source binary distribution.

### 1.4 Hard guardrails inherited from Phases 1–3
- **No Docker, no containers, no Python venv** (D-20260417-005).
- **Pure-orchestrator runtime** — DevLead never codes; delegation via MCP only (per SOUL.md).
- **CLAUDE.md Polsia 5-rule heartbeat, oldest-first pick, finish-before-switch, run-complete ↔ Issue-close pairing.**
- **Cohesion check (Phase 3 §A) gates every merge.**
- **Multi-project isolation (Phase 3 §B) applies to Phase 4 deployment targets.**
- **Evidence-before-assertion** (D-20260417-007) — every production claim backed by commands + captured output.

---

## 2. Dependencies on Phases 1–3

### 2.1 What Phases 1–3 deliver (that Phase 4 builds on)
| Deliverable | Decision | Phase 4 usage |
|---|---|---|
| `heartbeat.js` v0 read-only loop | D-20260417-015 | Wrapped with PM2 / scheduler (§A) |
| MCP client layer in heartbeat | D-20260417-020 | Graceful-degradation telemetry feeds §D observability |
| Green dashboard test baseline | D-20260417-010 | CI asserts coverage-floor doesn't regress (§B) |
| Phase 3 cohesion-check (§A) | — (future) | Becomes the CI gate (§B.1) |
| Phase 3 multi-project isolation (§B) | — (future) | `scripts/setup.js` scaffolds per-project dirs (§C.1) |
| Phase 3 heartbeat hardening (§C) | — (future) | Production-safe daemon under PM2 (§A) |
| Part 6 UI Master Plan | D-20260417-009 | §D.1 surfaces in Log tab; §H.1 surfaces release notes |
| `Docs/Plans/Dev-Q&A.md` async channel | D-20260417-019 | §D.4 cron heartbeat consults the file on every tick |
| Multi-layer sub-issue decomposition | D-20260417-018 | Every §X parent epic gets child Issues via `addSubIssue` |

### 2.2 Pre-conditions for Phase 4 kickoff
- Phase 3 §A cohesion scripts exist and pass on a green baseline.
- Phase 3 §B multi-project isolation has landed (even if only devlead-mcp is wired; §C.1 migration completes Phase 4 §C.1 below).
- `heartbeat.js` runs a full tick end-to-end (v0 + MCP wiring done per D-020).
- PR #10, PR #14, PR #25 merged (bootstrap + UI plan + Phase 3 plan).

If any pre-condition is unmet when a Phase 4 Issue is picked, the heartbeat either blocks (records in run report) or picks an earlier-dependency Issue. It does **not** stall.

---

## 3. Workstreams (parent epics → child subtasks)

Each `§X.N` below is one child Issue under the matching `§X` parent epic. Labels: `type:task` (or `type:bug`), `status:backlog`, `phase:4`, `autonomous-lead`, plus an area tag (`area:supervision` · `area:ci-cd` · `area:install` · `area:observability` · `area:config` · `area:backup` · `area:budget` · `area:release` · `area:docs` · `area:benchmark` · `area:legal`).

Parent epics carry `type:epic`.

### A. Process Supervision (no Docker)  *(area:supervision)*
**Parent epic:** "Phase 4 §A — Keep `heartbeat.js` alive 24/7 across OSes without Docker."
- **A.1** PM2 ecosystem file `ops/pm2/ecosystem.config.js` + `npm run start:pm2` script + `README-PM2.md` (start / stop / logs / restart).
- **A.2** Windows Task Scheduler XML (`ops/windows/devlead.xml`) + `scripts/install-windows-task.ps1` + uninstall counterpart. Runs heartbeat on user-logon.
- **A.3** systemd user unit (`ops/systemd/devlead.service` + `devlead.timer`) + install / uninstall shell scripts. No `sudo` required.
- **A.4** macOS launchd plist (`ops/launchd/com.devlead.heartbeat.plist`) + `launchctl` install/uninstall helpers.
- **A.5** Universal log rotation: heartbeat writes to `logs/heartbeat-<YYYY-MM-DD>.jsonl`; old logs pruned after `LOG_RETENTION_DAYS` (default 14).
- **A.6** Graceful-shutdown handler: on SIGINT/SIGTERM flush in-flight MCP disconnects + final run-report line before exit (≤ 5 s budget).
- **A.7** Crash-loop detector: if heartbeat restarts > 5× in 60 s, write a `.crash-loop` marker, pause the scheduler, open a `type:bug` Issue.

### B. CI/CD  *(area:ci-cd)*
**Parent epic:** "Phase 4 §B — Every PR runs the cohesion-check battery; no more unverified green."
- **B.1** `.github/workflows/ci.yml` — on PR to `main`: `npm ci` (root + dashboard), run Phase 3 §A cohesion-check, upload coverage as artifact, block merge on fail.
- **B.2** `.github/workflows/release.yml` — on tag push `v*.*.*`: build dashboard, run full check suite, generate CHANGELOG diff, create GitHub Release.
- **B.3** CodeQL security scan workflow (JavaScript/TypeScript). Already surfaced by Dependabot; CodeQL catches issues Dependabot misses.
- **B.4** `pre-commit` hook (optional via husky or a pure-Node script at `scripts/pre-commit.js`) that runs `check:lint` + `check:types` on staged files.
- **B.5** Branch-protection config recorded in `Docs/ops/branch-protection.md` (what rules must be set in GH UI; automation-friendly JSON export).
- **B.6** Coverage-regression gate: CI reads `reports/coverage-floor.json` (Phase 3 §A.4) and fails if coverage drops > 1 pp.

### C. Distribution & Installation  *(area:install)*
**Parent epic:** "Phase 4 §C — `git clone` + one command installs the whole thing."
- **C.1** `scripts/setup.js` — interactive installer: checks Node ≥ 20, Python ≥ 3.11 (for Mempalace), `gh` auth, prompts for `.mcp.json` paths, writes `.env` from `.env.example`.
- **C.2** `.env.example` — exhaustive env var template with inline comments. Consumes Issue #17 (parameterize hardcoded mempalace path).
- **C.3** Root-level dotenv loading in both `heartbeat.js` and `dashboard/` dev server. Uses `node:process.loadEnvFile()` (zero-dep, Node 20+).
- **C.4** `scripts/doctor.js` — diagnostic: checks each `.mcp.json` server starts cleanly, reports `ok` / `fail` per server with reason. Invokable via `npm run doctor`.
- **C.5** `README.md` quick-start section rewrite: three commands from clone to running heartbeat + dashboard.
- **C.6** Cross-platform path handling audit: scan for hardcoded `C:/…` paths or `/home/…` paths; replace with `path.join(os.homedir(), …)` or equivalent. Surfaces #17 as one of many.

### D. Production Observability  *(area:observability)*
**Parent epic:** "Phase 4 §D — Can a user diagnose a prod issue without reading source?"
- **D.1** Structured JSON logging: all `heartbeat.js` log lines emitted as single-line JSON with `{ts, level, tick, component, event, data}`. Replaces raw `console.log`.
- **D.2** Health/status endpoint `GET /status` on the dashboard dev server (or a separate `heartbeat-status-server.js` port 3010): returns last tick timestamp, queue depth, open Issue counts, MCP server states, process uptime.
- **D.3** `heartbeat --status` CLI: queries the endpoint (or reads `.heartbeat-state.json` fallback) and prints a human-readable status.
- **D.4** Dev-Q&A surfacing in Log tab (Part 6 §7.3 column B): open questions visible without opening the file; click → open `Docs/Plans/Dev-Q&A.md` at the entry anchor.
- **D.5** Error aggregation: `reports/errors/<YYYY-MM-DD>.jsonl` with deduplication (count + first-seen / last-seen + stacktrace hash).
- **D.6** Coverage trend viz (continues Phase 3 §E.3 with production historical data).

### E. Secrets & Config Portability  *(area:config)*
**Parent epic:** "Phase 4 §E — Nothing is hardcoded. Everything is env-driven. Nothing is committed."
- **E.1** `.mcp.json` templating: ship `.mcp.json.template` with `${HOME}`-style placeholders; `scripts/setup.js` renders `.mcp.json` from it. Consumes Issue #17 directly.
- **E.2** Secrets audit: grep for keys matching obvious patterns (`sk-`, `gho_`, `Bearer `) across committed files; any hit opens a `type:bug` Issue.
- **E.3** Preference import/export (Part 6 §8.3) redacts secrets on export — never ships an API key out of the machine.
- **E.4** Rotation playbook `Docs/ops/secrets-rotation.md` — when a key leaks, exact steps to revoke + rotate.

### F. Backup & Recovery  *(area:backup)*
**Parent epic:** "Phase 4 §F — Losing a machine doesn't mean losing the project."
- **F.1** `scripts/backup.js --project <id>` — writes a timestamped tarball of `projects/<id>/` + MemPalace wing export.
- **F.2** `scripts/restore.js <archive>` — restores a project from a tarball; verifies integrity + prompts before overwriting.
- **F.3** Pre-migration tag per Phase 3 §B.7 (`pre-phase-3-migration`) — establish the same pattern for every Phase 4 backward-incompatible change.
- **F.4** Decision-log versioning: `decision-log.md` entries immutable after write; new decisions append; corrections via supersedes-D-ID syntax.

### G. Cost Management (Hourly Grok Budget)  *(area:budget)*
**Parent epic:** "Phase 4 §G — No surprise bills."
- **G.1** Token-cost estimator: each hourly Grok call logs `{promptTokens, completionTokens, modelId}`; running total per day/month in `reports/budget/<YYYY-MM>.json`.
- **G.2** Budget cap preference: `grokDailyBudgetUsd` / `grokMonthlyBudgetUsd`; on overage, skip the call + file a `type:task` Issue + surface in Log tab.
- **G.3** Budget alert thresholds (50% / 80% / 100%): dashboard toast + optional email via MCP.
- **G.4** Local-only fallback: if budget is exhausted, heartbeat continues with local LLM only until next period rollover.

### H. Release Automation  *(area:release)*
**Parent epic:** "Phase 4 §H — One command ships a release."
- **H.1** `CHANGELOG.md` + Conventional-Commits → release-notes generation via `scripts/changelog.js`.
- **H.2** `npm version <patch|minor|major>` hook: runs cohesion-check first; aborts on fail.
- **H.3** `scripts/release.js`: tags, pushes, triggers §B.2 workflow; surfaces the GitHub Release URL in the dashboard.
- **H.4** Semver policy `Docs/ops/semver.md`: what counts as major/minor/patch for this project.

### I. Documentation Polish  *(area:docs)*
**Parent epic:** "Phase 4 §I — A new user is running in under 30 minutes."
- **I.1** `Docs/INSTALLATION.md` — rewrite with OS-tabbed walkthrough, screenshots, error handling.
- **I.2** `Docs/TROUBLESHOOTING.md` — top 10 failure modes with fixes; grows with each production bug.
- **I.3** `Docs/ARCHITECTURE.md` (promote from root `architecture.md`): deeper diagrams, sequence flows, MCP tool inventory.
- **I.4** In-dashboard `?` help sheet (Part 6 §16) populated with all keyboard shortcuts.
- **I.5** Video walkthrough (external link acceptable; don't host in-repo).
- **I.6** README.md audit for outdated claims (continues D-20260417-007 spirit).

### J. Benchmarking  *(area:benchmark)*
**Parent epic:** "Phase 4 §J — Measure so improvements aren't vibes."
- **J.1** `scripts/bench-local-llm.js` — fixed prompt set, measure latency + tokens/s for the local Ollama model vs hourly Grok.
- **J.2** Heartbeat-tick latency: track `tickStart → tickEnd` durations; alert if median drifts > 2× baseline.
- **J.3** Coverage-trend regression alarm: if coverage trend inflects downward over N runs, post to Dev-Q&A.md.
- **J.4** Monthly benchmark report generated automatically into `reports/benchmarks/<YYYY-MM>.md`.

### K. Licensing & Legal  *(area:legal)*
**Parent epic:** "Phase 4 §K — Open-source hygiene."
- **K.1** `LICENSE` file (MIT or Apache-2.0 — user picks; default to MIT per lightest-touch).
- **K.2** Attribution / third-party notices: generated from `package.json` deps (`scripts/attribution.js`).
- **K.3** `CONTRIBUTING.md` — how to open Issues / PRs / Decision-ID discipline / how the heartbeat picks up contributor PRs.
- **K.4** Bias / ethics toggle (Part 1 §10) — preference that, when on, runs an additional ethics-review prompt on hourly Grok outputs.

---

## 4. Success Criteria & Verification

Phase 4 is complete when **all** of these are true (evidence-backed, per `CLAUDE.md` §3 Step 5):

- [ ] Every parent epic §A–§K has a closed GitHub Issue; every child subtask Issue cites `plans/phase-4-plan.md §X.N`.
- [ ] `npm run setup` on a fresh machine (clean `git clone`) brings the project to a working state in < 10 minutes.
- [ ] `npm run doctor` reports `ok` on every MCP server from `.mcp.json.template`.
- [ ] PM2 (+ systemd + launchd + Windows Task) boot configs verified on their respective OSes (evidence: captured startup logs + `systemctl --user status` / `schtasks /query` / `launchctl list`).
- [ ] `.github/workflows/ci.yml` passes on a clean main; blocks a test PR that introduces a deliberate regression.
- [ ] Cost budget enforcement verified by simulating an overage → heartbeat skips + Issue filed + dashboard alert.
- [ ] Backup/restore round-trip: back up a project, delete it, restore from tarball, run a heartbeat — decision-log + memory intact.
- [ ] Release automation: tag `v0.1.0` → GitHub Release auto-created with changelog excerpt.
- [ ] Documentation: a new user who has only read `README.md` + `Docs/INSTALLATION.md` can get a heartbeat running in ≤ 30 min.
- [ ] Benchmarks: one month of heartbeat-tick latency data + one local-vs-Grok comparison report committed under `reports/benchmarks/`.
- [ ] LICENSE, CONTRIBUTING.md, attribution, CHANGELOG all present.
- [ ] `architecture.md` / `memory.md` / `CLAUDE.md` updated to reflect production behaviors.

---

## 5. Open Questions

Surface via `Docs/Plans/Dev-Q&A.md` (the async channel, D-20260417-019) when the affected Issue begins. Defaults noted — the heartbeat uses the default until the user overrides.

1. **LICENSE choice** — MIT vs Apache-2.0 vs dual? Default: MIT. Decision can land at §K.1.
2. **macOS launchd vs `cron`** — launchd is Apple's native and integrates with user-logon; `cron` is simpler. Default: launchd (§A.4).
3. **systemd: user unit vs system unit?** Default: **user** unit so no sudo is ever required. If a user wants system-wide, document the manual path but don't automate it.
4. **Log format: single JSON lines vs structured per-tick markdown?** Default: JSONL for programmatic consumption; tick markdown continues for human reading.
5. **Budget-cap behavior on overage** — skip Grok entirely vs. downgrade to a cheaper model? Default: **skip + file Issue + fallback to local-only** (§G.2). User can opt for downgrade later.
6. **Release workflow cadence** — semver every PR, weekly, or on-demand? Default: **on-demand via `npm run release`** to avoid release noise.
7. **CI on push-to-branch vs only on PR?** Default: **only on PR** to conserve Actions minutes. Push-to-main already gates via PR-required branch protection (§B.5).
8. **Telemetry opt-in scope** — count anonymous tick count only, or include MCP server names, error hashes, etc.? Default: **nothing beyond opt-in local log inspection** for 1.0; remote telemetry deferred.
9. **Backup destination** — local disk only, or optionally cloud (S3, etc.)? Default: **local only** for 1.0; user can point `scripts/backup.js --out <path>` at any mount.
10. **Dashboard "Status" page location** — `/status` alongside the app or separate `heartbeat-status-server.js` on a second port? Default: **separate process** so a dead dashboard doesn't hide a living heartbeat (§D.2).

---

## 6. Issue Decomposition Order

Issues will be created in waves. Each parent epic §X gets one `type:epic` Issue; children become sub-issues via `addSubIssue`. Initial decomposition creates only the **first 3 wave-1 leaf Issues** today, per #8's AC (Polsia Rule 4 queue depth ≥ 3).

**Wave 1 — unblocks Phase 4 confidence** (create first 3 today):
1. **§B.1** `.github/workflows/ci.yml` — turns every future PR into a verified-green merge.
2. **§C.2** `.env.example` + dotenv loader — foundation for every config Issue (consumes #17).
3. **§A.1** PM2 ecosystem file + `npm run start:pm2` — establishes the "daemon survives a reboot" baseline.

**Wave 2 — fills out supervision + install:**
- §A.2, §A.3, §A.4 (Windows / systemd / launchd configs)
- §C.1, §C.4, §C.5, §C.6 (setup script, doctor, README, cross-platform paths)
- §B.2, §B.3, §B.6 (release workflow, CodeQL, coverage-regression gate)

**Wave 3 — observability + config hardening:**
- §A.5, §A.6, §A.7 (logs, graceful shutdown, crash-loop)
- §D.1, §D.2, §D.3, §D.4, §D.5 (JSON logs, status endpoint, Dev-Q&A surface, error aggregation)
- §E.1–E.4 (secrets & config)

**Wave 4 — polish / release-ready:**
- §F.1–F.4 (backup / recovery / decision-log versioning)
- §G.1–G.4 (budget management)
- §H.1–H.4 (release automation)
- §I.1–I.6 (docs polish)
- §J.1–J.4 (benchmarks)
- §K.1–K.4 (licensing)

---

## 7. Provenance & Maintenance

- **Author**: Claude Code, 2026-04-17, per Issue #8 acceptance criteria.
- **Source material**: `Docs/Plans/Part 1.md` §§10,11,12; `Part 2.md` §6; `Part 4.md` §§4,7; `Part 6.md` §§14,15,17; `plans/main-plan.md` §Roadmap §CI/CD §Considerations; `plans/phase-3-plan.md` §§A,B,C (dependencies); `CLAUDE.md` §§3,4,5,6,7; `decision-log.md` D-20260417-005 (no-Docker), D-007 (evidence-before-assertion), D-015 (heartbeat.js v0), D-018 (sub-issues), D-019 (Dev-Q&A), D-020 (MCP client layer).
- **Update rule**: refine this plan before producing more `phase:4` Issues whenever any subtask proves ambiguous (CLAUDE.md §3 Step 2b). Refinements land under a new Decision ID; **D-20260417-022** is this document's birth ID.
- **Lock status**: Draft v1.0 — open to user revision. Next revision becomes v1.1 with a new DocVersion tag at the top.
- **Cross-reference with Phase 3**: §B.1 here depends on `npm run check:all` from Phase 3 §A.2 existing. §C.1 depends on multi-project layout from Phase 3 §B. Pick Phase 3 Issues first when a Phase 4 Issue is otherwise ready — the dependency check lives in each Issue's Dependencies section.
