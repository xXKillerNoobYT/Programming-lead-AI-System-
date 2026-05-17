---
id: 4298157673
number: 174
title: >-
  feat(lib): Phase 4 — Prompt Caching wrapper around Lead's Anthropic API calls
  (Part 8 §2.1)
state: open
created_at: '2026-04-20T19:28:56Z'
updated_at: '2026-04-20T19:28:56Z'
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
  - id: 10723653672
    name: 'phase:4'
    color: C5DEF5
    description: Phase 4 — production scale
  - id: 10739055710
    name: 'priority:medium'
    color: FBCA04
    description: Default; picked via oldest-first within priority band
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/174
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/174'
---
# feat(lib): Phase 4 — Prompt Caching wrapper around Lead's Anthropic API calls (Part 8 §2.1)

## Context

Phase 4 prerequisite per `Docs/Plans/Part 8 Intelligent Capability Triggering.md` §2.1. Today's Lead calls pass the full stable context (CLAUDE.md + SOUL.md + memory + recent decision-log + phase plan) on every tick. At 3-hour cadence the 5-min prompt-cache TTL guarantees a cache miss per wake. At faster cadences (existing /loop + future bursts) the cache should hit ≥ 60% of the time.

**Win**: ~10x cheaper read on cache hits; break-even at 1.25 reuses. Heartbeat stable block reuses 50-200x per day → substantial token savings.

## Acceptance Criteria

### 1. Wrap the Anthropic API call site

- [ ] Create `lib/prompt-cache.js` exporting `withCache(anthropicCallArgs, opts)` that marks specified blocks as `cache_control: { type: "ephemeral" }`.
- [ ] Integration point: whatever module today calls the Anthropic API for Lead work (grep `@anthropic-ai/sdk` usage). If none yet (still Grok-only in Phase 3), then document `lib/prompt-cache.js` as ready for Phase 4 Lead-migration without wiring yet.

### 2. Stable-block identification

- [ ] Define the "stable block" as: `CLAUDE.md` + `SOUL.md` + current `AI plans/phase-N-plan.md` + `memory/MEMORY.md` + the last 10 entries of `decision-log.md`. All ≥ 1024 tokens combined in practice.
- [ ] Dynamic block (never cached): the current tick's state snapshot, the pick, and the pick's Issue body.

### 3. Measurement

- [ ] Emit per-call cache-hit/miss metric to `reports/audit/<timestamp>.json` alongside the existing payload.
- [ ] Log a stderr warning if cache-hit rate drops below 60% over a sliding 10-tick window.

### 4. Tests

- [ ] `tests/prompt-cache.test.js` covers: stable block flagged with cache_control; dynamic block NOT flagged; correct total-prompt-token count maintained; cache metric emitted on both hit + miss.
- [ ] Use Anthropic SDK mock (no real API calls in tests).
- [ ] 8+ new tests.

### 5. Gates green

- [ ] `npm test` green.
- [ ] Bundle impact: none (this is backbone).

## Design notes

- Grok/xAI equivalent (Part 1 §6 hourly escalation): no native prompt caching; emulate via local content-hash lookup table. Out of scope for this Issue — track separately if needed.
- Anthropic prompt-cache TTL = 5 min. Not configurable. Don't try to work around it; the 3-hour cadence accepts the miss per-wake.

## Links

- Part 8 §2.1.
- Part 7 §I (credit-aware) — cache hits directly reduce Claude quota burn.
- Anthropic docs: https://docs.claude.com/en/docs/build-with-claude/prompt-caching (WebFetch the latest if still relevant).


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T19:28:56Z
**Updated:** 2026-04-20T19:28:56Z
**Labels:** type:task, status:backlog, phase:4, priority:medium
