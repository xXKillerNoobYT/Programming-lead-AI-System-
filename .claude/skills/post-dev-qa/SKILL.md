---
name: post-dev-qa
description: Create a GitHub design-question Issue when a hard-to-reverse decision blocks work but the heartbeat can continue elsewhere. Uses type:question + status:needs-user, links blockers, and records answers as GitHub decision evidence.
---

# post-dev-qa

Create an asynchronous GitHub design-question Issue per `CLAUDE.md` §4b.

## When to use

Use when ALL are true:

- A design decision blocks at least one Issue.
- No active/resolved GitHub Issue/comment or linked evidence answers it.
- Two or more reasonable defaults exist and the choice is hard to reverse.
- No live owner answer is available now.

If the owner is live, create/link the question Issue first, then use the structured question tool. The live answer remains provisional until the owner/authorized CEO identity posts or confirms it in a GitHub comment; do not close/unblock before that.

Do NOT use for:

- Reversible choices — pick the lowest-risk default and post a structured `Decision:` comment.
- Questions already answered in GitHub.
- Operational tracking that belongs on the blocked implementation Issue.

## Create the question Issue

Use the native GitHub Issue creation tool, not a shell-based `gh issue create` command.

Required labels:

- `type:question`
- `status:needs-user`
- relevant phase/area/priority labels

Required body:

```markdown
## Blocks

- #XX

## Context

Why this decision exists and what it gates.

## Options considered

1. Option A — concise trade-off.
2. Option B — concise trade-off.
3. Option C — if applicable.

## Recommendation (non-binding)

Recommended option and one-sentence rationale.

## Hard to reverse

Yes — explain why.

## How to answer

Comment with the chosen option and any constraints.
```

Link it to the blocked Issue(s) and native parent roadmap where applicable. Do not idle; note the question in the run report and pick the next unblocked leaf.

## Answer protocol

Every orient:

1. Query open `type:question` + `status:needs-user` Issues.
2. Accept only a repository-owner or explicitly delegated owner/CEO comment. Prefer `Answer:`; require unambiguous choice/constraints otherwise.
3. Leave ambiguous comments open and request clarification.
4. Post a structured `Decision:` summary linking the answer comment.
5. Update/unblock dependent Issues.
6. Remove `status:needs-user`, add the configured completed status (normally `status:done`), and close the question.
7. If moot, close with evidence without inventing a decision.
