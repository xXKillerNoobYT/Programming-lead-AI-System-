# GitHub Execution Engine Design

**Status:** Approved for Issue #236 implementation

**Governing Issues:** #210 -> #211 -> #221 -> #234 -> #236

## Purpose

Deliver the first safe product-heartbeat execution primitive: observe the live GitHub Issue graph, identify one dependency-ready atomic R1 leaf, emit a deterministic execution packet, and record the decision as supporting evidence. GitHub Issues and comments remain the sole active work ledger.

This increment does not dispatch an agent, claim an Issue, mutate an approved design, merge code, or start R2. A surrounding app workflow may later consume the packet after the role, context, collision, and dispatch contracts receive their own approvals.

## Authority and constraints

- The user-provided DevLead hierarchical roadmap is the product specification.
- Native GitHub parent/sub-issue links define hierarchy; body text is descriptive, not a substitute.
- Native GitHub blocked-by links define dependencies. Explicit `Depends on:` or `Blocked by:` body declarations are additive and must agree with native data.
- At most six open children may exist under any parent.
- A candidate must be one execution session, one worktree, and one PR.
- R2 #212 and its descendants remain ineligible until #211 records and closes the R1 phase-entry gate.
- `status:needs-user`, `status:in-progress`, blocked work, failed gates, parents, epics, and malformed leaves are never selectable.
- Spec, QA, Security, Reviewer, Release, human-test, and beta gates cannot self-waive.
- Local Node.js and self-hosted operation come first. No Docker dependency is introduced.
- Preview is the only mode in this increment. GitHub mutation and agent dispatch are explicit non-goals.

## Architecture

The implementation is split into four focused units:

1. `lib/issue-execution-engine.js` is pure domain logic. It validates normalized snapshots, resolves ancestry and dependencies, explains exclusions, selects deterministically, and creates a versioned packet or no-action decision.
2. `lib/github-issue-source.js` is the replaceable GitHub boundary. It invokes `gh` through the existing safe spawn guard, retrieves paginated Issue data plus native blocked-by lists, and normalizes the response.
3. `lib/execution-evidence.js` appends one JSONL decision record. It refuses invalid paths or unserializable records and never pretends a write succeeded.
4. `scripts/execute-next-issue.js` is a thin CLI. It parses explicit policy options, gathers a live snapshot, calls the pure engine, writes evidence, and prints the decision JSON.

`heartbeat.js` is intentionally unchanged. The new CLI proves the selection contract independently before a later leaf integrates it with preflight and rotating routines.

## Data contracts

### Normalized snapshot

```js
{
  schemaVersion: 1,
  repository: "owner/repository",
  observedAt: "ISO-8601",
  issues: [{
    number: 236,
    title: "...",
    url: "https://github.com/.../issues/236",
    state: "OPEN",
    body: "...",
    labels: ["type:task", "status:backlog", "priority:urgent"],
    createdAt: "ISO-8601",
    updatedAt: "ISO-8601",
    parentNumber: 234,
    childNumbers: [],
    blockedByNumbers: []
  }]
}
```

Numbers must be unique positive integers. Parent, child, and dependency references must resolve inside the snapshot. Parent and child relationships must agree in both directions. Cycles, duplicate IDs, missing references, count mismatches, or contradictory dependency declarations invalidate the snapshot or candidate and fail closed.

### Required leaf sections

A candidate body must include headings equivalent to:

- `Goal` or `Objective`
- `Dependencies` or `Preconditions`
- `Acceptance criteria`
- `Verification and gates`, `Gates`, or `Gates and stop conditions`
- `Completion evidence` or `Evidence and handoff`

The engine extracts the first paragraph of Goal/Objective, acceptance checklist items, dependency references, gate checklist/bullets, and evidence checklist/bullets. Empty required sections make that Issue ineligible with an explicit reason.

### Selection policy

The policy is versioned as `r1-preview-v1`:

1. Validate the full snapshot and configured root/horizon Issues.
2. Consider only descendants of the allowed horizon #211 and reject descendants of #212, #213, or #214.
3. Require open state, zero children, non-epic type, and exactly one ready status (`status:backlog`).
4. Reject `status:in-progress`, `status:needs-user`, `status:blocked`, `status:done`, or labels matching `gate:*:failed`, `gate:failed`, or `security:veto`.
5. Require every native and declared dependency to be closed.
6. Require all body sections above.
7. Sort remaining candidates by priority (`urgent`, `high`, `medium`, `low`, then unspecified), ascending creation time, then ascending Issue number.
8. Select exactly one. If none remain, emit a no-action decision containing exclusion reasons by Issue.

### Execution packet

```js
{
  schemaVersion: 1,
  policyVersion: "r1-preview-v1",
  kind: "execution-packet",
  mode: "preview",
  packetHash: "sha256:<hex>",
  generatedAt: "ISO-8601",
  source: { repository, observedAt, rootIssueNumber: 210, horizonIssueNumber: 211 },
  issue: { number, title, url, labels, createdAt, updatedAt },
  hierarchy: [{ number, title, url }],
  goal: "...",
  constraints: ["..."],
  acceptanceCriteria: ["..."],
  dependencies: [{ number, title, url, state }],
  requiredGates: ["..."],
  evidenceRequirements: ["..."]
}
```

The hash covers canonical packet content but excludes `generatedAt` and `source.observedAt`, so unchanged Issue state produces the same hash across runs. Object keys are sorted recursively; array order remains meaningful.

## GitHub adapter behavior

- Require `owner/repository` explicitly or resolve it with `gh repo view`.
- Retrieve all Issues using the REST Issues endpoint with `--paginate --slurp`; filter pull requests.
- Build child lists from each Issue's native `parent_issue_url` and verify `sub_issues_summary.total` agrees.
- Retrieve `/dependencies/blocked_by` when `issue_dependencies_summary.total_blocked_by` is non-zero and verify the returned count.
- Normalize labels and state casing.
- Invoke only the `gh` executable through `safeSpawn` with array arguments and an allowlist. No shell strings are used.
- Treat a non-zero exit, invalid JSON, API error object, partial page, or malformed field as a source failure. The CLI records no selection packet from stale or partial data.

## Evidence and errors

Each successful run appends exactly one JSON object to the configured JSONL evidence file:

- packet decision: timestamp, repository, packet hash, selected Issue number, and complete packet;
- no-action decision: timestamp, repository, policy, and deterministic exclusion summary.

The default evidence path is `.devlead/runtime/execution-evidence.jsonl`, which is ignored by Git because it is machine-local supporting evidence. The CLI exits 0 for packet and no-action decisions, and exits 1 for source, validation, argument, or evidence-write failure. Error JSON goes to stderr; no success-shaped output is printed on failure.

## Testing and acceptance

Tests use Node's built-in `node:test` and real pure functions. External `gh` execution is replaced only at the spawn boundary with complete REST-shaped fixtures.

Required scenarios:

- ready R1 leaf selected;
- parent, epic, active, needs-user, blocked, failed-gate, and future-horizon Issues excluded;
- native and declared dependencies enforced;
- malformed fields, duplicate IDs, cycles, mismatched parent links, and count mismatches fail closed;
- deterministic priority/time/number ordering;
- stable packet hash across run timestamps and changed hash when Issue content changes;
- no candidate emits no-action evidence;
- paginated GitHub data and dependency calls normalize correctly;
- non-zero `gh`, invalid JSON, and failed evidence append produce exit 1;
- live read-only preview against the repository makes no GitHub mutation.

Completion requires focused tests, the full root suite, a clean live preview or an honest no-action result, and independent Spec, QA, Security, and Reviewer review evidence on GitHub.
