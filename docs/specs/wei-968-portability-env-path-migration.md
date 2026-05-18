# WEI-968 Portability Env/Path Migration

## Goal

Make the heartbeat runtime portable across repo checkout locations by moving machine-specific paths into environment-driven templates and resolving runtime path overrides relative to the repository root.

## Acceptance Criteria

1. `.env.example` documents all runtime path override variables without real secrets or user-only absolute paths.
2. `.mcp.json.template` exposes configurable MCP paths through environment placeholders instead of hard-coded local filesystem roots.
3. `heartbeat.js` loads `.env` before resolving runtime paths and uses the env-driven reports, decision-log, MCP config, and pause-lock paths.
4. Relative env path overrides resolve from the repository root; absolute path overrides remain platform-native.
5. Focused env/path tests cover env file parsing/loading, repo-relative path resolution, and pause-lock path injection.

## Non-goals

- Changing the MCP server list or adding new MCP integrations.
- Reworking onboarding, failure-mode hardening, dashboard behavior, or GitHub/Paperclip orchestration.
- Storing secrets in templates.

## Open Questions

- None for this leaf.

## Evidence Plan

- Run `node --test tests/env-file.test.js tests/env-paths.test.js tests/pause-lock.test.js tests/heartbeat.test.js`.
- Cite the focused test summary in the issue closeout comment.

## Rollback Plan

Revert the env/path helper changes, restore direct repo-local constants in `heartbeat.js`, and keep `.env.example` / `.mcp.json.template` as documentation-only artifacts.

## Size

Small leaf change scoped to runtime path configuration, templates, documentation, and focused tests.
