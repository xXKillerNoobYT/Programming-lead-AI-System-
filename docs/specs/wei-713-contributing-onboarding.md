# WEI-713 Spec: CONTRIBUTING Onboarding (First 10 Minutes)

Date: 2026-05-10
Owner: Reviewer Specialist
Issue: WEI-713

## SPEC

**Goal:** Add a contributor onboarding guide that gets a new developer from clone to a running dashboard and heartbeat in 10 minutes using the repo's local-first Node workflow.

**Acceptance criteria:**
1. [manual] A root-level `CONTRIBUTING.md` exists and includes a "First 10 Minutes" section with exact setup commands for dependencies and running the dashboard + heartbeat.
2. [manual] The guide includes required environment variables (`PLANS_VAULT_PATH`, `MEMPALACE_PALACE_PATH`) with PowerShell examples, plus a verification checklist.
3. [manual] The guide links back to canonical docs (`README.md`, `CLAUDE.md`) and states contribution boundaries (small scoped changes, tests/evidence expectations).

**Non-goals:** Full architecture deep dive, CI policy rewrite, and org/process policy expansion beyond onboarding + first contribution flow.

**Open questions:**
- None for slice 1. If board wants Linux/macOS-first examples ahead of PowerShell, owner:@CEO unblock action: confirm preferred platform priority.

**Evidence plan:**
- `rg -n "First 10 Minutes|PLANS_VAULT_PATH|MEMPALACE_PALACE_PATH|README.md|CLAUDE.md" CONTRIBUTING.md`
- `Test-Path CONTRIBUTING.md`
- Include command outputs and AC mapping in WEI-713 comment.

**Rollback plan:**
- Rollback is a single-file revert (`CONTRIBUTING.md`) plus optional removal of this spec doc if direction changes. No runtime code paths are modified.

**Size:** S

## Chaos Coding Depth (Sections 3 and 5)

- Failure mode: onboarding doc drifts from runnable commands.
  - Mitigation: keep commands aligned with current `README.md` quick-start and note Node 20+ requirement.
- Failure mode: missing env vars cause hidden startup failures.
  - Mitigation: explicit variable exports and quick verification checklist.
- Failure mode: contributors make broad unsafe edits on first task.
  - Mitigation: "first contribution boundaries" section requiring small scope and evidence.

## Implementation Slice 1

- Create `CONTRIBUTING.md` with:
  - Prerequisites and env setup.
  - "First 10 Minutes" command sequence.
  - First contribution path with verification expectations.
  - Links to canonical docs for deeper context.

