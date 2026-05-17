# Run 240 — WEI-647 (L9) DevLead orchestrator routing landed

**Date**: 2026-05-09
**Branch**: `feature/wei-633-agent-team-spec`
**Agent**: CTO (`328fddb9-26b4-4475-9ed3-6265d23e7816`) — acting as DevLead until WEI-633 Q1 board approval lands the DevLead Programming Lead agent
**Decision IDs**: D-20260509-004 (this run)
**Wake**: Paperclip issue_assigned on WEI-647

## What changed

1. **`scripts/devlead-route.js`** (new) — pure classifier `classify({labels, title, description}) → {specialist, agentId, reason}` plus a CLI that reads an Issue, classifies it, and (with `--dispatch`) PATCHes `assigneeAgentId` on `/api/issues/{id}` to dispatch via Paperclip's `queueIssueAssignmentWakeup`. Mapping per WEI-633 §2.2:
   - `type:bug` → Tester (priority — regression test first, then reassign to Coder-*)
   - `area:ui` → Coder-Frontend (`9769380d-…`)
   - `area:backend` → Coder-Backend (`d7edb4d2-…`)
   - `area:test` → Tester (`1c95405c-…`)
   - `area:docs` / no label → DevLead (CTO `328fddb9-…` fallback)
2. **`tests/devlead-route.test.js`** (new) — 11 `node:test` cases: each mapping rule, `type:bug` priority, mismatched-label fallback, title-only fallback, description prose does NOT classify (regression coverage for the WEI-647 self-match). 11/11 pass.
3. **`.paperclip/agents/devlead-programming-lead/AGENTS.md`** — added "Routing helper (WEI-647)" section: CLI usage, mapping table, dispatch-mechanism note (`PATCH /api/issues/{id}` not the spec's wrong `POST /agents/.../wake`).
4. **WEI-749** filed (parented under WEI-647) — capture for the spec correction in `docs/specs/agent-team-replacement.md` §2.2 routing diagram (currently shows the wrong `/wake` URL).
5. **`decision-log.md`** — D-20260509-004 appended.

## Acceptance criteria walk-through (WEI-647)

> Acceptance: dispatch a synthetic test issue and confirm the matching specialist wakes; mismatched labels fall back to DevLead.

- **Synthetic dispatch + classification**: covered by `tests/devlead-route.test.js` and `scripts/devlead-route.js --self-test` (9 synthetic cases — area:ui/backend/test, type:bug priority, area:docs, no-label, title-fallback, prose-only-no-match, unknown-label-fallback). All pass.
- **Mismatched labels fall back to DevLead**: explicit `mismatched/unknown labels → DevLead` test case + `no labels → DevLead` test case pass. Live probe of WEI-647 itself (zero labels, prose-heavy description) returns `DevLead` after the title-only fallback fix.
- **Live wake**: not exercised this heartbeat — the cross-agent reassign requires the calling agent to be DevLead (or have orchestrator-level grant); CTO can read but the cross-agent assignment patch is verified via the explore-agent's read of `routes/issues.ts:2683-2710` (`queueIssueAssignmentWakeup` fires automatically on assignee change for non-backlog issues). Live integration test deferred until either (a) the DevLead Programming Lead agent is created in Paperclip (WEI-633 Q1 board approval) or (b) the shadow-mode trial WEI-649 begins (explicit synthetic-issue test required at that point per WEI-649 AC).

## Captures (Polsia rule 2 mid-flight)

- **WEI-749** — WEI-633 spec routing-contract correction (size S, doc-only).

## Backlog refill / queue depth check

`status:backlog` already has WEI-648 (L10), WEI-649 (L11), WEI-650 (L12), plus the new WEI-749 — comfortably ≥3.

## Next

1. WEI-749 — doc-only spec correction (small).
2. WEI-648 (L10 Reviewer wake on `pull_request.opened`) — next L-series leaf.
3. WEI-649 — shadow-mode 3-day trial (depends on L9–L10 complete + DevLead agent activation).
