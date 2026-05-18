# Spec-Gate Token Convention

Source of authority: [WEI-715](/WEI/issues/WEI-715) Phase 1 activation, [WEI-723](/WEI/issues/WEI-723) R2 first queued work item, and Decision `D-20260509-001`.

This document defines the literal R2 spec-before-code approval token that Reviewer and future automation must recognize on code-bearing pull requests.

## Required Token

R2 approves a spec-covered pull request by submitting a GitHub approving review whose body includes this exact token shape:

```text
spec-gate:approved D-YYYYMMDD-### spec=<link>
```

Where:

- `spec-gate:approved` is the literal gate token.
- `D-YYYYMMDD-###` is the decision-log entry that approved or ratified the relevant scope.
- `spec=<link>` points to the approved spec, parent issue, issue document, or decision record that makes the implementation scope checkable.

Example:

```text
spec-gate:approved D-20260517-003 spec=/WEI/issues/WEI-650
```

The token belongs in a fresh `gh pr review --approve` body from R2. A plain PR comment or non-approving review may be useful evidence, but it does not satisfy the merge gate unless the Reviewer or CTO records an explicit waiver.

## Waiver Token

If R2 cannot issue an approving review but the change is allowed to proceed, the PR must link a decision-log entry with this shape:

```text
spec-gate:waived D-YYYYMMDD-### reason=<short-reason> spec=<link>
```

Waivers are for exceptional cases only. The linked decision-log entry must name:

- why the normal approving review was not possible or not appropriate;
- who accepted the risk;
- the bounded scope of the waiver;
- any follow-up issue needed to restore normal gate coverage.

## Enforcement

Reviewer checks for `spec-gate:approved ... spec=...` in an approving R2 review before merge. If absent, Reviewer requests changes unless a valid `spec-gate:waived` decision-log entry is linked.

Coder agents must not treat an issue as implementation-ready unless the issue has a frozen spec or a CTO-approved exception. Child implementation issues should explicitly state whether `Spec frozen for implementation` is present and should record workspace provenance before edits: repo or `local-only`, workspace path, Paperclip workspace id when available, base ref, current branch, new branch, and dirty status.

## Related Authority

- R2 profile: [`.paperclip/agents/r2-tech-lead-execution/AGENTS.md`](../../.paperclip/agents/r2-tech-lead-execution/AGENTS.md)
- Org v1 enforcement points: [`docs/specs/org-v1-enforcement-points.md`](./org-v1-enforcement-points.md)
- Spec-gate harness: [`scripts/spec-gate-bot.js`](../../scripts/spec-gate-bot.js)
- SPEC template: [`templates/SPEC.md`](../../templates/SPEC.md)
