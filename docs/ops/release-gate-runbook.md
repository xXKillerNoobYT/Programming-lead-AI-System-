# Release Gate Runbook

Owner: R6 DevOps / Release

This runbook defines the minimum release-gate evidence before cutting a release tag or recommending a deploy. It does not grant production authority. Production-changing deploys, tags, secrets changes, external provider changes, and release vetoes still require the approved owner path for the release.

## Gate Inputs

Capture these fields before any release recommendation:

- Repo or `local-only` marker
- Workspace path
- Paperclip workspace id, when available
- Base ref
- Current branch
- Branch name
- Dirty status
- Release owner
- Rollback owner
- Approval path
- Smoke check
- Monitoring window
- Post-release closeout notes

Branch names must be either issue-scoped (`feature/wei-725-release-gate-runbook`, `fix/wei-725-ci-baseline`) or dated release branches (`release/YYYY-MM-DD` or `release/vX.Y.Z-YYYY-MM-DD`). If an existing shared workspace branch does not match the current issue, record why it is being reused and confirm pre-existing user or other-agent changes are preserved.

Customer-facing releases require EP go/no-go. Brand, pricing, legal, strategic, budget, or company-direction changes require Isaac approval before release.

## Pre-Cut Checks

1. Identify the release target:
   - Target branch or commit
   - Release version or tag candidate
   - Environment
   - Required sign-offs
2. Check workspace hygiene:
   - `git status --short --branch`
   - Confirm no unrelated dirty files are being included.
   - Document any preserved pre-existing changes.
3. Confirm main-branch CI health:
   - `gh run list --branch main --limit 50`
   - Record success, failure, cancelled, skipped, and in-progress counts.
   - Do not mark release-ready when CI is red or unknown.
4. Confirm instruction-file canonical sync per `CLAUDE.md` section 6:
   - `CLAUDE.md`, `SOUL.md`, `.claude/**`, `architecture.md`, and `memory.md` must match the latest `origin/main` versions unless the release explicitly includes an approved instruction-file-only change.
   - For long-lived branches, merge `origin/main` before release work when instruction files are more than five commits behind.
5. Confirm gate sign-offs:
   - QA sign-off for user-facing changes.
   - Security/reliability sign-off when the change touches auth, secrets, infrastructure, incident posture, data handling, or other release-risk areas.
   - CTO route for security/reliability concerns until that role is staffed.
6. Confirm deployability:
   - Deployment notes exist.
   - Rollback notes exist.
   - Smoke check is named.
   - Monitoring window is named.
   - Known risks have owners.

## Release-Gate Token

Use this token format when the release cut is approved and CI evidence is known:

```text
release-gate:cut tag=<vX.Y.Z> ci=<run-url>
```

Rules:

- `tag` must be the exact release tag candidate.
- `ci` must be the URL for the passing CI run used as release evidence.
- The token records readiness evidence; it does not by itself authorize production deployment.

## Tag And Deploy Procedure

Only proceed when the pre-cut checks pass and the approval path is explicit.

1. Record release-readiness evidence in the issue:
   - Target branch or commit
   - CI evidence
   - QA sign-off status
   - Security/reliability sign-off status, when relevant
   - Deployment notes
   - Rollback notes
   - Known risks with owners
   - Recommendation: `ready`, `not ready`, `blocked`, or `needs review`
2. Request or confirm required approval:
   - EP go/no-go for customer-facing release.
   - Isaac approval for brand, pricing, legal, strategic, budget, or company-direction changes.
   - CTO approval for production authority or release-policy exceptions.
3. Cut the tag only after approval:
   - `git fetch origin`
   - `git checkout <approved-commit-or-branch>`
   - `git tag -a <vX.Y.Z> -m "Release <vX.Y.Z>"`
   - `git push origin <vX.Y.Z>`
4. Deploy only through the approved deployment owner/path.
5. Run the named smoke check.
6. Monitor for the named monitoring window.
7. Post closeout notes with final status and evidence links.

## Rollback Procedure

Prepare rollback notes before release.

1. Name the rollback owner.
2. Identify the last known good tag, commit, or deployment artifact.
3. Identify database, migration, environment, or data compatibility constraints.
4. Document the exact rollback command or owner-run procedure.
5. Define rollback smoke checks.
6. Define the communication path for rollback start, result, and follow-up.

If rollback authority is gated, mark the release task `blocked` or `in_review` with the approver and exact action. Do not proceed by assumption.

## Hold And Resume Procedure

Use hold when evidence is incomplete, CI is red, sign-off is absent, rollback notes are missing, or gated approval is unresolved.

Hold steps:

1. Stop the release cut/deploy path.
2. Update the issue with status `blocked` or `in_review`, using first-class blockers when another issue owns the unblock.
3. Name the owner and action required to resume.
4. Preserve the current workspace state and note any dirty files.

Resume steps:

1. Confirm the blocker or review path is resolved.
2. Re-run the smallest check that proves the stale evidence is fresh.
3. Re-post release-readiness evidence with the new CI/check URLs.
4. Continue from the earliest affected procedure step.
