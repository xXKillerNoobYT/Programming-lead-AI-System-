# WEI-714 Failure-Mode Test Hardening Spec (Chaos Coding §3/§5)

## Scope
Harden heartbeat failure-mode coverage for:
1. Missing `gh` binary.
2. Bad MCP config payload.
3. Vault/mempalace unreachable.

## Invariants (must hold)
- Heartbeat helpers never throw on dependency failure-paths.
- Failure-paths degrade to explicit status/error surfaces.
- Tick execution remains resumable (no hard crash from these paths).

## AC Matrix
- AC1 Missing `gh`: spawn ENOENT for `gh` is handled as empty output, no throw, and downstream parse-error warning path remains available.
- AC2 Bad MCP config: malformed/invalid `.mcp.json` yields `{ mcpServers: {} }` (no throw) and safe empty-server behavior.
- AC3 Vault unreachable: mempalace tool-call failures are represented as safe error payloads (`{ error: ... }`), not uncaught exceptions.

## Slice Plan
- Slice 1 (implemented): Add explicit missing-`gh` regression test in heartbeat suite and re-verify AC1 + existing AC2/AC3 proofs.
- Slice 2 (implemented): Add heartbeat-level test asserting mempalace observation failure is rendered in report output when observation returns error.
- Slice 3 (implemented): Add startup guard around `main()` config-load/connect path for malformed config fixture to ensure startup survives with no declared servers.

## Evidence Strategy
- Minimal proof command:
  - `node --test tests/heartbeat.test.js tests/mcp-client.test.js`
- Use focused suites only; avoid full-workspace test runs unless a slice crosses broader boundaries.
