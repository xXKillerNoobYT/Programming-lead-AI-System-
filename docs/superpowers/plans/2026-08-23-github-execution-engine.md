# GitHub Execution Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only, fail-closed GitHub execution engine that selects one eligible atomic R1 Issue and emits a deterministic execution packet with append-only local evidence.

**Architecture:** Pure selection and packet logic consumes a normalized snapshot. A guarded `gh` adapter supplies live data, a focused writer records JSONL evidence, and a thin CLI composes them without changing `heartbeat.js` or mutating GitHub.

**Tech Stack:** Node.js 18+, CommonJS, `node:test`, GitHub CLI, existing `lib/guardrails.js`.

**Spec:** `docs/superpowers/specs/2026-08-23-github-execution-engine-design.md`

## Global Constraints

- GitHub Issues/comments are the sole active ledger.
- Native parent/sub-issue and blocked-by relationships are authoritative.
- This increment is preview-only: no GitHub mutation, agent dispatch, design mutation, merge, or release.
- Only R1 descendants are eligible; R2-R4 remain blocked.
- Fail closed on partial, malformed, ambiguous, or contradictory state.
- No Docker or new package dependency.
- Use TDD and preserve the 172-test root baseline.

---

### Task 1: Pure eligibility and packet engine

**Files:**
- Create: `lib/issue-execution-engine.js`
- Create: `tests/issue-execution-engine.test.js`

**Interfaces:**
- Produces: `validateSnapshot(snapshot, policy)`, `evaluateCandidates(snapshot, policy)`, `createExecutionDecision(snapshot, policy, clock)`, `canonicalJson(value)`, and `POLICY_VERSION`.
- Snapshot and packet shapes are exact copies of the design specification.

- [ ] Write failing tests with hand-built normalized snapshots for ready selection; exclusion of parents, epics, active, blocked, failed-gate, malformed, and R2 work; dependency closure; deterministic ordering; no-action; cycles/duplicates; and stable hashes.
- [ ] Run `node --test tests/issue-execution-engine.test.js` and confirm failures are caused by the missing module or behavior.
- [ ] Implement heading parsing, structural validation, ancestry resolution, dependency reconciliation, exclusion explanations, priority ordering, canonical JSON, SHA-256 hashing, packet creation, and no-action creation.
- [ ] Re-run the focused test until every behavior passes, then run `npm test` and confirm the pre-existing suite remains green.
- [ ] Commit with `feat(execution): add deterministic R1 leaf selection (#236)`.

### Task 2: Guarded live GitHub Issue source

**Files:**
- Create: `lib/github-issue-source.js`
- Create: `tests/github-issue-source.test.js`

**Interfaces:**
- Consumes: `safeSpawn` from `lib/guardrails.js`.
- Produces: `resolveRepository(options)`, `fetchIssueSnapshot(options)`, `normalizeIssue(raw)`, and `parseIssueNumberFromUrl(url)`.
- `fetchIssueSnapshot({ repository, now, _spawnImpl })` returns the normalized snapshot consumed by Task 1.

- [ ] Write failing tests using complete REST-shaped paginated Issue fixtures and dependency responses. Cover repository resolution, parent/child normalization, pagination flattening, PR filtering, native blocked-by retrieval, count mismatches, API errors, invalid JSON, and non-zero exit.
- [ ] Run `node --test tests/github-issue-source.test.js` and verify the expected RED failures.
- [ ] Implement array-argument `gh` calls through `safeSpawn`, strict response parsing, normalization, relationship construction, and fail-closed count validation.
- [ ] Run the focused test and then `npm test`; retain pristine output apart from existing deliberate diagnostic lines.
- [ ] Commit with `feat(execution): read native GitHub issue state (#236)`.

### Task 3: Append-only evidence and CLI preview

**Files:**
- Create: `lib/execution-evidence.js`
- Create: `scripts/execute-next-issue.js`
- Create: `tests/execution-evidence.test.js`
- Create: `tests/execute-next-issue.test.js`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `fetchIssueSnapshot` and `createExecutionDecision`.
- Produces: `appendExecutionEvidence(filePath, decision, clock)` and CLI `npm run execute:next -- --repo owner/repository [--root 210] [--horizon 211] [--evidence path]`.
- CLI exits 0 for packet/no-action and 1 for argument, source, validation, or evidence failures.

- [ ] Write failing evidence tests for one-line JSON append, directory creation, invalid path, and serialization failure.
- [ ] Write failing CLI tests for explicit arguments, repository resolution, packet/no-action stdout, one evidence append, no mutation calls, and structured failure stderr/exit 1.
- [ ] Run both focused files and verify expected RED failures.
- [ ] Implement the evidence writer and dependency-injected CLI `main(args, deps)`; keep the executable entrypoint thin and reject unknown or mutating flags.
- [ ] Add `execute:next` to root scripts and ignore only `.devlead/runtime/`.
- [ ] Run focused tests and `npm test`.
- [ ] Commit with `feat(execution): add safe preview CLI and evidence (#236)`.

### Task 4: Operator documentation and live verification

**Files:**
- Modify: `README.md`
- Create: `reports/run-244-summary.md`

**Interfaces:**
- Documents the preview command, JSON result kinds, exit semantics, evidence path, R1-only boundary, and explicit non-goals.

- [ ] Add a concise README section showing `npm run execute:next -- --repo xXKillerNoobYT/Programming-lead-AI-System-` and explaining that the command reads GitHub but does not claim or dispatch work.
- [ ] Run the focused tests and full `npm test` fresh.
- [ ] Run a live preview with `--evidence` pointing to a temporary file; verify the result is either one valid R1 packet or a reasoned no-action decision and verify no Issue timestamps or labels changed.
- [ ] Write Run 244 with the governing Issue, changed files, RED/GREEN evidence, full verification, live snapshot outcome, known npm-audit baseline tracked by #227, risks, rollback, and required independent gates.
- [ ] Run `git diff --check` and `git status --short`, ensuring no generated runtime evidence is staged.
- [ ] Commit with `docs(execution): document GitHub preview workflow (#236)`.

### Task 5: Independent review and publication

**Files:**
- Modify only files required by validated review findings.

**Interfaces:**
- Produces the review package, review findings/fixes, GitHub evidence comment, pushed branch, and draft PR for #236.

- [ ] Generate a whole-branch review package from the main merge base through HEAD.
- [ ] Obtain independent architecture/spec, code-quality, QA, and security review; fix valid findings test-first and re-review the fix range.
- [ ] Run `npm test`, all focused tests, `git diff --check`, and one final live read-only preview.
- [ ] Comment on #236 and #234 with commit, commands/results, packet/no-action outcome, review evidence, risks, and rollback.
- [ ] Push `codex/issue-236-execution-engine` without force and open a draft PR against the verified base branch. Include Issue #236, Run 244, verification, risks, rollback, dependency relationship, and unresolved gates.
- [ ] Do not merge or mark ready; independent gates and owner policy remain authoritative.
