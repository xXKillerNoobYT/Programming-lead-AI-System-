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

- **Category**: Inputs | Hostile inputs | Auth bypass | Race conditions | Storage corruption
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
