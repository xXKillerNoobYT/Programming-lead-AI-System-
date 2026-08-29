# R5 Security/Reliability — Severity Model & Veto Operating Protocol

> Source of authority: WEI-572 (CTO needs a proper team) → WEI-576 (org-v1 proposal) → WEI-577 (R5 charter stream) → WEI-716 (this protocol; Founding-Steward acceptance recorded on WEI-572 parent thread, comment `9eb40fff` 2026-05-09).
> This doc is the published, mechanically-citable operating protocol for the R5 seat. It activates **Gate 4** of the org-v1 gate model defined in `docs/specs/org-v1-enforcement-points.md`.

## 1. Why R5 exists (and why it has a standing veto)

R2 (spec gate), R4 (QA gate), and R6 (release gate) each ask a different question (right change? hostile-safe? system healthy?). None of them is *security-trained on the threat model of this product*. A spec-correct, QA-passed, CI-green PR can still ship a credential leak, a privilege escalation, or a reliability regression that violates SOUL.md guardrails.

R5 is a **fourth, independent gate** with **standing veto authority on Sev≥2 findings**. It is not subordinated to R2/R4/R6 and does not subordinate them; the only override path is the CTO+CEO joint override in §5 below.

## 2. Severity model (Sev1 / Sev2 / Sev3)

R5 classifies every finding as exactly one severity. The classification is mechanical — no judgement-call ambiguity is allowed; if a finding plausibly fits two tiers, the higher tier wins.

### Sev1 — Critical (production-stop)
A finding that would, if shipped, cause **immediate user-visible harm or unrecoverable data loss**. Examples:
- Credential or secret material in a commit, build artifact, log line, or runtime response (`.env`, tokens, API keys, signed cookies).
- Unauthenticated remote code execution path; auth bypass that exposes another user's data.
- SQL/NoSQL injection, command injection, SSRF, path traversal in a code path reachable from the dashboard.
- Persistent destructive operation (drop table, force-push to canonical branch, mass delete) without an explicit user-confirmed gate.
- Loss of a SOUL.md immutable guardrail (e.g., bypassing the no-Docker rule, removing the user-approval requirement on `SOUL.md` edits).

**Veto effect**: PR is blocked, `release-gate:cut` token is revoked if already issued, R6 holds the release. Fix → re-review → fix-forward only. No `qa:waived`-style waiver path.

### Sev2 — High (must-fix-before-merge)
A finding that **degrades the security or reliability posture** of the system but does not cause immediate user harm if caught before merge. Examples:
- Authenticated injection or XSS where the attacker is already a session holder.
- Storage corruption risk affecting GitHub decision evidence, audit state, or project memory.
- Missing input validation at a system boundary that *could* escalate to a Sev1 with one more bug.
- New dependency with a known CVE rated High (CVSS ≥ 7.0).
- Heartbeat process that can deadlock, hot-loop, or burn the token-budget cap (WEI-576 §8) under adversarial input.
- Removal or weakening of a GitHub decision-evidence or approval invariant.

**Veto effect**: PR blocked until R5 clears it. Standing veto applies — R5 may block solo, no second signoff required.

### Sev3 — Medium (track-and-fix)
A finding that **should be fixed but does not block this PR**. Examples:
- Defense-in-depth gap (e.g., CSP missing a directive that no current finding needs).
- Dependency with a known Medium CVE (CVSS 4.0–6.9) for which no exploitable code path is reachable in this repo today.
- Test gap that would have caught a class of past Sev2 bugs.
- Logging/observability gap that slows incident response.

**Veto effect**: **No veto.** R5 files a child Issue against the owning specialist and labels it `priority:medium type:security`. PR may merge with the Sev3 noted in the run report.

### Below Sev3 — Note-only
R5 may comment, but no Issue is required and no gate token is touched.

## 3. Standing veto trigger conditions (Sev≥2)

R5 exercises veto by posting a PR review with `gh pr review --request-changes` whose body **must** contain the literal token:

```
sec-veto:hold sev=<1|2> finding=<short-id> evidence=<link>
```

Trigger conditions (any one is sufficient):

1. R5's own scan/review surfaces a finding classified Sev1 or Sev2 per §2.
2. R4 escalates a break-test result to R5 because the failure mode is security-flavored rather than functional (R4 may not classify Sev itself; that authority is R5's).
3. R6 forwards a security-flavored CI signal (dependency scanner, SAST, secret-scan) — until WEI-716 lands this was R6→CTO; with WEI-716 it becomes R6→R5.
4. CEO or CTO directly tags R5 on an issue with the `area:security` label.
5. A scheduled/periodic R5 sweep (post-merge audit) reclassifies an already-merged change as Sev≥2 — veto applies to *the next release tag*, not the merged PR (R6 holds the tag).

R5 does **not** veto on Sev3 or below. Misuse of the veto token on a Sev3 is itself a process bug (file Issue against R5).

## 4. Token-text enforcement (Phase 1, before SAST/CI bot)

The Reviewer specialist (`.paperclip/agents/reviewer/`) and R6's release-runbook script enforce these tokens mechanically — same shape as the other three gates per `docs/specs/org-v1-enforcement-points.md`:

| Surface | Required token (R5 path) |
|---|---|
| PR review body — clear | `sec-gate:approved sev=none scope=<files-or-"full-pr">` |
| PR review body — Sev3 note | `sec-gate:approved sev=3 finding=<short-id> followup=<issue#>` |
| PR review body — Sev1/2 hold | `sec-veto:hold sev=<1\|2> finding=<short-id> evidence=<link>` |
| Release tag message | `sec-gate:cleared tag=<vX.Y.Z> sev=none` (R5 must restamp at release time for any PR merged in the window) |

Absence of *either* `sec-gate:approved` or `sec-veto:hold` on a PR ≥ 2 hours old → Reviewer leaves a `request-changes` review citing this protocol. (Two-hour grace lets R5 be wakeOnDemand without blocking small spec-only PRs from idling.)

When the WEI-611 spec-gate bot or its security-scanner sibling lands, items above become CI checks; tokens are forward-compatible.

## 5. CTO + CEO override path (the only way past a Sev≥2 veto)

A live R5 veto cannot be cleared by R5 alone reversing position — that path exists, but it is just R5 re-reviewing. The escape hatch when R5 **stands by** the veto and the change must ship anyway is the **CTO + CEO joint override**.

Required evidence trail (all artifacts — missing any one → override is invalid and Reviewer rejects the PR):

1. **GitHub `Decision:` comment** authored by CTO on the governing Issue with:
   - The finding short-id and Sev classification R5 used.
   - The business reason the override is needed (cite an Issue or CEO directive).
   - The compensating control (what is being added to make the residual risk acceptable — e.g., feature flag default-off, monitoring alert, accelerated follow-up Issue).
   - Explicit text "**CTO+CEO override of R5 Sev≥2 veto**".
   - After posting, capture SHA-256 of the exact UTF-8 bytes returned in the GitHub API comment `body` plus the comment `updatedAt`.
2. **CEO co-sign**: a comment from the CEO/Founding-Steward seat reading "**override approved decision=<github-comment-url> sha256=<64hex> updated=<ISO-8601>**", binding approval to the exact CTO comment body/version. Reactions are insufficient.
3. **PR review token from CTO** (added in addition to R5's standing `sec-veto:hold`):
   ```
   sec-veto:override-cto+ceo decision=<github-comment-url> decision_sha256=<64hex> decision_updated=<ISO-8601> compensating=<follow-up-issue#>
   ```
4. **Follow-up Issue** opened the same heartbeat with `priority:high label:security label:override-followup` describing the residual risk and the date by which the compensating control retires the risk.

Reviewer fetches the CTO comment, verifies author/body/`updatedAt`, recomputes SHA-256, checks the CEO co-sign binds the same URL/hash/timestamp, and verifies the compensating Issue. Any later edit invalidates the override until CTO and CEO restamp it. R6 re-checks the same immutable evidence at release time.

**Never**: override on Sev1. Sev1 findings have no override path — fix-forward only. (If the user/CEO wants to override a Sev1, they may do so by directly modifying SOUL.md per §5 of CLAUDE.md, which itself requires a GH Issue + explicit user approval; this is an intentional speed-bump.)

**Repeated overrides** of R5 within a 30-day window — three or more — automatically file a Sev2 process bug against the org structure (mirrors the same rule in `org-v1-enforcement-points.md` §"Cross-gate escalation").

## 6. Integration into the active engineering workflow (WEI-577 hook points)

The protocol is wired into existing surfaces; nothing here is a new system to stand up. Each row is a concrete pointer the WEI-577 child stream will reference:

| Hook point | Change | Owner | Tracking Issue |
|---|---|---|---|
| `docs/specs/org-v1-enforcement-points.md` | Add a "Gate 4: Security gate" section mirroring §1–3 of that doc; remove R5 from the "What is **not** enforced" list. | CTO | this PR (WEI-716) |
| `.paperclip/agents/r5-security-reliability/AGENTS.md` | Seat profile created (this PR) — heartbeat:false, wakeOnDemand:true, budget per WEI-576 Model A. | CTO | this PR |
| `.paperclip/agents/reviewer/AGENTS.md` | Reviewer specialist learns to look for `sec-gate:approved` / `sec-veto:hold` / `sec-veto:override-cto+ceo` tokens alongside the existing three gate tokens. | Reviewer specialist owner | child Issue (R5-001) |
| `.paperclip/agents/r2-tech-lead-execution/AGENTS.md` line 55 | Already lists "Security veto (R5)" as out-of-scope — confirms R2 may not author or clear an R5 veto. No change needed. | — | — |
| `.paperclip/agents/r6-devops-release/AGENTS.md` line 54 | Replace "R5 — not yet activated; R6 forwards security-flavored CI failures to CTO" with "R5 active; R6 forwards security-flavored CI failures to R5." | R6 | child Issue (R5-002) |
| GitHub governing Issue | Future override invocations post the CTO decision, CEO co-sign, and compensating-control Issue required by §5. | CTO + CEO | continuous |
| `CLAUDE.md` §5 (autonomy guardrails) | No change — Sev1 fix-forward rule already implied by no-secrets / no-force-push items. | — | — |
| `reports/run-N-summary.md` | Per PR R5 reviews, append `R5: sev=<n> tokens=<list>` so every run report grep-able for security activity. | R5 | continuous |
| `dashboard/` | No code change in this PR; first R5 sweep is the wake-on-demand follow-up (R5-001). | R5 | child Issue R5-001 |

## 7. R5 first queued work (post-publication)

These are filed as child Issues of WEI-577 the same heartbeat this protocol is published:

- **R5-001** — Reviewer specialist token grammar update + first sweep of `feature/wei-633-agent-team-spec` for outstanding Sev≥2.
- **R5-002** — R6 release-runbook patch to forward security-flavored CI failures to R5 (replacing the CTO-forwarding stopgap).
- **R5-003** — Adversarial scenario template (R4-001 deliverable) reviewed by R5 for Sev coverage gaps.

## 8. Examples (mechanical, not exhaustive)

**Example A — Sev1 secret leak.**
PR introduces `dashboard/.env.local` containing `OPENAI_API_KEY=sk-…` committed by mistake.
R5 review body:
```
sec-veto:hold sev=1 finding=R5-secret-001 evidence=https://github.com/<org>/<repo>/pull/N/files#diff-<hash>
```
Outcome: blocked. PR author rotates the key and removes the file. Any exceptional history rewrite requires explicit owner approval recorded on the governing GitHub Issue. Sev1 has **no override path** — resolution is fix-forward.

**Example B — Sev2 dependency CVE.**
PR adds `pdfkit@^0.13` which has CVE-2024-XXXXX rated 7.4.
R5 review body:
```
sec-veto:hold sev=2 finding=R5-dep-014 evidence=https://nvd.nist.gov/vuln/detail/CVE-2024-XXXXX
```
Path A — author bumps to `pdfkit@^0.14` which patches → R5 re-reviews and posts `sec-gate:approved sev=none scope=full-pr`.
Path B — bump unavailable; CTO+CEO override per §5 with `compensating=<#issue-to-isolate-pdfkit-in-sandbox-by-2026-06-01>`.

**Example C — Sev3 defense-in-depth.**
Dashboard adds a new route without `Strict-Transport-Security`. No active exploit; HSTS is repo-wide-set elsewhere.
R5 review body:
```
sec-gate:approved sev=3 finding=R5-hsts-002 followup=<#issue>
```
No veto. PR merges. Issue tracks fix.

**Example D — Override on Sev2.**
Sev2 storage-race finding. CTO posts the required decision comment, captures `<sha256>` and `<updated-at>`, and obtains CEO comment: "**override approved decision=<decision-comment-url> sha256=<sha256> updated=<updated-at>**". CTO posts:
```
sec-veto:override-cto+ceo decision=<decision-comment-url> decision_sha256=<sha256> decision_updated=<updated-at> compensating=#N
```
Reviewer clears. R6 releases. Follow-up Issue #N is `priority:high override-followup`.

## 9. What this protocol does **not** cover

- **R7/R8 ownership rules** — still deferred (`org-v1-enforcement-points.md` §"What is not enforced").
- **Token-budget weekly cap** — CEO-side blocker per WEI-576 §8; not a security concern.
- **External pen-test scheduling** — out of Phase 1 scope; refile when WEI-572 Phase 2 opens.
- **Incident response runbook for *post-release* Sev1** — separate doc; tracked under the R5-002 stream.

## 10. How this doc evolves

- Token-grammar changes → PR with conventional commit `docs(r5): …`, GitHub Issue, and decision-comment permalink.
- New Sev examples added inline; no version bump needed.
- When WEI-611 spec-gate bot or its R5 sibling lands → mark §4 token-text checks as bot-checked.
- When R5 graduates from wake-on-demand to heartbeat-enabled → add a §"R5 heartbeat cadence" with the same shape as the R6 release cadence.

## 11. Provenance

- WEI-572 — parent ("the CTO needs a proper team").
- WEI-576 — org-v1 proposal + acceptance interaction `579d4c3d`; charter for R5 in comment `9e1d0941` §"Charter — R5 Security/Reliability" (DP-2, Founding-Steward gated).
- WEI-577 — R5 child stream (this protocol publishes its operating contract).
- WEI-715 — Phase 1 activation of R2/R4/R6 (this protocol extends to Gate 4).
- WEI-716 — CEO kickoff comment `9eb40fff` 2026-05-09 (Founding-Steward acceptance of approved scope).
- Authored: 2026-05-09 by CTO (`agent 328fddb9-26b4-4475-9ed3-6265d23e7816`) under Paperclip wake on WEI-716.
