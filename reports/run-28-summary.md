# Run 28 Summary — Subagent SOUL + Memory Files, Small-LLM Design Pillar (D-20260418-005)

## Overview
**Task**: User directive — *"make sure that this agents has a sole and memory file for making this project the best most stable and safest one that will be available well working with free small language models."*
**Decision ID**: D-20260418-005 (D-004 reserved for parallel-agent Run 27 work per Dev-Q&A Q-20260418-001)
**Status**: COMPLETE
**Trigger**: User message during the active `/loop /heartbeat`.
**Branch**: `run-25/dependabot-triage`.

## Outcome
Each of the two subagents I created in Run 24 (`issue-triage-picker`, `run-report-validator`) now has a durable identity (SOUL.md) and a persistent learnings channel (memory.md) in its own subfolder. Both agent prompts reference those files explicitly and carry a small-LLM compatibility note. The project-level `memory.md` gained a "Durable design pillars" section that codifies Stability + Safety + Small-LLM workability as cross-cutting constraints every future subagent/feature must inherit.

## Why this matters
- **SOUL** survives model swaps. When the heartbeat eventually runs on a free 7B-32B model (Qwen-2.5, Llama-3.1) instead of Claude, the SOUL's explicit numbered rules + checklists + output contracts are what make the small model produce the same verdict a large model would. No chain-of-thought required.
- **Memory** accumulates learnings without central re-training. Each invocation can append 1-2 lines of observation; the next invocation reads them and adjusts.
- **Small-LLM-workability as a pillar** means every new subagent/feature from here forward inherits the constraint by default. Economically, 24/7 cron heartbeats only pencil out if cheap/free LLMs can drive them.

## Changes
| File | Change |
|---|---|
| `.claude/agents/issue-triage-picker/SOUL.md` (**new**) | Identity, mission, 4 numbered priority rules, housekeeping classifier, output contract, safety guardrails |
| `.claude/agents/issue-triage-picker/memory.md` (**new**) | Append-only log format; seeded with "what to record / what NOT to record" guidance |
| `.claude/agents/run-report-validator/SOUL.md` (**new**) | Identity, 7-section pass/fail checklist (false-green / D-ID / pairing / AC / captures / atomic / conventions), output contract, safety guardrails |
| `.claude/agents/run-report-validator/memory.md` (**new**) | Same append-only format |
| `.claude/agents/issue-triage-picker.md` | Added "Read these BEFORE you execute" block pointing at SOUL + memory; added "Small-LLM compatibility note" |
| `.claude/agents/run-report-validator.md` | Same two additions |
| `memory.md` | Added "Durable design pillars" section (Stability, Safety, Small-LLM workability) + subagent registry |
| `decision-log.md` | D-20260418-005 entry; D-004 explicitly reserved for parallel-agent's Run 27 Part 6 rescue |
| `reports/run-28-summary.md` | This file |

## What I intentionally did NOT do
- **Did not modify the agent `model:` frontmatter field.** Still says `sonnet`. The small-LLM-compatibility constraint is about *prompt design*, not runtime selection. Swapping to a small model is a future decision — the prompts are ready when you want to.
- **Did not touch SOUL.md (project-level).** That file is immutable without a GitHub Issue + approval per CLAUDE.md §5. The durable pillars live in `memory.md` instead — which is the project's writable durable-observations file.
- **Did not answer Q-20260418-001** in Dev-Q&A.md. That's the parallel agent's Part 6 naming question addressed to you, not me.
- **Did not propagate the SOUL+memory pattern backwards to the existing `.claude/skills/post-dev-qa/` skill.** Skills have different semantics (they're invoked, not reasoning); a SOUL for a skill would be redundant with its existing body. If this judgement turns out wrong, easy to add later.

## Test Results
```
$ npm test (repo root)
ℹ tests 24
ℹ pass 24
ℹ fail 0
```
Doc-only + config changes this run — tests unaffected.

## Decisions
| ID | Decision | Rationale |
|---|---|---|
| D-20260418-004 | **Reserved** for parallel-agent Run 27's Part 6 rescue work (referenced in Dev-Q&A Q-20260418-001). Slot held to prevent D-ID collision. | Parallel Claude Code sessions are active; reserving the intermediate slot keeps the log monotonic when the other agent commits. |
| D-20260418-005 | Each subagent gets SOUL + memory in `.claude/agents/<name>/`. Small-LLM workability codified as a third project pillar in `memory.md` alongside Stability + Safety. Prompt-design-only constraint — no model runtime change. | Durable SOUL survives model swap; durable memory accumulates learnings; project-level pillar makes the constraint inheritable. `memory.md` (writable) rather than `SOUL.md` (immutable) is the correct surface for these pillars. | Keep prompts as-is (brittle on model swap); inline SOUL into agent frontmatter (bloats discovery); skip the small-LLM framing (ties future autonomy to paid API); put pillars in CLAUDE.md (wrong surface — CLAUDE.md is for protocol, memory.md is for durable observation) |

## Metrics
- **Issues closed**: 0 (workflow/infrastructure run, not Issue-driven)
- **Issues opened**: 0
- **Files added**: 5 (4 SOUL/memory files + this report)
- **Files modified**: 4 (2 agent defs, memory.md, decision-log.md)
- **Open backlog after this run**: unchanged — ~11 (#16, #17, #19 epic, #22, #23, #24, #26, #27, #28, #30, #31); ≥3 ✓
- **Commits this run**: 1 (upcoming)

## Gaps Captured (Polsia Rule 2)
- **Skill SOUL+memory pattern is untested.** The `.claude/skills/post-dev-qa` skill is simpler (an invocable action, not a reasoning agent), so I didn't give it a SOUL. If a future small-LLM test reveals the skill fails on a cheap model, file an Issue to add SOUL+memory to skills too.
- **Subagent SOUL discovery depends on the agent reading its own files.** If the Claude Code harness skips subdirectory reads under `.claude/agents/` on some version, the subagent's SOUL/memory may not load. Smoke-test on the next `issue-triage-picker` invocation.
- **D-20260418-004 reservation is a patch, not a protocol.** Parallel-session D-ID collision keeps happening; a proper protocol (e.g., `git pull --rebase` before writing decision-log, or atomic-allocate-D-ID-via-timestamp) should be an Issue.

## Next Task
Per the `issue-triage-picker` priority tree:
1. No `status:in-progress` Issue.
2. No open leaves of open parents.
3. Softened oldest-first + backbone-override: oldest atomic are Phase 3/4 wave-1 Issues (#22/#23/#24/#26/#27/#28) or security #30/#31.
4. **Recommended pick**: **#26** (Phase 4 §B.1 GitHub Actions CI workflow). CI is the enforcement layer for everything I just wrote — red CI catches any regression to the small-LLM-compatible subagent prompts and the new SOUL/memory files. Natural pairing.

Strict-oldest-first alternative: #16 (stash triage, still oldest).

Security pick (if you prefer treating ReDoS/command-injection as blockers): #30 or #31.

## Open Concerns (carried forward)
- Q-20260418-001 in Dev-Q&A awaits your answer (Part 6 file naming).
- Branch `run-25/dependabot-triage` continues to accumulate commits without merging to main.
- MemPalace MCP still not loaded (pending restart to pick up new `.mcp.json` servers).

## Heartbeat cadence
This tick pre-empted the ScheduleWakeup I fired after Run 26 (1500s from then). The existing wake is still scheduled and will fire on time — the loop remains armed.
