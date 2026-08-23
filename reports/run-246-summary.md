# Run 246 Summary — Deterministic GitHub execution preview

**Date:** 2026-08-23  
**Branch:** `codex/issue-236-execution-engine`  
**Primary Issue:** #236 (child of #234)  
**Stack base:** PR #242 / `codex/issue-217-r1-hierarchy`

## Overview

Implemented the smallest safe product-heartbeat increment: a read-only GitHub Issue source, deterministic R1 leaf selector, versioned execution packet, append-only local evidence writer, and preview CLI. GitHub Issues/comments remain canonical, and no claim, dispatch, Project write, merge, release, or R2 execution path exists.

## Delivered

- Added pure snapshot validation and deterministic eligibility ordering by priority, creation time, and Issue number.
- Enforced root/R1 ancestry, native hierarchy consistency, no more than six open children, dependency closure, required Issue sections, gate vetoes, and future-horizon exclusion.
- Added a guarded `gh` adapter that reads complete paginated Issue state and native blocked-by relationships with array-only arguments and repository/URL identity validation.
- Added an append-only JSONL evidence writer and dependency-injected preview CLI.
- Added `npm run execute:next` and ignored only `.devlead/runtime/`.
- Documented preview behavior, output kinds, exit semantics, local evidence, and non-goals in `README.md`.
- Preserved the existing roadmap publication stack by merging the verified PR #242 tip without rewriting history.

## TDD and verification evidence

```text
Baseline before implementation: 172/172 root tests passed.

Task 1 selector:
- RED fixtures preceded implementation.
- Focused GREEN after review fixes: 10/10.
- Independent scoped re-review: ACCEPT.

Task 2 GitHub source:
- Initial focused GREEN: 9/9.
- Relationship-identity fixes: focused 11/11; full 193/193.
- Independent scoped re-review: ACCEPT.

Live integration fix:
- Reproduced spawnSync failure as status=null, signal=SIGTERM,
  errorCode=ENOBUFS, stdoutBytes=1052025.
- Regression test failed before the fix and passed after a bounded 64 MiB maxBuffer.
- Live source then normalized 166 Issues successfully.
- Independent scoped review: ACCEPT.

Task 3 evidence and CLI:
- RED: both focused files failed only because their production modules were absent.
- GREEN: focused 8/8; full 202/202.
- Independent scoped review: ACCEPT.

Final merged-stack verification:
- Four execution-focused files: 30/30 passed.
- Full root suite: 202/202 passed.
- git diff --check: passed.
```

Runtime used for final verification: Node `v24.12.0`, npm `11.6.2`. The package contract remains Node `>=18`; reviewed APIs are Node 18 compatible.

## Live read-only preview

The production CLI was run against `xXKillerNoobYT/Programming-lead-AI-System-` with evidence directed to a temporary file.

```text
Exit: 0
stderr: empty
Decision: no-action
Source observedAt: 2026-08-23T21:27:18.381Z
Evidence records appended: 1
Issues before / after: 166 / 166
Canonical Issue hash before:
  sha256:d047575343218a9806e2ea0e8f863742f0cc6e2d2ddfa2e357fe61ab50089243
Canonical Issue hash after:
  sha256:d047575343218a9806e2ea0e8f863742f0cc6e2d2ddfa2e357fe61ab50089243
Issue truth unchanged: yes
```

At that observation, #236 remained open with `status:in-progress`, parent #234, no blockers, and unchanged `updatedAt` `2026-08-23T19:52:33Z`. The other inspected R1 leaves were parents/epics, blocked/not-ready, or missing one or more required execution sections, so fail-closed `no-action` was the correct result. Project status was not used because Project fields are only a convenience projection and reopened-item status may be stale.

## Security and operational boundaries

- The adapter permits only the `gh` executable and passes arguments as an array without a shell.
- Relationship URLs must match GitHub, the explicit repository, and the stated Issue number.
- The complete-snapshot buffer is bounded at 64 MiB; larger snapshots fail closed.
- CLI errors are stable, redacted JSON and do not echo source errors or environment values.
- The runtime evidence file is supporting evidence only and never replaces the GitHub ledger.
- The known npm audit baseline remains open and unwaived in #227.

## Risks and rollback

- Preview mode does not claim an Issue, so concurrent previews may emit the same packet. This is intentional until a separate collision-safe claim contract is approved.
- Strict required-section parsing can produce `no-action` when otherwise useful Issues are incomplete; the canonical Issue must be repaired through the ledger rather than guessed locally.
- The synchronous complete-repository read uses bounded memory and stops above 64 MiB.
- Roll back by closing the draft PR or reverting the Issue #236 commits. Machine-local evidence under `.devlead/runtime/` or the temporary verification file can be removed without affecting canonical state.

## Remaining gates

- Whole-branch independent Spec, QA, Security, and Reviewer gates remain required before readiness.
- The branch must be pushed without force and opened as a draft PR against the verified stack base.
- Issue #236 and parent #234 require evidence comments after publication.
- Do not merge, mark ready, or start R2; R1 phase-entry approval is still authoritative.
