---
id: 4289819070
number: 101
title: 'dashboard: remove experimental reactCompiler flag (blocks next build)'
state: closed
created_at: '2026-04-19T03:25:20Z'
updated_at: '2026-04-19T04:57:52Z'
author:
  login: xXKillerNoobYT
  id: 37959956
  avatar_url: 'https://avatars.githubusercontent.com/u/37959956?v=4'
  url: 'https://api.github.com/users/xXKillerNoobYT'
assignees: []
labels:
  - id: 10723653140
    name: 'type:bug'
    color: D73A4A
    description: Bug to fix
  - id: 10723653229
    name: 'status:backlog'
    color: BFD4F2
    description: Ready to pick up
  - id: 10723653593
    name: 'phase:3'
    color: C5DEF5
    description: 'Phase 3 — checks, multi-project'
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/101
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/101'
closed_at: '2026-04-19T04:57:52Z'
---
# dashboard: remove experimental reactCompiler flag (blocks next build)

next.config.mjs has `experimental.reactCompiler: true` which requires babel-plugin-react-compiler, not installed. Causes `npm run build` to fail with 'Failed to load the babel-plugin-react-compiler'.

Fix already exists on meta branch (commit b04b7f6). Applying inline in Issue #24 branch since #24 AC requires npm run build green. This Issue captures the fact so the meta-branch context is preserved.

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-19T03:25:20Z
**Updated:** 2026-04-19T04:57:52Z
**Closed:** 2026-04-19T04:57:52Z
**Labels:** type:bug, status:backlog, phase:3

---

## Comments

### @xXKillerNoobYT - 2026-04-19T04:57:52Z

Resolved on main via PR #99: experimental.reactCompiler removed from dashboard/next.config.mjs. Build green on merged main.

