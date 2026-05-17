---
id: 4298155146
number: 173
title: >-
  feat(lib): Phase 4 — JSON-Schema return contracts on subagent/tool-call
  responses (Part 8 §2.8)
state: open
created_at: '2026-04-20T19:28:25Z'
updated_at: '2026-04-20T19:28:25Z'
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
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/173
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/173'
---
# feat(lib): Phase 4 — JSON-Schema return contracts on subagent/tool-call responses (Part 8 §2.8)

## Context

Phase 4 prerequisite per `Docs/Plans/Part 8 Intelligent Capability Triggering.md` §2.8. Today's subagent delegation (`delegate_task_to_agent` MCP tool) returns free-form markdown reports that the Lead regex-parses — brittle across format shifts. Part 8 mandates **JSON-Schema return contracts** on every subagent/skill/tool-call response, validated on receipt with explicit retry on miss.

## Acceptance Criteria

### 1. Schema definitions

- [ ] Create `lib/schemas/` directory.
- [ ] Define Zod schemas (or JSON Schema + Ajv if Zod adds too much weight) for the primary subagent return types used by the Lead today:
  - `ImplementerReport { verdict: 'DONE' | 'DONE_WITH_CONCERNS' | 'BLOCKED'; filesChanged: string[]; evidence: { tests: string; build: string; checkArch: string }; notes?: string }`
  - `SpecReviewVerdict { verdict: 'APPROVED' | 'APPROVED_WITH_CONCERNS' | 'REJECTED'; perAcResults: Array<{acId: string; met: boolean; evidence: string}>; scopeCheck: 'clean' | 'flagged'; concerns?: string[] }`
  - `CodeQualityVerdict { verdict: 'APPROVED' | 'APPROVED_WITH_NITS' | 'NEEDS_REVISION'; important: Finding[]; nits: Array<{description: string; classification: 'inline-fix' | 'follow-up'}>; recommendation: string }`
  - `Finding { id: string; severity: 'blocker' | 'important' | 'nit'; file?: string; line?: number; description: string; suggestedFix?: string }`
- [ ] Export as named types + runtime validators from `lib/schemas/index.js`.

### 2. Wrap `delegate_task_to_agent`

- [ ] Update `lib/mcp-client.js` (or equivalent) to `validateAgentReport(report, schemaName)`. On validation fail: log the offending payload, retry ONCE with a corrective prompt, then surface a `GuardrailViolation` via the guardrail module (Phase 3 §C.1).
- [ ] Subagent system prompts updated to include "return a JSON object matching schema {...}" + the schema's JSON Schema representation inline.

### 3. Tests

- [ ] `tests/schemas.test.js` covers: valid report passes; missing required field fails; extra fields allowed (forward-compat); wrong enum value fails; nested schema validation.
- [ ] 10+ new tests.

### 4. Gates green

- [ ] `npm test` all green at root + dashboard.
- [ ] No breaking change to existing Phase 3 callers — add schemas as OPT-IN per call-site until migration is complete.

## Out of scope

- Full migration of every Phase 3 caller (tracked separately if this Issue reveals more work).
- Router integration (separate Phase 4 Issue).

## Links

- Part 8 §2.8, §3.2 output-vector, §3.4 observability.
- Precedent: `lib/guardrails.js` validation patterns.


---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-20T19:28:25Z
**Updated:** 2026-04-20T19:28:25Z
**Labels:** type:task, status:backlog, phase:4, priority:medium
