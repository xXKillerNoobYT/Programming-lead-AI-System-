# AGENTS.md — Model Routing for the Programming Lead Team

This file governs Codex and GitHub Copilot agent sessions in this repository. `CLAUDE.md` remains the builder workflow, `SOUL.md` remains the product guardrail, and GitHub Issues/comments are the active product-intent, question, decision, and task ledger. Historical vault plans and `decision-log.md` are read-only provenance. When instructions conflict, preserve safety gates and the latest approved GitHub decision; use this file to select and coordinate models.

## Universal operating doctrine

Every agent must follow the global Codex operating doctrine and the canonical Notion pages [START HERE — any agent, any computer](https://app.notion.com/p/3aea776a198d8162877be93d2e87ee9f) and [Operating Loop — 14 Rules](https://app.notion.com/p/3c4a776a198d81c8aad8fb6ea18b832a).

The required cycle is:

`OBSERVE → FRAME → DIAGNOSE → DECIDE → ARCHITECT → BUILD → VALIDATE → REVIEW → SHIP → MEASURE → IMPROVE → OBSERVE`

This is an everywhere loop, not a coding-only or model-routing loop. Apply it to planning, skill selection, delegation, implementation, review, release, measurement, memory, and process improvement. A cycle is incomplete until the problem and cause or open question are clear, the decision rests on evidence, the smallest useful change is verified, the outcome is measured, and the learning is written down. If results break the model, stop, update the model, and run the loop again.

## Agent-management surface

- Use the GitHub Copilot desktop app as the preferred agent-management surface when it provides the required repository, session, tool, and review capabilities.
- Prefer the configured OpenAI provider for reasoning and coding work.
- Use a GitHub-hosted or non-OpenAI model only for a specific capability the configured OpenAI models cannot provide, or when a measured task evaluation shows better quality or materially lower cost at the same quality.
- Never expose, copy, log, or commit provider credentials. Provider keys remain in the operating-system credential store.

## Model roles

| Role | Preferred model | Use |
|---|---|---|
| Lead architect and director | `gpt-5.6-sol` | Architecture, decomposition, delegation, hard trade-offs, final synthesis, and escalation decisions |
| Primary implementation | `gpt-5.6-terra` | Substantial feature work, cross-file changes, refactors, and normal coding execution |
| Affordable implementation | `gpt-5.6-luna` | Bounded changes that still require strong coding quality |
| Coding specialist | `gpt-5.3-codex` | Repository-heavy implementation, mechanical code changes, test repair, and focused coding tasks |
| Independent review/debug | `gpt-5.5` | Code review, root-cause analysis, adversarial checking, and a second opinion independent of the implementer |
| Low-cost utility | `gpt-5.4-mini` | Search, inventory, formatting, summaries, routine checks, and other low-risk support work |
| Conversational convenience | `chat-latest` | Questions, brainstorming, and informal exploration only |

## Selection policy

1. Choose by demonstrated capability, not speed. Speed is only a tie-breaker.
2. Meet the task's quality and safety bar first, then choose the least-expensive model that reliably clears it.
3. Use `gpt-5.6-sol` to direct difficult work, not as the default worker for every task.
4. Escalate from Luna or the utility model to Terra, Codex, 5.5, or Sol when scope, ambiguity, risk, or failed verification demands it.
5. For material changes, keep implementation and final review on different model roles when practical.
6. Do not use `chat-latest` or another moving alias for reproducible builds, acceptance gates, regression baselines, or release approval. Use a pinned model ID when the provider offers one and record it in the run evidence.
7. Before dispatch, confirm the selected model supports the tools, context length, streaming, and function calling required by the Copilot session.
8. If a preferred model is unavailable, select the closest capable fallback and record the substitution and reason.

## Team operating rules

- The lead architect defines the objective, constraints, acceptance criteria, task boundaries, dependencies, and review plan before dispatch.
- Subagents receive bounded tasks with explicit expected artifacts and verification requirements.
- Do not assign work merely to keep an agent busy. Parallelize only independent tasks.
- Use coordinated background agents as the primary parallel-work mechanism for substantial independent scopes. After dispatch, the lead continues different work; do not poll or duplicate the delegated scope.
- Keep each implementation background session aligned to one atomic Issue/branch/PR. Research/review agents remain read-only unless their role explicitly owns a change.
- The implementer may not waive its own failing tests or review findings.
- Security, privacy, payment, authentication, data-loss, and release-risk work requires independent review; use the strongest appropriate reviewer available.
- Record the provider, model, role, outcome, token or cost signal when available, and any escalation in the run report so future routing can be based on evidence.
- Feed run evidence into the universal MEASURE and IMPROVE stages: update model routing, skill choice, prompts, tests, and shared lessons when the evidence shows a recurring pattern.

## Catalog policy

The approved OpenAI catalog set is `chat-latest`, `gpt-5.3-codex`, `gpt-5.4-mini`, `gpt-5.5`, `gpt-5.6-luna`, `gpt-5.6-sol`, and `gpt-5.6-terra`. Do not add legacy, Pro, Nano, snapshot-duplicate, or non-OpenAI models without a defined role and an evaluation showing why the existing set is insufficient.
