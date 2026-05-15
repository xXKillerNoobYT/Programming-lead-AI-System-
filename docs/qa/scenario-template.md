# Adversarial QA Scenario Template

> Template used by R4 QA - Break-Testing for adversarial scenario runs.
> Each scenario targets a specific changed surface and attempts to break it
> through realistic misuse, bad inputs, and edge-case interactions.

## Scenario Header

| Field | Value |
|---|---|
| Scenario ID | `QA-YYYYMMDD-NNN` |
| Target surface | _(component, route, API, data store, or job under test)_ |
| Spec / AC ref | _(link to accepted spec or parent issue)_ |
| Tester | R4 QA - Break-Testing |
| Date | _(ISO 8601)_ |

---

## 1. Inputs

Normal-path inputs that exercise the happy path of the changed surface.

- Valid form data, expected types, typical lengths
- Default/empty states on first load
- Saved state restoration from persistence layer

## 2. Hostile Inputs

Inputs designed to break validation, parsing, or rendering.

- **Empty / null / undefined**: missing required fields, `null` where object expected, `undefined` keys
- **Wrong type**: number where string expected, object where array expected, boolean where enum expected
- **Boundary values**: zero, negative, `Number.MAX_SAFE_INTEGER`, empty string `""`, whitespace-only `"   "`
- **Oversized**: strings exceeding expected max length (1 KB, 10 KB, 1 MB), deeply nested objects
- **Special characters**: Unicode (emoji, RTL, zero-width), HTML/script injection (`<script>alert(1)</script>`), JSON-breaking (`{"key": "val`), SQL meta-chars (`'; DROP TABLE --`)
- **Duplicate / repeated**: same key twice in a mapping, rapid repeated submissions
- **Format mismatch**: invalid JSON in storage, truncated JSON, wrong schema version

## 3. Auth Bypass Attempts

Attempts to access or modify data without proper authorization context.

- Direct URL manipulation to restricted routes
- localStorage/sessionStorage tampering to escalate privileges
- Forged or missing auth tokens in API calls
- Cross-tab session confusion (logged-in tab A vs. logged-out tab B)
- Replaying stale session data after logout

## 3a. Injection & Execution Payloads (Sev1–Sev2)

> _Added per R5 review on [WEI-724](/WEI/issues/WEI-724) — gaps in adversarial coverage for security-severity classes._

Targeted payloads that probe for code execution, server-side request forgery, path traversal, and injection beyond the generic hostile-input checks in §2.

- **Command injection (Sev1)**: shell metacharacters in any user-controlled string that reaches `exec`, `spawn`, `execSync`, or similar (`; rm -rf /`, `` `id` ``, `$(whoami)`, `| cat /etc/passwd`)
- **RCE / code execution (Sev1)**: payloads targeting `eval`, `Function()`, `vm.runInNewContext`, template engines, or deserialization (`__proto__` pollution, `constructor.constructor`)
- **SSRF (Sev1)**: user-supplied URLs or hostnames that resolve to internal services (`http://169.254.169.254/`, `http://localhost:3000/admin`, `file:///etc/passwd`, DNS-rebind hostnames)
- **Path traversal (Sev1)**: relative paths escaping intended directories (`../../etc/passwd`, `..%2f..%2f`, null-byte injection `file.txt%00.png`, UNC paths on Windows `\\server\share`)
- **Authenticated injection (Sev2)**: SQL, NoSQL, LDAP, or GraphQL injection from an authenticated session — tests that auth context does not exempt input from sanitization
- **Authorization-boundary containment (Sev2)**: horizontal privilege escalation (user A accessing user B's data), vertical escalation (non-admin reaching admin endpoints), cross-tenant data leakage

## 3b. Destructive Operations Without Confirmation (Sev1)

Operations that destroy, overwrite, or irreversibly mutate state must require an explicit confirmation gate.

- **Delete without confirm**: triggering delete endpoints/buttons with no confirmation dialog or undo window
- **Force-push / hard-reset without gate**: programmatic `git push --force`, `git reset --hard`, `rm -rf` on user data without approval prompt
- **Bulk mutation without preview**: batch-update or batch-delete APIs that accept unbounded input with no dry-run or confirmation step
- **Irreversible state transition**: moving an entity to a terminal state (closed, archived, purged) with no reversal path and no confirmation

## 3c. Dependency CVE Coverage (Sev2–Sev3)

Verify that known-vulnerable dependencies do not ship in the changed surface.

- **Critical/high direct dependency CVE (Sev2)**: `npm audit --audit-level=high` flags zero critical/high findings in direct dependencies for the changed package
- **Transitive dependency CVE (Sev2)**: `npm audit` transitive critical/high findings have mitigations documented or pinned overrides in place
- **Medium-tier dependency CVE tracking (Sev3)**: medium-severity findings are catalogued in a tracking issue or suppressed with documented rationale — not silently ignored

## 3d. Secret & Credential Leakage (Sev1)

> _Added per R5 re-review on [WEI-724](/WEI/issues/WEI-724) / [WEI-729](/WEI/issues/WEI-729) — explicit Sev1 coverage for secrets appearing in any output or artifact._

Verify that credentials, API keys, tokens, session cookies, private config values, and user secrets do not leak through any output surface. For each changed surface, search all relevant outputs and artifacts for full or partial secret values.

- **UI rendering**: component output, page source, DOM attributes, `data-*` fields, tooltips, placeholder text, debug panels, or any visible text that contains or echoes a secret value
- **API responses**: JSON/HTML response bodies, response headers (e.g., `Set-Cookie` with secrets in query strings, `Location` redirects embedding tokens), GraphQL error extensions
- **Logs and telemetry**: application logs (`console.log`, structured log output, heartbeat logs), telemetry/analytics payloads, performance traces, and crash reporters — check for secrets in interpolated strings, request/response dumps, and error context objects
- **Reports and screenshots**: run reports, QA adversary reports, audit JSON, CI artifacts, and any screenshots or screen recordings attached to issues — redact or omit secret values before capture
- **Error messages**: stack traces, validation errors, and user-facing error text that may interpolate config values, connection strings, internal paths with embedded credentials, or token fragments
- **Local/session storage**: `localStorage`, `sessionStorage`, IndexedDB, cookies — secrets must not be persisted in browser-accessible storage unless encrypted or scoped to a secure, httpOnly cookie
- **Persisted artifacts**: committed files (`.env`, config with inline secrets, seed data), generated reports, audit logs on disk, database rows, and any artifact that survives the session — verify no plaintext secret values are written

## 3e. Defense-in-Depth & Observability (Sev3)

Hardening layers and audit evidence that reduce blast radius even when primary controls hold.

- **Security headers**: responses include `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options` (or frame-ancestors CSP) where applicable
- **Observability / audit trail**: security-relevant actions (login, permission change, data deletion, failed auth) emit structured log entries with actor, action, target, and timestamp
- **Error-message information leakage**: error responses do not expose stack traces, internal paths, dependency versions, or database schema details to unauthenticated callers
- **Rate limiting / abuse prevention**: endpoints accepting unauthenticated input enforce rate limits or CAPTCHA to bound automated abuse

## 4. Race Conditions

Concurrent or overlapping actions that may produce inconsistent state.

- **Double-submit**: clicking Save twice rapidly before first write completes
- **Two-tab conflict**: editing preferences in tab A, saving in tab B, then saving in tab A
- **Navigate-during-save**: clicking away or closing tab while a save is in flight
- **Rapid toggle**: toggling a switch on/off/on faster than React state batches
- **Concurrent mount**: component mounts twice due to React StrictMode double-invoke

## 5. Storage Corruption

Persistence layer failures and data integrity violations.

- **Malformed stored data**: invalid JSON, truncated string, wrong schema shape
- **Missing keys**: stored object missing expected fields (partial migration)
- **Stale data**: stored data from a previous schema version loaded into current component
- **Storage unavailable**: `localStorage` throws (private browsing, quota exceeded, disabled)
- **Cross-origin / cross-app collision**: another app writes to the same storage key
- **Partial write**: power loss or tab crash mid-`setItem` (truncated value)

---

## Scenario Entry Format

Each executed scenario is recorded as:

```markdown
### QA-YYYYMMDD-NNN — Short title

- **Category**: Inputs | Hostile inputs | Auth bypass | Injection & execution | Destructive ops | Secret leakage | Dependency CVE | Defense-in-depth | Race conditions | Storage corruption
- **Reproducer**:
  1. Step one
  2. Step two
  3. …
- **Expected**: What should happen per spec / safe product behavior
- **Actual**: What was observed
- **Verdict**: pass | critical | noncritical
- **Evidence**: Screenshot, log path, test output, or "not captured"
- **Filed as**: `type:bug` child issue # (if finding) or N/A
```

---

## Report Aggregation

After all scenarios execute, produce a QA Adversary Report per the R4 charter format:

```markdown
## QA Adversary Report

Status: pass | critical | noncritical

- Scope tested: <changed surface and spec link>
- Runtime/preview: <URL, command, or workspace service>
- Scenarios run: <count>

### Findings
(per-scenario entries)

### Gate Token
qa-gate:approved scenarios=<N>
```

The gate token is only posted when status is `pass` or all noncritical findings have follow-up issues.
