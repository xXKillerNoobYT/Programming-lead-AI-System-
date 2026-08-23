'use strict';

const { safeSpawn } = require('./guardrails');

const REPOSITORY_PATTERN = /^[^/\s]+\/[^/\s]+$/;

function sourceError(message) {
  return new Error(`GitHub issue source: ${message}`);
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validTimestamp(value) {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function validateRepository(repository) {
  if (typeof repository !== 'string' || !REPOSITORY_PATTERN.test(repository)) {
    throw sourceError('repository must be an explicit owner/repository string');
  }
  return repository;
}

function stdoutText(result, context) {
  if (!result || result.status !== 0) {
    const stderr = result && result.stderr != null ? String(result.stderr).trim() : '';
    throw sourceError(`${context}: gh failed${stderr ? `: ${stderr}` : ''}`);
  }
  if (typeof result.stdout !== 'string' && !Buffer.isBuffer(result.stdout)) {
    throw sourceError(`${context}: gh returned no readable stdout`);
  }
  return String(result.stdout);
}

function parseJson(result, context) {
  const text = stdoutText(result, context);
  try {
    return JSON.parse(text);
  } catch {
    throw sourceError(`${context}: invalid JSON`);
  }
}

function runGh(args, options, context) {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
    throw sourceError('internal gh arguments must be a string array');
  }
  return safeSpawn('gh', args, {
    allowCmds: ['gh'],
    _spawnImpl: options && options._spawnImpl,
    spawnOptions: { encoding: 'utf8' },
  });
}

function parseGitHubIssueUrl(url, fieldName) {
  const label = fieldName || 'issue';
  if (typeof url !== 'string' || url.length === 0) throw sourceError(`${label} URL is invalid`);
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw sourceError(`${label} URL is invalid`);
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) {
    throw sourceError(`${label} URL is not a GitHub issue URL`);
  }
  let match;
  if (parsed.hostname === 'github.com') {
    match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)$/);
  } else if (parsed.hostname === 'api.github.com') {
    match = parsed.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)$/);
  }
  if (!match || !positiveInteger(Number(match[3]))) {
    throw sourceError(`${label} URL is not a GitHub issue URL`);
  }
  return {
    number: Number(match[3]),
    repository: `${match[1]}/${match[2]}`,
    hostname: parsed.hostname,
  };
}

function sameRepository(left, right) {
  return left.toLowerCase() === right.toLowerCase();
}

function validateIssueUrl(url, rawNumber, repository, fieldName, requireWebUrl) {
  const parsed = parseGitHubIssueUrl(url, fieldName);
  if (requireWebUrl && parsed.hostname !== 'github.com') {
    throw sourceError(`${fieldName} must be a GitHub web Issue URL`);
  }
  if (rawNumber !== undefined && parsed.number !== rawNumber) {
    throw sourceError(`${fieldName} Issue number does not match #${rawNumber}`);
  }
  if (repository && !sameRepository(parsed.repository, repository)) {
    throw sourceError(`${fieldName} repository does not match ${repository}`);
  }
  return parsed;
}

function parseIssueNumberFromUrl(url) {
  return parseGitHubIssueUrl(url, 'parent issue').number;
}

function summaryTotal(raw, key) {
  const summary = raw && raw[key];
  const totalKey = key === 'sub_issues_summary' ? 'total' : 'total_blocked_by';
  if (!summary || typeof summary !== 'object' || !nonNegativeInteger(summary[totalKey])) {
    throw sourceError(`issue #${raw && raw.number ? raw.number : '?'} ${key} is malformed`);
  }
  return summary[totalKey];
}

function normalizeIssue(raw, repository) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw sourceError('issue payload is malformed');
  if (!positiveInteger(raw.number)) throw sourceError('issue number is malformed');
  if (typeof raw.title !== 'string') throw sourceError(`issue #${raw.number} title is malformed`);
  if (typeof raw.html_url !== 'string' || raw.html_url.length === 0) throw sourceError(`issue #${raw.number} html_url is malformed`);
  if (typeof raw.state !== 'string' || !['open', 'closed'].includes(raw.state.toLowerCase())) {
    throw sourceError(`issue #${raw.number} state is malformed`);
  }
  if (raw.body !== null && typeof raw.body !== 'string') throw sourceError(`issue #${raw.number} body is malformed`);
  if (!Array.isArray(raw.labels) || raw.labels.some((label) => !label || typeof label.name !== 'string' || label.name.trim() === '')) {
    throw sourceError(`issue #${raw.number} labels are malformed`);
  }
  if (!validTimestamp(raw.created_at)) throw sourceError(`issue #${raw.number} created_at is malformed`);
  if (!validTimestamp(raw.updated_at)) throw sourceError(`issue #${raw.number} updated_at is malformed`);
  if (raw.parent_issue_url !== null && raw.parent_issue_url !== undefined
    && (typeof raw.parent_issue_url !== 'string' || raw.parent_issue_url.length === 0)) {
    throw sourceError(`issue #${raw.number} parent_issue_url is malformed`);
  }
  summaryTotal(raw, 'sub_issues_summary');
  summaryTotal(raw, 'issue_dependencies_summary');
  validateIssueUrl(raw.html_url, raw.number, repository, `issue #${raw.number} html_url`, true);
  const parent = raw.parent_issue_url === null || raw.parent_issue_url === undefined
    ? null
    : validateIssueUrl(raw.parent_issue_url, undefined, repository, `issue #${raw.number} parent_issue_url`, false);

  return {
    number: raw.number,
    title: raw.title,
    url: raw.html_url,
    state: raw.state.toUpperCase(),
    body: raw.body || '',
    labels: [...new Set(raw.labels.map((label) => label.name.trim().toLowerCase()))],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    parentNumber: parent ? parent.number : null,
    childNumbers: [],
    blockedByNumbers: [],
  };
}

function resolveRepository(options = {}) {
  if (options.repository !== undefined && options.repository !== null) {
    return validateRepository(options.repository);
  }
  const payload = parseJson(
    runGh(['repo', 'view', '--json', 'nameWithOwner'], options, 'repository resolution'),
    'repository resolution',
  );
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || typeof payload.nameWithOwner !== 'string') {
    throw sourceError('repository resolution returned a malformed payload');
  }
  return validateRepository(payload.nameWithOwner);
}

function observedAt(now) {
  const candidate = typeof now === 'function' ? now() : (now === undefined ? new Date() : now);
  const date = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(date.getTime())) throw sourceError('now is invalid');
  return date.toISOString();
}

function readPages(repository, options) {
  const payload = parseJson(
    runGh(['api', '--paginate', '--slurp', `repos/${repository}/issues?state=all&per_page=100`], options, 'issue retrieval'),
    'issue retrieval',
  );
  if (!Array.isArray(payload) || payload.some((page) => !Array.isArray(page))) {
    throw sourceError('issue retrieval expected paginated array pages');
  }
  return payload.flat();
}

function dependencyNumbers(repository, issueNumber, expectedTotal, options) {
  if (expectedTotal === 0) return [];
  const payload = parseJson(
    runGh(['api', '--paginate', '--slurp', `repos/${repository}/issues/${issueNumber}/dependencies/blocked_by`], options, `dependency retrieval for #${issueNumber}`),
    `dependency retrieval for #${issueNumber}`,
  );
  if (!Array.isArray(payload) || payload.some((page) => !Array.isArray(page))) {
    throw sourceError(`dependency retrieval for #${issueNumber} expected paginated array pages`);
  }
  const entries = payload.flat();
  if (entries.length !== expectedTotal) {
    throw sourceError(`dependency count mismatch for #${issueNumber}: expected ${expectedTotal}, received ${entries.length}`);
  }
  const numbers = entries.map((entry) => {
    if (!entry || typeof entry !== 'object' || !positiveInteger(entry.number)) {
      throw sourceError(`dependency retrieval for #${issueNumber} contains a malformed Issue entry`);
    }
    validateIssueUrl(entry.html_url, entry.number, repository, `dependency entry for #${issueNumber}`, true);
    return entry.number;
  });
  if (new Set(numbers).size !== numbers.length) {
    throw sourceError(`dependency retrieval for #${issueNumber} contains malformed or duplicate issue numbers`);
  }
  return numbers.sort((left, right) => left - right);
}

function fetchIssueSnapshot(options = {}) {
  const repository = resolveRepository(options);
  const rawIssues = readPages(repository, options)
    .filter((raw) => !raw || raw.pull_request === undefined || raw.pull_request === null);
  const issues = rawIssues.map((raw) => normalizeIssue(raw, repository));
  const byNumber = new Map();
  for (const issue of issues) {
    if (byNumber.has(issue.number)) throw sourceError(`duplicate issue number #${issue.number}`);
    byNumber.set(issue.number, issue);
  }

  for (const issue of issues) {
    if (issue.parentNumber === null) continue;
    const parent = byNumber.get(issue.parentNumber);
    if (!parent) throw sourceError(`issue #${issue.number} has missing parent #${issue.parentNumber}`);
    parent.childNumbers.push(issue.number);
  }
  for (const issue of issues) issue.childNumbers.sort((left, right) => left - right);

  for (let index = 0; index < rawIssues.length; index += 1) {
    const raw = rawIssues[index];
    const issue = issues[index];
    const expectedChildren = summaryTotal(raw, 'sub_issues_summary');
    if (issue.childNumbers.length !== expectedChildren) {
      throw sourceError(`child count mismatch for #${issue.number}: expected ${expectedChildren}, received ${issue.childNumbers.length}`);
    }
    const expectedDependencies = summaryTotal(raw, 'issue_dependencies_summary');
    issue.blockedByNumbers = dependencyNumbers(repository, issue.number, expectedDependencies, options);
    for (const dependencyNumber of issue.blockedByNumbers) {
      if (!byNumber.has(dependencyNumber)) {
        throw sourceError(`issue #${issue.number} has missing dependency #${dependencyNumber}`);
      }
    }
  }

  return {
    schemaVersion: 1,
    repository,
    observedAt: observedAt(options.now),
    issues,
  };
}

module.exports = {
  resolveRepository,
  fetchIssueSnapshot,
  normalizeIssue,
  parseIssueNumberFromUrl,
};
