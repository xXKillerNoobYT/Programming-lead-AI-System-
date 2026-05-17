---
id: 4290577382
number: 127
title: 'Phase 3 §C.1.b: static detector for raw outbound-call patterns in backbone'
state: closed
created_at: '2026-04-19T10:26:27Z'
updated_at: '2026-04-19T20:48:31Z'
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
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/127
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/127'
closed_at: '2026-04-19T20:48:31Z'
---
# Phase 3 §C.1.b: static detector for raw outbound-call patterns in backbone

Per `AI plans/phase-3-plan.md` §C.1 (second sub-leaf — first was §C.1.a Issue #125 / PR #126).

## Goal
Static scan that flags any raw `fetch(...)`, `require('node:https')`, `spawn(...)`, `spawnSync(...)`, `exec(...)`, `execSync(...)`, `execFile(...)`, `execFileSync(...)` outside of `lib/guardrails.js` (which legitimately wraps them) — those calls should go through `safeFetch` / `safeSpawn` instead.

## Acceptance criteria
- [ ] New `dashboard/scripts/check-guardrail-coverage.js` exports `runGuardrailCoverage(repoRoot)` returning `{ passed: boolean, violations: [{file, line, snippet, kind}, ...] }`
- [ ] Scans these source roots: `heartbeat.js` (root), `lib/**/*.js`, `tests/**/*.js` (extensions: .js, .mjs, .cjs)
- [ ] Detects (regex-level v1) the call patterns listed above
- [ ] Self-exempts `lib/guardrails.js` (it wraps these legitimately) and `dashboard/scripts/check-guardrail-coverage.js` (the regex source itself)
- [ ] Exempts test files in `tests/` that are testing the wrappers themselves (test files for guardrails)
- [ ] Honors `// guardrail-coverage: allow <reason>` inline annotation on the same line (escape hatch for one-off legitimate raw use, e.g. inside the wrapper)
- [ ] CLI: `node scripts/check-guardrail-coverage.js` exits 0 if pass, 1 if violations; `--help` prints usage and exits 0; `--list` lists scan roots and exits 0
- [ ] New `check:guardrail-coverage` npm script in `dashboard/package.json` invoking the CLI
- [ ] Exports for programmatic use: `runGuardrailCoverage`, `PATTERNS`, `SCAN_ROOTS`
- [ ] New tests in `dashboard/__tests__/check-guardrail-coverage.test.js` (uses jest, same pattern as `check-arch.test.js`):
  - file with raw fetch → flagged
  - file with raw spawnSync → flagged
  - file with safeFetch → clean
  - lib/guardrails.js with raw fetch → clean (self-exempt)
  - file with raw fetch + `// guardrail-coverage: allow integration with vendor X` → clean
  - dashboard/__tests__/ files NOT scanned (they're not backbone)
  - --help / --list flags exit 0
- [ ] Dashboard `npm test` green
- [ ] Repo `npm run check:arch` still green

## Out of scope (separate sub-leaves)
- §C.1.b.2: auto-file `type:bug` GH Issue when run with `--auto-file` flag (needs rate-limit + dedup)
- §C.1.b.3: wire into `dashboard/scripts/cohesion-check.js` FLAGGED tier
- §C.1.c: migrate existing raw calls in heartbeat.js / lib/mcp-client.js to use safeFetch/safeSpawn (this is what THIS check will reveal as work to do)

## Why detection-only first
Two reasons:
1. Auto-filing Issues from a script needs careful dedup (`gh` calls + duplicate-Issue avoidance) — separate concern
2. The first run of this check will surface a list of every raw call already in the codebase — that's the §C.1.c work backlog. Better to see the list before automating Issue creation off it.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T10:26:27Z
**Updated:** 2026-04-19T20:48:31Z
**Closed:** 2026-04-19T20:48:31Z
**Labels:** type:task, status:backlog, phase:3, autonomous-lead
