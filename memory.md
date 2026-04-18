# Memory Palace Notes

## Initial Setup
- Integrate MemPalace MCP server.
- Wing: DevLead_MCP
- Halls: Projects, Decisions, Reports
- Rooms: Per-project atomic memories.

## Usage
Lead queries on every heartbeat for context grounding.

See [plans/main-plan.md](plans/main-plan.md) for full integration.

## Durable design pillars

These are cross-cutting constraints every new feature / subagent / plan section must satisfy. Added per user directive 2026-04-18 (D-20260418-005).

### 1. Stability
- One atomic task per heartbeat (D-20260417-004).
- Rollback must always be safe — no half-finished features, no mixed-concern commits.
- Run-complete ↔ Issue-close pairing (D-20260417-011).

### 2. Safety
- Verification before completion: every claim in a run report must carry reproducible command output (D-20260417-007).
- Autonomy guardrails: force-push / rm -rf / secret-commit / skip-hooks / modify Docs-Plans / modify SOUL are blocking without explicit user approval (CLAUDE.md §5).
- Async design questions via [`Docs/Plans/Dev-Q&A.md`](Docs/Plans/Dev-Q&A.md) so no heartbeat silently makes a hard-to-reverse design choice (D-20260417-019).

### 3. Small-LLM workability
- Every subagent prompt is structured so a 7B–32B parameter free model (e.g., Qwen-2.5, Llama-3.1) can execute it reliably — explicit numbered rules over chain-of-thought, pass/fail checklists over inferential judgment, output contracts under 400 words.
- Each subagent has its own SOUL + memory files in `.claude/agents/<name>/` that encode this constraint durably (so new agents inherit the pattern).
- Heartbeat prompts (`/heartbeat` slash command, `heartbeat.js` tick protocol) avoid relying on large-context reasoning; they use state snapshots (like `.claude/session-state.md`) rather than asking the model to recompute state every tick.
- When a choice between "cleaner large-model-only prompt" and "slightly more structured small-model-friendly prompt" arises, prefer the latter.

## Subagents with SOUL + memory
- `.claude/agents/issue-triage-picker/` — pick one atomic task per heartbeat, never execute
- `.claude/agents/run-report-validator/` — catch false-green before commit