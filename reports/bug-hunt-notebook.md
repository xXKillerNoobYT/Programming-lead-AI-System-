# Bug-hunt notebook

> **Authoritative source of truth is [Issue #105](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105) and its comment thread, NOT this file.**
> This local notebook is a working cache. If it goes missing, regenerate it by re-reading #105 + child-Issue list + prior `## YYYY-MM-DDTHH:MMZ` tick sections committed in git history. Do not trust this file over GitHub.

Per the recurring bug-hunt /loop ([#105](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105)). See #105 for the full per-tick checklist, known drift patterns, and quality-over-velocity rules. See the [2026-04-19 policy comment](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/105#issuecomment-4275209438) for the falsely-closed-Issue audit extension.

## Child Issues filed so far

_(Canonical list is GitHub: `gh issue list --search "parent:#105" --state all`. Mirror here for quick scan.)_

- [#106](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/106) — Dual lockfiles at repo root + dashboard/ — backlog — filed tick 1
- [#107](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/107) — Local main diverges from origin/main after squash-merges — backlog — filed tick 1
- [#108](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/108) — Branch-name/content drift: bugfix absorbed feature work — backlog — filed tick 1

## Tick log

<!-- Newest tick at top. Each section: ## YYYY-MM-DDTHH:MMZ — Tick N -->

## 2026-04-19T~04:30Z — Tick 1b (notebook recreation + falsely-closed policy intake)

**Branch**: `main` @ `3b1372d` (main advanced from `127d49f` → `3b1372d` between tick 1 and now; PR #103 presumably merged + `bugfix/react-19-stable-upgrade` pruned)
**Dashboard boot**: **SKIPPED** — paperwork-only re-tick due to file-loss recovery
**Playwright MCP**: reconnected (per session reminder). Tick 2 can use it.

### Findings

- FP: `loop/notebook-loss/branch-switch-deletes-working-file` — the `reports/bug-hunt-notebook.md` I wrote during tick 1 was deleted by the branch switch from `bugfix/react-19-stable-upgrade` → `main`, because the file was not yet committed. This is a durability gap in the loop's own working memory. Filing as child Issue.

### Deferred to tick 2

- Dashboard boot + Playwright walk (original tick-2 plan; Playwright now reconnected so the blocker is cleared)
- Proper sub-issue linkage (#106/#107/#108 → #105) via `gh api graphql addSubIssue`
- First opportunistic falsely-closed-Issue audit (only if tick 2 would otherwise go idle with 3h reschedule)
- Check `.claude/scheduled_tasks.lock` staleness before acquiring heartbeat mutex

### Next wake-up

Tick 2 still scheduled from prior session's `ScheduleWakeup` (~1h from tick 1; should fire at ~04:57Z). Not re-scheduling from this 1b — would duplicate.

---

## 2026-04-19T~04:00Z — Tick 1 (setup + session-derived findings)

**Branch**: `bugfix/react-19-stable-upgrade` @ `f37fc88` (now pruned)
**Origin-main HEAD**: `127d49f` (at that time)
**Parallel session**: YES — `.claude/scheduled_tasks.lock` held by session `a3f7eb54` (PID 25672)
**Dashboard boot**: SKIPPED — deferred to tick 2 (parallel session held the mutex)

### Findings

- FP: `build/next-workspace-root/dual-lockfile` — filed as [#106](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/106)
- FP: `git/main-divergence/squash-merge-orphans` — filed as [#107](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/107)
- FP: `git/branch-drift/bugfix-absorbs-feature` — filed as [#108](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/108)

### Deferred to tick 2

- Dashboard boot + Playwright walk
- Sub-issue linkage of #106/#107/#108 under #105 via `gh api graphql addSubIssue`
- FP check: `harness/session-prefetch/stale-legacy-peer-deps-after-fix` — session-prefetch.sh still passes `--legacy-peer-deps` even though PR #103 fixes the underlying issue; low-priority since flag is now redundant-but-harmless.

### Next wake-up (as-scheduled)

`ScheduleWakeup` delay = 3600s (1h) — bugs found → 1h cadence.
