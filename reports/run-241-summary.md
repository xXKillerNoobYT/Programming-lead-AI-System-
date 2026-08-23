# Run 241 Summary — GitHub-only canonical ledger

**Date:** 2026-08-23  
**Branch:** `xxkillernoobyt-plan-next-phase-design`  
**Primary Issue:** #208 (child of #207)  
**Decision evidence:** https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/208#issuecomment-5384916659

## Overview

Migrated active planning, question, approval, and decision workflows from the unavailable vault/Q&A plus append-only `decision-log.md` model to GitHub Issues/comments. Historical vault plans, D-IDs, decision-log rows, and reports remain read-only provenance.

## Delivered

- Rewrote `CLAUDE.md` source hierarchy, orient/refill, decision, question, record, commit, closure, and phase-completion rules.
- Updated `AGENTS.md`, memory guidance, heartbeat command, issue triage, run-report validation, and the async-question skill.
- Updated SessionStart prefetch to include open Issues, epics, PRs, question Issues, native sub-issue relationships, and recent comments with author/timestamps.
- Updated Paperclip Programming Lead, coder, tester, reviewer, and R2/R4/R5/R6 profiles.
- Migrated gate evidence from new D-IDs to GitHub decision-comment permalinks.
- Bound Sev2 security overrides to the exact CTO decision-comment body SHA-256 and `updatedAt`, plus matching CEO co-sign and compensating Issue.
- Normalized lifecycle gates: R2/R4/R5 + Reviewer before merge; R6 + R5 restamp after merge at release.
- Defined authorized owner-answer handling and prevented live chat answers from closing/unblocking a question before GitHub confirmation.

## Acceptance criteria

- [x] Active work, questions, approvals, and new decisions point only to GitHub Issues/comments.
- [x] `decision-log.md` is read-only historical evidence; no new D-IDs are allocated.
- [x] Vault plans/Q&A are historical/read-only and absent from active heartbeat orientation/refill.
- [x] Design questions use `type:question` + `status:needs-user` Issues.
- [x] Heartbeat selection/decomposition uses active GitHub roadmap and native sub-issues.
- [x] Custom agents, skills, SessionStart prefetch, Paperclip profiles, and gate specs follow the same policy.

## Verification evidence

```text
git diff --check
exit 0

<bundled sh.exe> -n .claude/scripts/session-prefetch.sh
exit 0

GitHub GraphQL probe using the SessionStart Issue graph query
result: 2 Issue nodes, exit 0
```

Independent `gpt-5.5` reviews ran iteratively until no unresolved finding remained; final requested correction aligned the org-v1 introduction with the four active lifecycle gates.

## Open concerns

- `SOUL.md`, `README.md`, and `architecture.md` still require their separately approved/scoped reconciliation children under #207.
- Historical reports and `decision-log.md` intentionally retain their original wording.
- Remote sessions without `gh` remain tracked by #62; prefetch continues to fail soft and instructs live-tool fallback.

## Metrics

- Open Issues after this run: 49
- Open backlog after this run: 32
- Native child created for this run: #208 under #207

## Next Task

Continue the #207 child tree with the owner-approved scoped `SOUL.md` correction, then current-state architecture and product/glossary reconciliation.
