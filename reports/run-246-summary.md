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

Pre-review merged-stack verification:
- Four execution-focused files: 30/30 passed.
- Full root suite: 202/202 passed.
- The initial diff check did not include the then-untracked Run 246 file; independent review correctly found its Markdown hard-break whitespace after commit.

Post-review remediation verification:
- Four execution-focused files: 35/35 passed.
- Full root suite: 207/207 passed.
- git diff --check against the verified stack base: passed after the Run 246 whitespace correction.
```

Runtime used for final verification: Node `v24.12.0`, npm `11.6.2`. The package contract remains Node `>=18`; reviewed APIs are Node 18 compatible.

## Live read-only preview

The production CLI was run against `xXKillerNoobYT/Programming-lead-AI-System-` with evidence directed to a temporary file.

```text
Exit: 0
stderr: empty
Decision: no-action
Source observedAt: 2026-08-23T21:47:05.648Z
Evidence records appended: 1
Issues before / after: 166 / 166
Canonical Issue hash before:
  sha256:f3ab367fb6049e243b676a3fa2ba6cd757bb94f3ca531b1cf54a18c9852bf63e
Canonical Issue hash after:
  sha256:f3ab367fb6049e243b676a3fa2ba6cd757bb94f3ca531b1cf54a18c9852bf63e
Issue truth unchanged: yes
```

At that observation, #236 remained open with `status:in-progress`, parent #234, no blockers, and unchanged `updatedAt` `2026-08-23T19:52:33Z`. The other inspected R1 leaves were parents/epics, blocked/not-ready, or missing one or more required execution sections, so fail-closed `no-action` was the correct result. Project status was not used because Project fields are only a convenience projection and reopened-item status may be stale.

## Independent review remediation

The frozen `2ccec8d` gate round found four valid blocking defects. Publication remained paused while each was fixed at the source:

- Markdown bullets/checklists/ordered-list dependency declarations could bypass closure. Commit `ab09822` adds the failing variants, a prose false-positive guard, and the parser fix.
- Semantically identical label sets in different API order produced different packet hashes. Commit `6afdd62` canonicalizes packet labels and locks hash stability.
- Evidence output could follow out-of-tree, symbolic-link, or hard-link paths. Commit `ab82e56` confines writes to dedicated runtime directories, checks every existing path component, rejects linked/non-regular files, and opens with no-follow semantics where the platform supports them.
- Run 246 contained trailing Markdown whitespace while claiming a clean diff. This report removes the whitespace, explains why the earlier check missed the untracked file, and records the post-remediation command.

All four findings require independent re-review; no implementation or release gate self-waives them.

## Security and operational boundaries

- The adapter permits only the `gh` executable and passes arguments as an array without a shell.
- Relationship URLs must match GitHub, the explicit repository, and the stated Issue number.
- The complete-snapshot buffer is bounded at 64 MiB; larger snapshots fail closed.
- CLI errors are stable, redacted JSON and do not echo source errors or environment values.
- Evidence writes are confined to `.devlead/runtime/` or a dedicated operating-system temporary directory and reject symlink/hardlink targets.
- The runtime evidence file is supporting evidence only and never replaces the GitHub ledger.
- A fresh root audit exits 1 with 6 transitive findings (3 high, 2 moderate, 1 low, 0 critical). The branch adds no dependency; #227 now records this current six-finding baseline and remains open and unwaived.

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
