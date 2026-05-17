---
id: 4287141138
number: 44
title: >-
  dashboard npm install fails with ERESOLVE — react RC vs @testing-library/react
  peer
state: closed
created_at: '2026-04-18T07:07:52Z'
updated_at: '2026-04-18T07:12:51Z'
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
  - id: 10723653340
    name: 'status:in-progress'
    color: FBCA04
    description: Actively in work
  - id: 10723653713
    name: autonomous-lead
    color: 1D76DB
    description: Autonomous programming lead workflow
url: >-
  https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/issues/44
html_url: 'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/44'
closed_at: '2026-04-18T07:12:51Z'
---
# dashboard npm install fails with ERESOLVE — react RC vs @testing-library/react peer

## Reproduction

\`\`\`
cd dashboard
rm -rf node_modules
npm install
\`\`\`

Fails with:
\`\`\`
npm error ERESOLVE could not resolve
npm error While resolving: @testing-library/react@16.3.2
npm error Found: react@19.0.0-rc-02c0e824-20241028
npm error peer react@"^18.0.0 || ^19.0.0" from @testing-library/react@16.3.2
npm error Conflicting peer dependency: react@19.2.5
\`\`\`

## Root cause

React RC versions (\`19.0.0-rc-*\`) are prerelease. npm's default semver range \`^19.0.0\` does NOT match prerelease versions. \`@testing-library/react@16.3.2\` declares \`peer react@"^18 || ^19"\` which rejects the RC.

D-20260418-001 claimed this was fixed "via overrides" but no \`overrides\` field exists in \`dashboard/package.json\` and no \`.npmrc\` exists. The fix either never landed or was later stripped.

## Fix

Add \`dashboard/.npmrc\` with \`legacy-peer-deps=true\`. This is the proven fix for RC-react against stable ecosystem packages and is applied at install-time without shipping anything new to users.

## Acceptance

- \`.npmrc\` exists at \`dashboard/.npmrc\`
- \`cd dashboard && npm install\` succeeds without ERESOLVE
- Record Decision ID, commit, close Issue

---

**Author:** @xXKillerNoobYT
**Created:** 2026-04-18T07:07:52Z
**Updated:** 2026-04-18T07:12:51Z
**Closed:** 2026-04-18T07:12:51Z
**Labels:** type:bug, status:in-progress, autonomous-lead

---

## Comments

### @xXKillerNoobYT - 2026-04-18T07:12:51Z

Fixed by commit 1efa74f (D-20260418-010). `dashboard/.npmrc` with `legacy-peer-deps=true` + added `jest-environment-jsdom` and `@testing-library/dom` as devDependencies. `npm install` + `npm test` (17/17) both green. D-001's "via overrides" claim was stale — no overrides ever landed; .npmrc is the real fix.

