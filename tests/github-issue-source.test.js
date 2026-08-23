'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  resolveRepository,
  fetchIssueSnapshot,
  normalizeIssue,
  parseIssueNumberFromUrl,
} = require('../lib/github-issue-source');

function rawIssue(number, overrides = {}) {
  return {
    number,
    title: `Issue ${number}`,
    html_url: `https://github.com/acme/widgets/issues/${number}`,
    state: 'open',
    body: `Body for ${number}`,
    labels: [{ name: 'type:task' }, { name: 'status:backlog' }],
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-21T11:00:00Z',
    parent_issue_url: null,
    sub_issues_summary: { total: 0 },
    issue_dependencies_summary: { total_blocked_by: 0 },
    ...overrides,
  };
}

function response(value, status = 0) {
  return { status, stdout: JSON.stringify(value), stderr: '' };
}

function sourceFixture() {
  const root = rawIssue(210, { sub_issues_summary: { total: 1 } });
  const child = rawIssue(236, {
    parent_issue_url: 'https://api.github.com/repos/acme/widgets/issues/210',
    state: 'closed',
    labels: [{ name: 'TYPE:TASK' }, { name: 'status:backlog' }],
  });
  const pullRequest = rawIssue(400, { pull_request: { url: 'https://api.github.com/repos/acme/widgets/pulls/400' } });
  return [[root, pullRequest], [child]];
}

function spawnFor(responses, calls) {
  return (cmd, args) => {
    calls.push({ cmd, args });
    const key = args.join(' ');
    if (!Object.hasOwn(responses, key)) throw new Error(`unexpected gh invocation: ${key}`);
    return responses[key];
  };
}

test('parses issue numbers from GitHub API and web issue URLs while rejecting malformed URLs', () => {
  assert.equal(parseIssueNumberFromUrl('https://api.github.com/repos/acme/widgets/issues/236'), 236);
  assert.equal(parseIssueNumberFromUrl('https://github.com/acme/widgets/issues/236'), 236);
  assert.throws(() => parseIssueNumberFromUrl('https://github.com/acme/widgets/pull/236'), /issue URL/i);
  assert.throws(() => parseIssueNumberFromUrl('not a URL'), /issue URL/i);
});

test('normalizes a complete REST issue shape and rejects malformed source fields', () => {
  const normalized = normalizeIssue(rawIssue(236, {
    state: 'closed',
    labels: [{ name: 'TYPE:TASK' }, { name: 'status:Backlog' }],
    parent_issue_url: 'https://api.github.com/repos/acme/widgets/issues/210',
  }));

  assert.deepEqual(normalized, {
    number: 236,
    title: 'Issue 236',
    url: 'https://github.com/acme/widgets/issues/236',
    state: 'CLOSED',
    body: 'Body for 236',
    labels: ['type:task', 'status:backlog'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-21T11:00:00Z',
    parentNumber: 210,
    childNumbers: [],
    blockedByNumbers: [],
  });

  assert.throws(() => normalizeIssue(rawIssue(236, { labels: [{ name: '' }] })), /labels/i);
  assert.throws(() => normalizeIssue(rawIssue(236, { created_at: 'not-a-date' })), /created_at/i);
  assert.throws(() => normalizeIssue(rawIssue(236, { sub_issues_summary: { total: -1 } })), /sub_issues_summary/i);
  assert.throws(() => normalizeIssue(rawIssue(236, { parent_issue_url: '' })), /parent_issue_url/i);
  assert.throws(() => normalizeIssue(rawIssue(236, { html_url: 'https://evil.example/acme/widgets/issues/236' })), /html_url/i);
  assert.throws(() => normalizeIssue(rawIssue(236, { html_url: 'https://github.com/acme/widgets/pull/236' })), /html_url/i);
  assert.throws(() => normalizeIssue(rawIssue(236, { html_url: 'https://github.com/acme/widgets/issues/237' })), /html_url/i);
});

test('resolves a repository with a read-only gh repo view when no explicit repository is provided', () => {
  const calls = [];
  const repository = resolveRepository({
    _spawnImpl: spawnFor({
      'repo view --json nameWithOwner': response({ nameWithOwner: 'acme/widgets' }),
    }, calls),
  });

  assert.equal(repository, 'acme/widgets');
  assert.deepEqual(calls, [{ cmd: 'gh', args: ['repo', 'view', '--json', 'nameWithOwner'] }]);
});

test('keeps an explicit repository and does not invoke gh repo view', () => {
  let called = false;
  const repository = resolveRepository({
    repository: 'acme/widgets',
    _spawnImpl: () => {
      called = true;
      throw new Error('should not resolve an explicit repository');
    },
  });

  assert.equal(repository, 'acme/widgets');
  assert.equal(called, false);
  assert.throws(() => resolveRepository({ repository: 'acme widgets' }), /repository/i);
});

test('flattens paginated issues, filters pull requests, and constructs native parent-child relationships', () => {
  const calls = [];
  const snapshot = fetchIssueSnapshot({
    repository: 'acme/widgets',
    now: () => new Date('2026-08-23T12:00:00.000Z'),
    _spawnImpl: spawnFor({
      'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response(sourceFixture()),
    }, calls),
  });

  assert.deepEqual(snapshot, {
    schemaVersion: 1,
    repository: 'acme/widgets',
    observedAt: '2026-08-23T12:00:00.000Z',
    issues: [
      {
        number: 210,
        title: 'Issue 210',
        url: 'https://github.com/acme/widgets/issues/210',
        state: 'OPEN',
        body: 'Body for 210',
        labels: ['type:task', 'status:backlog'],
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-21T11:00:00Z',
        parentNumber: null,
        childNumbers: [236],
        blockedByNumbers: [],
      },
      {
        number: 236,
        title: 'Issue 236',
        url: 'https://github.com/acme/widgets/issues/236',
        state: 'CLOSED',
        body: 'Body for 236',
        labels: ['type:task', 'status:backlog'],
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-21T11:00:00Z',
        parentNumber: 210,
        childNumbers: [],
        blockedByNumbers: [],
      },
    ],
  });
  assert.deepEqual(calls, [{
    cmd: 'gh',
    args: ['api', '--paginate', '--slurp', 'repos/acme/widgets/issues?state=all&per_page=100'],
  }]);
});

test('retrieves every paginated native blocked-by Issue list when the summary requires them', () => {
  const calls = [];
  const blocked = rawIssue(236, { issue_dependencies_summary: { total_blocked_by: 2 } });
  const prerequisite = rawIssue(235);
  const secondPrerequisite = rawIssue(234);
  const snapshot = fetchIssueSnapshot({
    repository: 'acme/widgets',
    now: '2026-08-23T12:00:00.000Z',
    _spawnImpl: spawnFor({
      'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response([[blocked, prerequisite, secondPrerequisite]]),
      'api --paginate --slurp repos/acme/widgets/issues/236/dependencies/blocked_by': response([[prerequisite], [secondPrerequisite]]),
    }, calls),
  });

  assert.deepEqual(snapshot.issues.find((issue) => issue.number === 236).blockedByNumbers, [234, 235]);
  assert.deepEqual(calls[1], {
    cmd: 'gh',
    args: ['api', '--paginate', '--slurp', 'repos/acme/widgets/issues/236/dependencies/blocked_by'],
  });
});

test('fails closed when native child or dependency totals contradict returned state', () => {
  const childMismatch = rawIssue(210, { sub_issues_summary: { total: 1 } });
  assert.throws(() => fetchIssueSnapshot({
    repository: 'acme/widgets',
    _spawnImpl: spawnFor({
      'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response([[childMismatch]]),
    }, []),
  }), /child count mismatch/i);

  const blocked = rawIssue(236, { issue_dependencies_summary: { total_blocked_by: 1 } });
  assert.throws(() => fetchIssueSnapshot({
    repository: 'acme/widgets',
    _spawnImpl: spawnFor({
      'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response([[blocked]]),
      'api --paginate --slurp repos/acme/widgets/issues/236/dependencies/blocked_by': response([]),
    }, []),
  }), /dependency count mismatch/i);
});

test('fails closed on API error objects, invalid JSON, partial pagination, and non-zero gh exits', () => {
  const issueQuery = 'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100';
  const cases = [
    { result: response({ message: 'Not Found' }), pattern: /expected paginated/i },
    { result: { status: 0, stdout: '{bad', stderr: '' }, pattern: /invalid JSON/i },
    { result: response([rawIssue(236)]), pattern: /page/i },
    { result: { status: 1, stdout: '', stderr: 'permission denied' }, pattern: /gh failed/i },
  ];

  for (const { result, pattern } of cases) {
    assert.throws(() => fetchIssueSnapshot({
      repository: 'acme/widgets',
      _spawnImpl: spawnFor({ [issueQuery]: result }, []),
    }), pattern);
  }
});

test('fails closed when a parent is absent after filtering or dependency payload is an API error object', () => {
  const orphan = rawIssue(236, {
    parent_issue_url: 'https://api.github.com/repos/acme/widgets/issues/210',
  });
  assert.throws(() => fetchIssueSnapshot({
    repository: 'acme/widgets',
    _spawnImpl: spawnFor({
      'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response([[orphan]]),
    }, []),
  }), /missing parent/i);

  const blocked = rawIssue(236, { issue_dependencies_summary: { total_blocked_by: 1 } });
  assert.throws(() => fetchIssueSnapshot({
    repository: 'acme/widgets',
    _spawnImpl: spawnFor({
      'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response([[blocked]]),
      'api --paginate --slurp repos/acme/widgets/issues/236/dependencies/blocked_by': response({ message: 'Forbidden' }),
    }, []),
  }), /expected paginated/i);
});

test('fails closed when a same-number parent URL belongs to a foreign host or repository', () => {
  const foreignParents = [
    'https://evil.example/repos/acme/widgets/issues/210',
    'https://api.github.com/repos/other/widgets/issues/210',
  ];

  for (const parentIssueUrl of foreignParents) {
    const root = rawIssue(210, { sub_issues_summary: { total: 1 } });
    const child = rawIssue(236, { parent_issue_url: parentIssueUrl });
    assert.throws(() => fetchIssueSnapshot({
      repository: 'acme/widgets',
      _spawnImpl: spawnFor({
        'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response([[root, child]]),
      }, []),
    }), /parent.*repository|parent.*GitHub/i);
  }
});

test('fails closed when same-number blocked-by entries have foreign, malformed, or mismatched Issue URLs', () => {
  const invalidDependencyUrls = [
    'https://evil.example/acme/widgets/issues/235',
    'https://github.com/other/widgets/issues/235',
    'https://github.com/acme/widgets/pull/235',
    'https://github.com/acme/widgets/issues/234',
  ];

  for (const htmlUrl of invalidDependencyUrls) {
    const blocked = rawIssue(236, { issue_dependencies_summary: { total_blocked_by: 1 } });
    const prerequisite = rawIssue(235);
    const dependencyEntry = { number: 235, html_url: htmlUrl };
    assert.throws(() => fetchIssueSnapshot({
      repository: 'acme/widgets',
      _spawnImpl: spawnFor({
        'api --paginate --slurp repos/acme/widgets/issues?state=all&per_page=100': response([[blocked, prerequisite]]),
        'api --paginate --slurp repos/acme/widgets/issues/236/dependencies/blocked_by': response([[dependencyEntry]]),
      }, []),
    }), /dependency.*URL|dependency.*repository|dependency.*number/i);
  }
});
