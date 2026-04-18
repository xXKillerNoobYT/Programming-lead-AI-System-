# Memory — run-report-validator

Learnings across invocations. Append only. Short entries. One line per observation when possible.

## Format
Each entry: `[YYYY-MM-DD] <observation> — <implication for future validations>`

## Observations

_(empty — first invocation will seed this)_

---

## What to record here

- **Common false-green phrasings** — e.g., "tests should pass", "expected ~95% coverage"; patterns worth grep-checking early.
- **Frequent D-ID citation errors** — missing, misnumbered, or pointing to non-existent entries.
- **Issue-close pairing miss patterns** — runs that claim to close an Issue without the actual `gh issue close` landing.
- **AC walkthrough drift** — cases where the report's ✅ didn't match reality on inspection.
- **Small-LLM failure modes** — if this agent is invoked under a smaller model and produces bad verdicts, note the pattern so the SOUL checklist can be refined.

## What NOT to record here

- The verdict of any specific run (the run report itself is the durable record)
- Code-quality comments (that's `code-reviewer`'s job)
- Long analysis (keep entries ≤ 2 lines)
- Sensitive info (tokens, secrets, credentials)
