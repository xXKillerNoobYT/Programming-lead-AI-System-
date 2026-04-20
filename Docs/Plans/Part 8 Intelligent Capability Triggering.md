# Part 8 — Intelligent Capability Triggering

**Version**: 1.0 — drafted 2026-04-20 from user directive:
> "get it built into the program so that it triggers stuff intelligently and used smartly" — the program = DevLead MCP runtime (`heartbeat.js` + delegation layer), not Claude Code.

**Relationship to other plans**: sibling of Parts 1–7. Part 1 established Lead + 3rd-party agents + MCP + preferences. Part 7 framed Linear parity + credit awareness. **Part 8 specifies HOW the Lead decides which Anthropic (or equivalent-provider) capability to invoke at each decision point in its own loop.** This is the product-runtime equivalent of what `memory/feedback_superpower_triggers.md` is for Claude Code — but baked into code, not memory.

**Scope-out**: Claude Code's own trigger map (lives in memory). Skill invocation syntax (already ships in Claude Code). Agent SDK bindings (Phase 4+).

---

## 0. Why this exists

DevLead MCP's Lead Agent makes ~20 decisions per heartbeat tick — each with a cost signature, a latency signature, and a quality signature. Anthropic (and peer providers) ship **18+ named capabilities** that tune those signatures: Prompt Caching halves latency on repeat context; Extended Thinking improves accuracy at higher token cost; Message Batches trade latency for throughput discount; Managed Agents outsource orchestration complexity; Skills compose reusable procedures; Subagents parallelize; JSON Mode eliminates parse-error retries.

**Today's DevLead (Phase 3)**: single-model Ollama for every tick, one hourly Grok escalation. No per-decision tuning. Every tick pays the same cost regardless of whether it's a 2-line typo fix or a cross-cutting refactor.

**Target state (Phase 4+)**: the Lead's *decision router* examines the incoming task (size / complexity / stakes / retry-budget) and picks the right capability stack for that specific call. A typo fix routes to a local 7B model with no Thinking. A phase-decomposition routes to Grok 4.1 Fast with Extended Thinking + Prompt Caching on the phase-plan context. A schema migration routes to Managed Agents or a Claude Code subagent with TDD subagent pipeline.

**The win**: same monthly budget → 3-5x more useful work done. Matches the Part 7 §I credit-aware allocation ask with teeth.

---

## 1. The decision surface (what the Lead chooses per tick)

Every Lead call answers 6 questions before invocation:

| Axis | Values | Capability it tunes |
|------|--------|--------------------|
| **Model** | local-7B / local-32B / cloud-mid / cloud-frontier | $/token × quality; latency |
| **Thinking** | off / low / medium / high | Accuracy × thinking-budget tokens |
| **Context shape** | prompt-cached / fresh / RAG-retrieved | Latency × $/token on repeat context |
| **Delivery** | sync / async-batch / streamed | Wall-clock vs throughput |
| **Output format** | free-text / JSON-schema / structured-tool-call | Parse reliability × format overhead |
| **Delegation** | self / subagent / Managed Agent / 3rd-party coding agent | Complexity owned by Lead vs externalized |

Today's Lead answers all 6 identically (cloud-Grok-once-hourly + local-32B-for-rest + sync + free-text + self). Part 8 makes each axis data-driven.

---

## 2. Routing catalog — WHEN to invoke which capability

### 2.1 Prompt Caching

- **Trigger**: any Lead prompt that embeds content ≥ 1024 tokens AND is likely to repeat within 5 min (`CLAUDE.md`, `SOUL.md`, recent `decision-log.md`, the phase plan file currently in focus).
- **Implementation**: wrap the Anthropic API call with `cache_control: { type: "ephemeral" }` on the stable block. Grok/xAI equivalent = manual cache table keyed by content hash.
- **Measurement**: log cache-hit ratio per tick in `reports/audit/*.json`. Alert if hit-rate drops below 60% (indicates eviction thrashing or unstable prompt blocks).
- **Anti-pattern**: marking the full prompt as cacheable (wastes write cost); never expiring stale caches (silent data-staleness).
- **Cost math**: 10x cheaper read on hit; write cost 1.25x a normal token. Break-even at 1.25 reuses. The heartbeat's stable block reuses 50-200x per day → trivially profitable.

### 2.2 Extended Thinking

- **Trigger** (decision tree):
  - Leaf is a one-line typo, label flip, or pure data fetch → **off**.
  - Leaf is a component add / test-addition / unambiguous refactor → **low** (1k-5k thinking tokens).
  - Leaf is phase decomposition / cross-file architectural call / collision recovery → **medium** (5k-20k).
  - Leaf is a user-visible correctness bug the last 3 runs failed to reproduce / strategic plan update → **high** (20k+).
- **Triage signal**: `priority:urgent` + `type:bug` → bump one tier. `priority:low` → cap at low.
- **Implementation**: Anthropic's `thinking.budget_tokens` parameter. For Grok/local models without native thinking, emulate via a pre-pass "think through the problem in <reasoning>...</reasoning>, then answer" prompt style + strip the reasoning from the response before acting.
- **Measurement**: per-tick thinking-token spend in run report. Budget 5-15% of monthly token allowance for thinking.
- **Anti-pattern**: thinking on trivial tasks (waste); thinking OFF on genuinely hard tasks (wrong output, retried 3x, net more cost than thinking-on).

### 2.3 Subagents (parallel agent orchestration)

- **Trigger**: a Lead decision requires 2+ independent perspectives (spec review + code review; two competing design sketches; triage pass over 10+ Issues).
- **Implementation**: spawn via MCP `delegate_task_to_agent` or Anthropic Managed Agents API. Parallel-dispatch via a single orchestrator frame, NOT sequential.
- **Dispatch patterns** (from April 2026 Anthropic blog "Multi-agent coordination patterns: Five approaches"):
  1. **Advisor** — Lead asks a specialist for advice, keeps decision authority.
  2. **Committee** — N specialists vote; Lead aggregates.
  3. **Pipeline** — subagent A → B → C sequentially (e.g., the DevLead 3-stage review pipeline).
  4. **Fan-out/fan-in** — N subagents in parallel, Lead reconciles.
  5. **Hierarchy** — Lead spawns manager subagents that spawn workers.
- **Choosing the pattern**: pick the simplest that covers the task. Committee over Advisor only when Lead can't pick the best advisor confidently. Pipeline when each stage depends on the previous (spec → implementer → reviewer). Fan-out when the stages don't depend (two research tasks in parallel).
- **Anti-pattern**: using fan-out for tasks that actually need pipeline (review depending on implementation) — wastes tokens on speculative parallel work that gets thrown out.

### 2.4 Skills

- **Trigger**: any task that matches a skill's description. Claude Code's `Skill` tool is the local equivalent; for the product-runtime Lead, treat skills as MCP-registered `skill:*` tools.
- **Lead-owned skill library** (v1):
  - `decomposition` — break a Phase into atomic Issues with AC + estimate + priority.
  - `triage` — given a new Issue, auto-assign priority + estimate + area + agent.
  - `review-spec-compliance` — given a PR + Issue, verify AC coverage.
  - `review-code-quality` — given a diff, flag bugs/NITs/style.
  - `grok-escalation` — bundle state + questions into the once-per-hour strategic prompt.
  - `credit-accounting` — update `credit-budgets.json` (per Part 7 §I).
- **Composition**: skills stack automatically per Anthropic's model — `Skills layer automatically; Claude selects applicable skills without manual prompting`. Lead's skill-invoker doesn't pre-select; it provides the task + available skill set; the model picks.
- **Anti-pattern**: hand-coding skill selection logic in the Lead — defeats the auto-compose model.

### 2.5 Model Context Protocol (MCP)

- **Trigger**: EVERY outbound call. Non-negotiable per Part 1 §5 + Phase 3 §C.1 guardrails.
- **What changes in Part 8**: MCP gains a skill-routing layer (§2.4) and a delegation layer (§2.6).

### 2.6 Managed Agents + 3rd-party coding agent delegation

- **Trigger decision tree**:
  - Leaf is pure planning / decision / docs → Lead handles directly (local Ollama + Prompt Caching).
  - Leaf is code generation / refactor / test-write → Lead delegates per `preferences.modelMappings` to Roo Code / Copilot / Cursor / Aider / local Ollama.
  - Leaf needs orchestration complexity (retry, state, sub-delegation) beyond one Lead tick → Managed Agents take over.
- **3rd-party agent selection** (extends Part 1 §7):
  - Frontend task → prefer Roo Code (per current memory).
  - Backend task → prefer Copilot (per memory) — unless Copilot credit quota low (per Part 7 §I).
  - "My Claude weekly is at 85%, GitHub Copilot at 20%" → Lead auto-routes to Copilot.
- **Anti-pattern**: delegating every Lead decision — wastes inner tokens on routing overhead. Only delegate CODE.

### 2.7 Message Batches API

- **Trigger**: Lead has ≥ 3 independent prompts to run and none block the tick's critical path.
  - Example: batch the daily digest, the Grok escalation, and the triage pass into one Messages Batches submission. Cost 50% less at the price of 24h max latency.
- **Anti-pattern**: batching the CURRENT tick's critical path — Lead can't make progress while waiting for the batch to return.

### 2.8 JSON Mode / Structured Outputs

- **Trigger**: every subagent return-value. Every skill invocation's output. Every MCP tool-call response.
- **Implementation**: define a Zod (TypeScript) or Pydantic (Python) schema for every `delegate_task_to_agent` return. Validate on receipt. Reject + retry with explicit error on schema miss.
- **Anti-pattern**: accepting free-form markdown and regex-parsing it later — brittle, every format change breaks.

### 2.9 Evaluations framework

- **Trigger**: Phase-completion criteria per `AI plans/phase-*-plan.md`. Also, any change to the Lead's decision logic must pass the evaluation suite before merging.
- **Implementation** (v1): `dashboard/evals/` directory with fixture tasks + expected Lead outputs. Run via `npm run eval:lead`. CI gate: PR changing Lead logic MUST show ≥ baseline score.
- **Anti-pattern**: manual spot-checks — regressions slip through. Evaluations are the *continuous integration for agent behavior*.

### 2.10 Vision / Multimodal / Files API / PDF

- **Trigger**: user uploads a Figma export, a screenshot of a bug, a PDF spec. The ingestion station (Part 1 §3 step 1) uses Vision + PDF support.
- **Out of scope v1**: the product doesn't ingest user uploads yet. Bake the hooks in when ingestion lands.

### 2.11 Computer Use

- **Trigger**: rare. The Coding Relay's "open in VS Code via `vscode://` URI" (Part 6 §7.1) is the only current surface. Computer Use would automate it.
- **Anti-pattern v1**: NOT using it. It's over-spec'd for the current product surface.

### 2.12 Routines (Claude Code April 2026 feature)

- **Trigger**: repeated Lead workflows (brain-sync + PR + merge + cleanup) → codify as a routine.
- **Implementation**: evaluate in Phase 4 whether routines are appropriate for the product runtime (they're a Claude Code UX feature; product equivalent might be "skill chains").

---

## 3. The router — how the Lead decides

### 3.1 Router input

Per tick:
```
{
  taskType: "decomposition" | "implementation" | "review" | "triage" | "docs" | "maintenance",
  complexity: "trivial" | "simple" | "moderate" | "complex" | "architectural",
  stakes: "cosmetic" | "feature" | "bug" | "production-blocker",
  contextSizeTokens: number,
  lastContextHash: string | null,
  priority: "urgent" | "high" | "medium" | "low",
  creditState: { claude: pct, copilot: pct, gh_api: pct, grok: pct },
  userLive: boolean,
  designQsOpen: number
}
```

### 3.2 Router output (decision vector)

```
{
  model: "local-7b" | "local-32b" | "claude-haiku" | "claude-sonnet" | "claude-opus" | "grok-fast",
  thinking: "off" | "low" | "medium" | "high",
  cacheStrategy: "none" | "stable-block-only" | "full-prompt",
  delivery: "sync" | "async-batch" | "streamed",
  outputFormat: "free-text" | "json-schema" | "tool-call",
  delegation: "self" | `subagent:${name}` | `managed-agent:${id}` | `third-party:${agent-name}`,
  skillsToAllow: string[]  // skill IDs the model can invoke during this call
}
```

### 3.3 Router rules (v1 — deterministic, not ML)

The router is a decision tree, not a model. Each rule composes multiple outputs. Rules are priority-ordered; first match wins.

| # | Condition | Output overrides |
|---|-----------|-----------------|
| 1 | `creditState.claude > 95%` | delegation → `third-party:copilot` (if Copilot headroom), else `third-party:ollama`. Skip Claude entirely. |
| 2 | `taskType=decomposition` AND `stakes=architectural` | model=`grok-fast`, thinking=`high`, cacheStrategy=`stable-block-only`. |
| 3 | `taskType=implementation` AND `complexity=trivial` | model=`local-7b`, thinking=`off`, delegation=`self`. |
| 4 | `taskType=implementation` AND `complexity IN [simple, moderate]` | delegation=`third-party:<per-preference>`, outputFormat=`json-schema`. |
| 5 | `taskType=review` | delegation=`subagent:review-*`, delivery=`sync` (blocks PR), outputFormat=`json-schema`. |
| 6 | `taskType=triage` AND count > 5 | delivery=`async-batch`, cacheStrategy=`stable-block-only`. |
| 7 | `taskType=docs` AND complexity<moderate | model=`local-32b`, thinking=`off`. |
| 8 | `priority=urgent` AND `stakes=production-blocker` | thinking=`high` (regardless of other rules), skillsToAllow=`['debug', 'rollback']`. |
| 9 | *default fallthrough* | model=`local-32b`, thinking=`low`, cacheStrategy=`stable-block-only`, delivery=`sync`, outputFormat=`free-text`. |

### 3.4 Router observability

- Every router decision logged in `reports/audit/<timestamp>.json` alongside the tick payload.
- A `reports/router-trace.jsonl` append-only log of (timestamp, input vector, output vector, outcome).
- Dashboard surface: a "Router Reasoning" inspector in the Coding tab that shows the decision tree walk for any given tick.
- Evaluations: every router rule must have ≥ 3 fixture cases in the eval suite.

### 3.5 Router evolution (Phase 4+)

- v1 deterministic → v2 heuristic (rules with numeric weights) → v3 light-ML (train a classifier on the router-trace log) → v4 model-in-the-loop (a mini-Lead prompt that reads the input vector + router-trace history and outputs the decision vector).
- Do NOT start with v3/v4. Deterministic rules are auditable; ML is not.

---

## 4. Integration with Part 7 §I credit-aware allocation

Part 7 specifies WHAT to track (Claude / Copilot / GH API / etc. quotas) and WHAT to do on breach (pause, throttle, reroute). Part 8 specifies HOW the routing decision inside the Lead respects those thresholds.

- Router rule #1 (`creditState.claude > 95%`) is the emergency hard-limit reroute.
- Router rule #3 (trivial implementation → local-7b) is the preemptive burn-rate control.
- `statusMessage()`-style error semantics (D-20260420-006 precedent): when the Lead tries a capability and it fails (rate limit, quota exceeded), router falls back one tier down.

---

## 5. Success criteria

Part 8 is implemented when **all** are true:

- [ ] Every Lead API call goes through the router (`lib/router.js` or equivalent).
- [ ] `reports/router-trace.jsonl` logs every decision.
- [ ] Evaluations suite covers each of the 9 v1 rules with ≥ 3 fixture cases.
- [ ] A/B run: 1000 real tasks routed by Part 8's router vs 1000 routed by the pre-Part-8 "always local-32b-sync" baseline shows ≥ 2x improvement in "useful work per $".
- [ ] Part 7 §I budget thresholds trigger router reroutes automatically (no manual pause needed for credit-limit cases).
- [ ] Dashboard "Router Reasoning" inspector (UI per Part 6 §7.1 extended) renders the decision walk.
- [ ] CLAUDE.md §8 updated to describe the product router (Claude Code is separate and continues to use `memory/feedback_superpower_triggers.md`).

## 6. Out of scope

- ML-based router (Phase 5+).
- Adversarial / self-tuning router.
- Cross-provider unified billing (Part 7 §I tracks per-provider; unified billing is a different product).
- Heuristic auto-adjustment of router weights based on outcomes (that's Phase 5 evolution).

## 7. Open questions for the designer

- **Q-PART8-1**: should the router be a separate MCP server (callable by the Lead) or in-process logic in `heartbeat.js`? (Default: in-process for v1; separate MCP for v2 when the router gets complex.)
- **Q-PART8-2**: should the router's input vector include `userLive` (i.e., in-session user available)? Affects `AskUserQuestion` vs Dev-Q&A routing.
- **Q-PART8-3**: router deterministic v1 — which 9 rules are non-negotiable for MVP? The proposed 9 are a starting point; the designer may cut or add.

## 8. Document lifecycle

- **Writable**: locked user intent after designer review + approval. Amendments via new `### X.N` sections with version bump.
- **Cross-references**: Part 1 §3 (workflow), Part 1 §7 (3rd-party delegation), Part 1 §8 (preferences), Part 6 §7.1 (UI surface for router inspector), Part 7 §I (credit awareness), CLAUDE.md §3 (Claude Code heartbeat stations — sibling concept).
- **Linked memory**: `memory/feedback_superpower_triggers.md` is the Claude Code mirror of this doc for Claude's own heartbeat. They evolve in parallel.
