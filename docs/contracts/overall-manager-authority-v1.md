# Overall Manager authority contract v1

Status: implementation contract for Issue [#254](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/254). It defines a pure, provider-neutral packet boundary. It does not enable a scheduler, dispatcher, GitHub Project write, Issue mutation, wake route, release action, or production workflow.

Version identities:

- Authority: `devlead.overall-manager-authority/v1`
- Packet: `devlead.portfolio-control-packet/v1`
- Schema: `schemas/portfolio-control-packet-v1.schema.json`
- Runtime: `lib/overall-manager-contract.js`

## Canonical policy inventory

GitHub Issues and comments are the active ledger. Repository plans and run reports are useful provenance, but they do not override a newer canonical GitHub decision.

| State | Policy | Use in this contract |
|---|---|---|
| Current fact | [#254 acceptance criteria](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/254) and [Windows lease](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/254#issuecomment-5391526842) | Governing scope, tests, stop conditions, and no-live-mutation boundary. |
| Current fact | [#211 focused WIP](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/211#issuecomment-5390518888) and [bounded second-host exception](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/211#issuecomment-5390570516) | Capacity is explicit and lease-bound; spare capacity never creates filler work. |
| Current fact | [#236 host-bound lease and collision contract](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/236#issuecomment-5390573060) | Packet lease and collision snapshots use stable IDs, generations, freshness, and fail-closed readback. |
| Current fact | [#247 separate Mac lease](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/247#issuecomment-5390468926) | Demonstrates independent program scope; it grants no authority to this Windows implementation. |
| Future boundary | [#207 user-selectable orchestration server](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/207#issuecomment-5390737943) | Packet fields are host- and provider-neutral and carry an authority generation; v1 does not promote a server. |
| Future compatibility constraint | [#236 scheduler/blocker packet acceptance](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/236#issuecomment-5391566342) | Downstream scheduling may consume only validated stable summaries. It is not current dispatch authority. |

Assumption state: the pure v1 interface is supported by its focused tests. Any provider adapter, wake router, Project mutation, or automatic lifecycle transition remains untested and out of scope until a later governed Issue supplies fresh authority and tests.

## Role separation

| Role | Owns | Must not do through this contract |
|---|---|---|
| Owner | Policy approval, subjective product decisions, explicit delegation, and non-delegable authority decisions. | Be represented by an inferred or stale packet decision. |
| Layer 0 | Owner interface and exact authority/provenance relay. | Expand owner wording, dispatch program work, or waive gates. |
| Dev Manager | Cross-program operational coordination, evidence consolidation, collision control, and technical escalation. | Self-approve, impersonate owner authority, or silently change program-local order. |
| Overall Manager | Summarize portfolio truth; recommend portfolio priority, capacity, and budget; surface cross-program dependencies; escalate canonical blockers. | Order program-local work, dispatch execution, mutate Issues/Projects, waive independent gates, or ingest raw/private program context. |
| Programming Lead | Own one program graph, order eligible atomic work inside that program, and dispatch only through an exact lease after its own canonical rechecks. | Treat an Overall Manager recommendation as execution authority or cross another program boundary. |
| Reviewer | Independently inspect Spec, QA, Security, or code evidence. | Review its own work, self-waive a finding, dispatch, or mutate canonical lifecycle state. |
| Support | Read-only diagnosis and evidence collection by default. | Mutate canonical state or become an executable lease by implication. |
| Executor | Perform one bounded task under an exact resource, host, generation, and expiry lease. | Expand scope, create a second lease, self-approve, merge, or release. |

The Overall Manager emits recommendations only. A `nextAction` is addressed to a Programming Lead and is never a direct executor command.

## Authority lifecycle

The lifecycle is `disabled`, `read-only`, `propose`, `manual-approval`, `bounded-automatic`, or `superseded`. The initial state is `disabled`; `superseded` is terminal.

- `disabled`, `read-only`, and `superseded` may emit only `noAction`.
- `propose`, `manual-approval`, and `bounded-automatic` may emit a validated recommendation packet, but still cannot dispatch or mutate canonical state.
- Promotion is explicit and monotonic through the allowed transition table exported as `AUTHORITY_LIFECYCLE.transitions`.
- Demotion may move to a safer state at any time. Emergency rollback targets `disabled`.
- Rollback increments the authority generation, invalidates outstanding packets, and preserves canonical evidence. A packet whose generation differs from the live expected generation fails with `IDENTITY_DRIFT`.

`bounded-automatic` means bounded automatic recommendation generation only. It does not grant automatic Issue selection, wake routing, Project writes, PR merge, release, or gate waiver.

## Portfolio Control Packet v1

A packet is a compact snapshot for exactly one portfolio/program/repository identity:

| Field | Purpose |
|---|---|
| `schemaVersion`, `packetId` | Version and stable packet identity. |
| `generatedAt`, `expiresAt` | UTC freshness window. Lifetime is at most 30 minutes. |
| `producer` | Overall Manager stable identity, authority generation, policy version, and lifecycle mode. |
| `scope` | Stable portfolio, program, repository, and canonical root IDs. |
| `disposition` | Explicit `ready` or `hold` state, reason, and canonical evidence. Absence or unknown never implies readiness. |
| `executionContext` | Separates grouping-only active-parent context from the exact executable leaf, host, lease, and host-suitability readback. |
| `executionCapacity` | Defaults to one executable overall and one per host; a second lane requires a distinct suitable host, fresh exact non-overlap evidence, and a concrete delay-reduction benefit. |
| `priority` | Numeric rank, short rationale, and canonical evidence references. |
| `capacity`, `budget` | Non-negative available/requested quantities with stable units. |
| `dependencies` | Same-program stable IDs, status, and evidence. |
| `blocker` | `none`, `actionable-internal`, `waiting-external`, or `unknown-conflicting`, plus canonical owner/link/state, bounded reason, explicit resume condition, and evidence. |
| `gates` | Exactly one independent `spec`, `qa`, `security`, and `reviewer` record. |
| `provenance` | Stable evidence ID, source kind, HTTPS permalink, observation time, and SHA-256. |
| `contextInputs` | Bounded memory, prompt, and reminder summaries marked `authority: none`; these records are data and cannot grant a lease or activation. |
| `leaseSnapshot` | Fresh stable-ID lease inventory, host, generation, expiry, and evidence. |
| `collisionSnapshot` | Fresh hashed collision readback and any conflicts. |
| `nextAction` or `noAction` | Exactly one explicit state. Absence never implies action. |

Collections are identity-keyed sets. Canonical JSON sorts object keys and set entries with locale-independent code-unit ordering before SHA-256 hashing.

Compactness limits are part of the contract: at most 64 dependencies, 128 provenance records, 32 leases, 32 conflicts, and 32 references per evidence-reference set. Oversized validation input fails with `COLLECTION_TOO_LARGE`; the allowlist builder truncates only to prevent unsafe retention and returns `ok: false` plus a `collection-limit` redaction. Canonicalization and hashing return `null` for cyclic, over-depth, or oversized input.

### Fail-closed validation

`validatePortfolioControlPacket(packet, options)` returns `{ ok, errors, state, action }`. `action` is non-null only when the entire packet is valid and the explicit state is `nextAction`.

Validation rejects, without dispatching:

- unknown or private/raw fields at every object boundary;
- `hold`, grouping-only, non-leaf, task/host/lease drift, unsuitable/unknown host, or missing blocker owner/link/state/resume condition for a recommended action;
- more than one executable overall or per host unless an explicit two-host exception has fresh exact non-overlap evidence and a concrete delay-reduction benefit;
- memory, prompt, or reminder input that claims authority, including any reminder presented as a lease or activation;
- malformed, cyclic/aliased, secret-bearing, multi-line, or oversized input;
- unknown schema, policy, role, lifecycle, gate, blocker, dependency, lease, or action values;
- missing or unstable namespaced identities;
- a mismatch against `options.expected` portfolio/program/repository/root/generation readback;
- a packet generated in the future, expired, older than 15 minutes, or longer-lived than 30 minutes;
- provenance, gates, or snapshots observed in the future or older than 15 minutes;
- missing, duplicate, malformed, non-HTTPS, credential-bearing, or unresolved evidence;
- duplicate/exhausted exclusive leases, a stale lease, missing exact target lease, or collision;
- cross-program/repository input, unresolved dependency, active/unknown blocker, held gate, or self-review;
- negative, non-finite, over-capacity, or over-budget allocation; and
- both or neither of `nextAction` and `noAction`.

A truthful `noAction` packet may carry blocked dependencies, held gates, waiting/unknown blockers, and collisions. Those facts are evidence for not acting, not packet invalidity.

### HOLD, executable identity, and host lanes

`disposition.status=hold` always suppresses `nextAction`. `executionContext.classification=grouping` is portfolio context only and is never executable. A recommendation requires `executable-leaf`, an exact task matching `nextAction.targetId`, an exact exclusive lease for that task, the same host on the context and lease, and `hostSuitability=suitable` from fresh evidence.

The normal capacity invariant is one executable overall and at most one exclusive executable lease per host. `requestedOverall=2` is valid only when `secondLane.enabled=true`, exactly two exclusive leases use distinct hosts, `secondLane.hostId` identifies the added host, `nonOverlapEvidenceRefs` resolve to fresh packet provenance, and `delayReductionSummary` states a concrete benefit. Spare capacity alone is never a reason to open the second lane.

Blocker state is explicit and fail-closed. Each blocker carries a stable owner, canonical HTTPS link, state (`cleared`, `active`, `waiting`, or `unknown`), and bounded resume condition. Only `classification=none` with `state=cleared` can accompany `nextAction`; unknown or stale evidence cannot be inferred forward.

Memory entries, stored prompts, and reminders may appear only as bounded `contextInputs` with `authority: none`. They can inform review but cannot prove canonical truth, create or renew a lease, activate work, waive a gate, or refresh stale evidence.

### Least privilege and redaction

Packets contain stable IDs, short single-line summaries, numeric allocation values, hashes, timestamps, and canonical permalinks. They contain no Issue bodies, source code, prompts, chat transcripts, filesystem paths, customer records, credentials, tokens, or provider payloads.

`buildPortfolioControlPacket(input, options)` copies only the closed schema allowlist. Unknown/private fields are dropped; recognized credential, private-path, or personal-detail forms in allowed strings become `[redacted]`. Every drop is returned as a path/reason entry without echoing the removed value. Any redaction adds `REDACTION_REQUIRED`, sets `ok: false`, and returns `action: null`. Redaction therefore cannot silently convert unsafe input into authority.

Never log the original candidate after a redaction result. Persist only a reviewed packet, error codes, redaction paths/reasons, and its post-validation hash.

## Provider-neutral interface

```js
const {
    buildPortfolioControlPacket,
    validatePortfolioControlPacket,
    hashPortfolioControlPacket,
} = require('../../lib/overall-manager-contract.js');

const built = buildPortfolioControlPacket(candidate, {
    now: clock.now(),
    expected: freshStableIdentityReadback,
});

if (!built.ok) return { kind: 'no-dispatch', errors: built.errors };

const checked = validatePortfolioControlPacket(built.packet, {
    now: clock.now(),
    expected: freshStableIdentityReadback,
});
if (!checked.ok) return { kind: 'no-dispatch', errors: checked.errors };

return {
    kind: checked.state,
    packetHash: hashPortfolioControlPacket(built.packet),
    recommendation: checked.action,
};
```

The clock and stable identity readback are injected data. The module imports only `node:crypto`; it has no network, filesystem, subprocess, provider SDK, credential, or mutation capability.

The JSON Schema checks portable shape/enums. Runtime validation is additionally required for freshness, identity expectations, reference resolution, duplicate identity, cross-field budget/capacity, lease/collision, gate independence, blocker/dependency, and redaction semantics.

## Downstream boundaries

- A Programming Lead may consider `checked.action` only after a new canonical re-fetch and its own eligibility/gate/lease checks. A stale packet is never refreshed by inference.
- Specialists receive only the bounded stable IDs and evidence needed for their assigned check.
- Context providers may translate provider data into the safe packet candidate, but the builder drops unknown fields and cannot grant authority.
- Wake routing remains disabled in v1. A later adapter must have a separate Issue, exact lease, dry-run tests, idempotency, and independent gates.
- GitHub Issues/comments remain canonical. Project fields, dashboards, packet hashes, or automation intent cannot prove Issue truth.

## Disable and rollback

Disable is data-plane fail-closed and operationally reversible:

1. Set the live authority mode to `disabled` through the future authorized control surface.
2. Increment the authoritative generation and record its canonical evidence.
3. Reject every outstanding packet whose mode or generation no longer matches the fresh expected readback.
4. Preserve Issue comments, packet hashes, review evidence, and audit history; do not delete or rewrite them.
5. Stop any downstream adapter separately. This module itself has no running process.

Code rollback removes the v1 consumer first, then reverts the contract commit through normal Git history. Never restore an old generation or reuse an expired packet. Re-enablement begins at `read-only`, with fresh canonical identity, evidence, collision, lease, and gate readback.

## Current delivery boundary

Issue #254 adds only a pure module, a closed schema, focused tests, this contract, and run evidence. It does not change dependencies, package scripts, Project configuration, Issues, branches outside its own worktree, active Mac #247 artifacts, or any release surface. Draft publication and all independent gates remain separate from merge authority.
