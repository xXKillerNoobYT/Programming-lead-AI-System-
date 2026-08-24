# Run 249 — Publish approved v0.2.2 desktop design authority evidence

**Issue:** [#245](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/245)
**Parent:** [#225](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/225) under [#218](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/218)
**Branch:** `codex/issue-245-desktop-design-authority`
**Base:** `origin/main` at `585032f248162965d392ebf58475045c2f276e84`
**Artifact commit:** `6814473e023fa76faf32e9dd2ec3897b27d329e2`

## Outcome

The exact owner-approved desktop artifact is preserved without a byte change at:

- [commit-pinned artifact](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/blob/6814473e023fa76faf32e9dd2ec3897b27d329e2/reports/design-authority/desktop/consolidated-candidate-v0.2.2/index.html)
- [commit-pinned manifest](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/blob/6814473e023fa76faf32e9dd2ec3897b27d329e2/reports/design-authority/desktop/consolidated-candidate-v0.2.2/manifest.json)
- content-addressed Git blob `92d2cb6f478aa649e736b8fe8a7bb5b944cfb5cf`

The manifest binds the version, byte size, SHA-256, approval permalinks, timestamps, desktop-only scope, runtime disclosure, append-only history rule, rollback relationship, and fail-closed downstream consumption rules. The local source path is not repeated in the public repository; it remains recorded on the governing Issue.

No new legacy Decision ID was created. The current roadmap makes GitHub Issues and immutable comments the active decision ledger.

## Exact identity and provenance

| Field | Evidence |
| --- | --- |
| Version | `consolidated-candidate-v0.2.2` |
| Source bytes before copy | `79,369` |
| Source SHA-256 before copy | `544A6D22EA43EBA0F3D379D4E125353D2907D1FCC3B8C39116B8A0A66901AFFE` |
| Published bytes after copy | `79,369` |
| Published SHA-256 after copy | `544A6D22EA43EBA0F3D379D4E125353D2907D1FCC3B8C39116B8A0A66901AFFE` |
| Committed Git blob | `92d2cb6f478aa649e736b8fe8a7bb5b944cfb5cf`, `79,369` bytes |
| Source last modified | `2026-08-24T00:10:53.9591679Z` |
| Desktop approval | [#218 comment 5389372090](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/218#issuecomment-5389372090), `2026-08-24T00:27:29Z` |
| Gate reconciliation | [#225 comment 5389372359](https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/225#issuecomment-5389372359), `2026-08-24T00:27:32Z` |

The immutable HTML still contains its original candidate labels because those bytes predate owner approval. The external approval comments grant authority only to this exact hash and desktop scope; changing those labels in the HTML would create a different, unapproved artifact.

## Scope and containment

Approved:

- desktop design and interaction authority for the exact hash-bound scope in the approval comment;
- downstream desktop implementation planning and fidelity work that pins both version and SHA-256.

Not approved or claimed:

- mobile design authority;
- accessibility conformance;
- production implementation or acceptance;
- completion of #224 or #225;
- merge, release, or R2 phase-entry approval.

The file is a self-contained HTML document with inline CSS, SVG, and JavaScript. The privacy/provenance scan found no credentials, emails, private paths, external URLs, external loaders, network APIs, forms, or source maps. Interactive viewing can write the local browser key `devlead-v022-layout`; no transmission path was detected.

## Line-ending and immutability control

The checkout has `core.autocrlf=true`. A path-specific `.gitattributes` rule marks only this approved HTML as `-text`, preventing Git from normalizing its bytes. The regression exercises `git check-attr` rather than merely inspecting the attributes file. The staged and committed blob ID, size, and SHA-256 match the approved source.

Future approved artifacts must be added under a new version directory. This v0.2.2 directory is append-only. It has no earlier repository-published predecessor. A rollback selects a separately approved prior version/hash; reverting the publication commit removes the current branch reference but cannot erase this commit-pinned history.

## Test-first and verification evidence

1. RED: `node --test tests/design-authority-artifact.test.js` exited `1`; all five checks failed because the versioned artifact/manifest and raw-byte Git attribute were absent.
2. GREEN: the same focused command exited `0`; `5/5` passed.
3. Initial full root run exited `1` only because the fresh worktree had no root `node_modules` and existing MCP tests could not load `@modelcontextprotocol/sdk`.
4. `npm ci` installed exactly the existing root lockfile (`91` packages) without changing dependency metadata. It reported the known root baseline of six advisories (`3 high`, `2 moderate`, `1 low`), tracked separately by #227.
5. Fresh focused run: `5/5` passed.
6. Fresh `npm test`: `177/177` passed across `59` suites.
7. Local static HTTP round-trip: status `200`, `79,369` bytes, identical SHA-256.
8. `git diff --cached --check`: exit `0`.
9. Committed object verification: `git rev-parse HEAD:<artifact>` returned `92d2cb6f478aa649e736b8fe8a7bb5b944cfb5cf`; `git cat-file -s` returned `79369`.

The verification suites generate temporary heartbeat and audit outputs as an existing test side effect. Every generated file was identified by exact path and removed; none are in the Issue diff.

## Independent review

- Pre-publication provenance/security review: exact hash and size confirmed; no secret/private/network blocker found; browser-local storage disclosure required and recorded.
- Repository-convention review: selected the existing `reports/` evidence surface and identified the `core.autocrlf` normalization risk; the exact-path `.gitattributes` guard and real Git-attribute test resolve it.
- Exact-commit final provenance review: **PASS** at `6814473e023fa76faf32e9dd2ec3897b27d329e2`; no actionable findings. The reviewer independently confirmed diff confinement, working and committed byte identity, raw-byte Git attributes, approval/scope binding, privacy/runtime disclosure, rollback, and test quality.
- Exact-commit independent QA replay: artifact gates **PASS** at the same head. Focused tests passed `5/5`; `git diff --check` passed; working and committed buffers were identical at `79,369` bytes and the approved SHA-256/blob ID; Git reported `text: unset`; and no package or lockfile changed. Its first cleanliness snapshot correctly flagged its own four generated heartbeat/audit outputs plus this intended uncommitted run report; the generated outputs were then removed by exact path.

## Files and rollback

Core artifact commit `6814473e023fa76faf32e9dd2ec3897b27d329e2` adds:

- `.gitattributes`
- `reports/design-authority/desktop/consolidated-candidate-v0.2.2/index.html`
- `reports/design-authority/desktop/consolidated-candidate-v0.2.2/manifest.json`
- `tests/design-authority-artifact.test.js`

This run report is a follow-up evidence-only addition. The safe rollback is an ordinary `git revert` of the publication commits. Do not edit the approved HTML or force-push/rewrite its history.

## Remaining gates

- push without force and verify the content-addressed and commit-pinned GitHub links;
- open a draft PR against `main` with Issue, evidence, risks, rollback, and unresolved gates;
- normal CI, independent/human review, and merge gates remain closed.

No merge, ready-for-review transition, self-approval, Issue closure, Project mutation, mobile/accessibility claim, or next-Issue pull is authorized by this run.
