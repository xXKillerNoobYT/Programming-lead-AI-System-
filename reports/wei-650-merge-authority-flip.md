# WEI-650 Merge Authority Flip

Date: 2026-05-17
Decision ID: D-20260517-003
Paperclip run: 5350f450-ab17-414c-941a-f7b56e16b64e

## Completed

- Confirmed WEI-650 blockers are resolved: WEI-649 and WEI-1251 are both `done` in Paperclip heartbeat context.
- Updated the canonical executor-layer spec so DevLead/CTO-as-DevLead is the post-trial merge authority for specialist-authored PRs.
- Updated the DevLead agent bundle with an explicit merge checklist.
- Updated CLAUDE.md, README.md, and architecture.md so they no longer describe Claude Code as the routine specialist-PR merge authority after the trial.
- Verified there are no currently open GitHub PRs available to serve as the first autonomous merge proof: `gh pr list --state open --limit 20` returned `[]`.

## Active Merge Rule

DevLead may merge a specialist-authored PR without a human in the loop only when Reviewer approved it, CI is green, coverage evidence is present, security is clear, all required R2/R4/R5/R6 gate tokens are valid, and the PR/Decision/run evidence is recorded.

## Remaining Acceptance Proof

WEI-650 cannot honestly close until a specialist-authored PR exists and DevLead merges it under the rule above. The next action is [WEI-1287](/WEI/issues/WEI-1287), assigned to Coder-Backend, to open a low-risk qualifying PR. Reviewer and gate owners then supply the required approvals so DevLead can perform the first autonomous merge.
