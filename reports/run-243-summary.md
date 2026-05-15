# Run 243 — WEI-724 R4-001 Adversarial QA: Dashboard Preferences Page

**Date**: 2026-05-15
**Branch**: `feature/wei-633-agent-team-spec`
**Agent**: R4 QA Break-Testing (`cbbc753a-1da7-4f2c-ac9c-11ebf2341f16`)
**Wake**: Paperclip daily-stuck-check nudge on WEI-724
**Decision IDs**: none new (QA gate result, not a directional decision)

## Task

WEI-724: Define adversarial scenario template and apply first break-test run to the dashboard preferences page (`dashboard/app/page.tsx`, tested via `dashboard/__tests__/preferences.test.tsx`).

## Deliverables

1. **`docs/qa/scenario-template.md`** — created with all required sections: Inputs, Hostile Inputs, Auth Bypass Attempts, Race Conditions, Storage Corruption.
2. **Adversarial run against preferences page** — 7 scenarios executed (see report below).
3. **QA Adversary Report** — inline below in gate-token format.

## Baseline

- All 181 existing dashboard tests pass (`npx jest --no-coverage --silent`).
- 15 test suites, 0 failures.

---

## QA Adversary Report

Status: critical

- Scope tested: Dashboard preferences page (`dashboard/app/page.tsx`) — model mappings, toggles, heartbeat slider, max parallelism, approval threshold, save/load via localStorage. Spec: WEI-724 (parent WEI-715).
- Runtime/preview: local Jest test suite (`dashboard/`), static code analysis of component.
- Scenarios run: 7

### Findings

1. **critical** — Partial localStorage object crashes component
   - Reproducer:
     1. Open browser devtools console.
     2. Run `localStorage.setItem('preferences', JSON.stringify({ heartbeatInterval: 60 }))`.
     3. Reload the page and navigate to User Guidance tab.
   - Expected: Component deep-merges with defaults or validates shape, renders safely.
   - Actual: `JSON.parse` succeeds but `setPreferences` replaces entire state with partial object. Accessing `preferences.toggles.memPalace` throws `TypeError: Cannot read properties of undefined`. Component crashes — no error boundary catches it.
   - Evidence: Code path at `page.tsx:51` — `setPreferences(JSON.parse(saved))` does raw replacement with no merge or shape validation. Existing test at line 173 only covers invalid JSON, not structurally valid but incomplete objects.
   - Suggested owner: Coder-Frontend

2. **critical** — `localStorage.setItem` throw (quota exceeded) crashes save
   - Reproducer:
     1. Fill localStorage near quota (e.g. in private browsing on Safari, or store ~5MB of data).
     2. Click "Save Preferences".
   - Expected: Catch the error, display a failure message to the user.
   - Actual: `handleSave()` at `page.tsx:58` has no try/catch. `DOMException: QuotaExceededError` propagates uncaught. Success message is never shown. Component may unmount if React error boundary is absent.
   - Evidence: `handleSave` function body — `localStorage.setItem(...)` is unguarded.
   - Suggested owner: Coder-Frontend

3. **noncritical** — XSS payload stored in model mapping (no current exploit, latent risk)
   - Reproducer:
     1. Type `<img src=x onerror=alert(1)>` into the "design lead" model mapping field.
     2. Click Save, reload.
   - Expected: Input is sanitized or length-capped.
   - Actual: Value round-trips through localStorage. React's controlled `value=` prop escapes it on render — no XSS fires in this component. However, no length cap or character validation exists; a 100KB string is silently accepted. Latent risk if any downstream consumer renders these values as raw HTML.
   - Evidence: `page.tsx:143` — `onChange` writes directly to state with no sanitization.
   - Suggested owner: Coder-Frontend (low priority follow-up)

4. **noncritical** — Max Parallelism accepts negative/zero values
   - Reproducer:
     1. Navigate to User Guidance tab.
     2. Type `-5` or `0` into the Max Parallelism number input.
     3. Click Save.
   - Expected: Value clamped to `[1, 20]` range at state level.
   - Actual: HTML `min="1" max="20"` attributes are advisory only — programmatic input or paste bypasses them. State stores `-5` and persists it to localStorage.
   - Evidence: `page.tsx:210` — `onChange` passes `Number(e.target.value)` directly to updater with no clamp.
   - Suggested owner: Coder-Frontend

5. **noncritical** — React StrictMode double-mount not tested
   - Reproducer:
     1. Wrap `<Dashboard />` in `<React.StrictMode>` in test.
     2. The `useEffect` at line 47 fires twice (mount → unmount → remount).
   - Expected: Tests exercise the StrictMode double-invoke to catch cleanup issues.
   - Actual: Tests render without StrictMode. The component has no useEffect cleanup function — the second mount is benign in production but could mask future regressions if a side-effect is added.
   - Evidence: Test file lacks `<React.StrictMode>` wrapper. Component `useEffect` has no return cleanup.
   - Suggested owner: Tester Specialist (test coverage improvement)

6. **noncritical** — Double-click Save leaks timers
   - Reproducer:
     1. Click "Save Preferences" twice rapidly (< 100ms between clicks).
   - Expected: Second click debounced or first timer cancelled.
   - Actual: Two `setTimeout` handles are created. First clears the message after 3s, second fires 3s after that on an already-empty string. No functional breakage but timer leak accumulates on repeated rapid clicks.
   - Evidence: `page.tsx:60` — `setTimeout(() => setSaveMessage(''), 3000)` with no ref to cancel prior timer.
   - Suggested owner: Coder-Frontend (low priority)

7. **noncritical** — Invalid `approvalThreshold` string accepted from localStorage
   - Reproducer:
     1. Run `localStorage.setItem('preferences', JSON.stringify({...validPrefs, approvalThreshold: 'INVALID'}))`.
     2. Reload, navigate to User Guidance.
   - Expected: `<select>` validates against known options, falls back to default.
   - Actual: `<select>` renders with value `'INVALID'` — no matching `<option>`, browser shows blank or first option visually. Internal state retains `'INVALID'`, which is re-persisted on next Save.
   - Evidence: `page.tsx:221` — `value={preferences.approvalThreshold}` with no validation against option set.
   - Suggested owner: Coder-Frontend

### Gate Token

**NOT ISSUED** — 2 critical findings block the QA gate. Findings #1 and #2 must be resolved and re-tested before `qa-gate:approved` can be posted.

## Next Steps

- File child issues for critical findings #1 and #2 (assigned to Coder-Frontend).
- File a bundled noncritical follow-up for findings #3–#7.
- Re-test after fixes land.
