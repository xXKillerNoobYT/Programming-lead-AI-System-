const { createHash } = require('node:crypto');

const POLICY_VERSION = 'r1-preview-v1';
const DEFAULT_POLICY = Object.freeze({
  rootIssueNumber: 210,
  horizonIssueNumber: 211,
  excludedHorizonIssueNumbers: [212, 213, 214],
});
const PRIORITY_ORDER = Object.freeze({ urgent: 0, high: 1, medium: 2, low: 3 });
const REQUIRED_SECTIONS = Object.freeze({
  goal: ['goal', 'objective'],
  dependencies: ['dependencies', 'preconditions'],
  acceptanceCriteria: ['acceptance criteria'],
  requiredGates: ['verification and gates', 'gates', 'gates and stop conditions'],
  evidenceRequirements: ['completion evidence', 'evidence and handoff'],
});

function policyFor(policy) {
  const result = { ...DEFAULT_POLICY, ...(policy || {}) };
  if (!Array.isArray(result.excludedHorizonIssueNumbers)) {
    throw new Error('policy excludedHorizonIssueNumbers must be an array');
  }
  return result;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function assertSnapshot(condition, message) {
  if (!condition) throw new Error(`invalid snapshot: ${message}`);
}

function declaredDependencies(body) {
  const listPrefix = String.raw`(?:(?:[-*+]\s+(?:\[[ xX]\]\s*)?)|(?:\d+[.)]\s+))?`;
  const pattern = new RegExp(String.raw`(?:^|\n)\s*${listPrefix}(?:depends\s+on|blocked\s+by)\s*:\s*([^\n]+)`, 'gim');
  const matches = [...body.matchAll(pattern)];
  return [...new Set(matches.flatMap((match) => [...match[1].matchAll(/#(\d+)/g)].map((ref) => Number(ref[1]))))].sort((a, b) => a - b);
}

function validateSnapshot(snapshot, policy) {
  const effectivePolicy = policyFor(policy);
  assertSnapshot(snapshot && typeof snapshot === 'object', 'must be an object');
  assertSnapshot(snapshot.schemaVersion === 1, 'schemaVersion must be 1');
  assertSnapshot(typeof snapshot.repository === 'string' && snapshot.repository.includes('/'), 'repository is required');
  assertSnapshot(typeof snapshot.observedAt === 'string' && !Number.isNaN(Date.parse(snapshot.observedAt)), 'observedAt is invalid');
  assertSnapshot(Array.isArray(snapshot.issues), 'issues must be an array');

  const byNumber = new Map();
  for (const issue of snapshot.issues) {
    assertSnapshot(issue && typeof issue === 'object', 'issue must be an object');
    assertSnapshot(isPositiveInteger(issue.number), 'issue number must be a positive integer');
    assertSnapshot(!byNumber.has(issue.number), `duplicate issue number ${issue.number}`);
    assertSnapshot(typeof issue.title === 'string', `issue #${issue.number} title is invalid`);
    assertSnapshot(typeof issue.url === 'string' && issue.url.length > 0, `issue #${issue.number} url is invalid`);
    assertSnapshot(typeof issue.state === 'string' && ['OPEN', 'CLOSED'].includes(issue.state.toUpperCase()), `issue #${issue.number} state is invalid`);
    assertSnapshot(typeof issue.body === 'string', `issue #${issue.number} body is invalid`);
    assertSnapshot(Array.isArray(issue.labels) && issue.labels.every((label) => typeof label === 'string'), `issue #${issue.number} labels are invalid`);
    assertSnapshot(typeof issue.createdAt === 'string' && !Number.isNaN(Date.parse(issue.createdAt)), `issue #${issue.number} createdAt is invalid`);
    assertSnapshot(typeof issue.updatedAt === 'string' && !Number.isNaN(Date.parse(issue.updatedAt)), `issue #${issue.number} updatedAt is invalid`);
    assertSnapshot(issue.parentNumber === null || issue.parentNumber === undefined || isPositiveInteger(issue.parentNumber), `issue #${issue.number} parent is invalid`);
    assertSnapshot(Array.isArray(issue.childNumbers) && issue.childNumbers.every(isPositiveInteger), `issue #${issue.number} children are invalid`);
    assertSnapshot(Array.isArray(issue.blockedByNumbers) && issue.blockedByNumbers.every(isPositiveInteger), `issue #${issue.number} dependencies are invalid`);
    assertSnapshot(new Set(issue.childNumbers).size === issue.childNumbers.length, `issue #${issue.number} has duplicate children`);
    assertSnapshot(new Set(issue.blockedByNumbers).size === issue.blockedByNumbers.length, `issue #${issue.number} has duplicate dependencies`);
    byNumber.set(issue.number, issue);
  }

  assertSnapshot(byNumber.has(effectivePolicy.rootIssueNumber), `root issue #${effectivePolicy.rootIssueNumber} is missing`);
  assertSnapshot(byNumber.has(effectivePolicy.horizonIssueNumber), `horizon issue #${effectivePolicy.horizonIssueNumber} is missing`);

  for (const issue of byNumber.values()) {
    if (issue.parentNumber != null) {
      const parent = byNumber.get(issue.parentNumber);
      assertSnapshot(parent, `issue #${issue.number} has missing parent #${issue.parentNumber}`);
      assertSnapshot(parent.childNumbers.includes(issue.number), `parent-child relationship disagrees for #${issue.number}`);
    }
    for (const childNumber of issue.childNumbers) {
      const child = byNumber.get(childNumber);
      assertSnapshot(child, `issue #${issue.number} has missing child #${childNumber}`);
      assertSnapshot(child.parentNumber === issue.number, `parent-child relationship disagrees for #${childNumber}`);
    }
    const openChildCount = issue.childNumbers.filter((childNumber) => byNumber.get(childNumber).state.toUpperCase() === 'OPEN').length;
    assertSnapshot(openChildCount <= 6, `issue #${issue.number} has more than six open children`);
    for (const dependencyNumber of issue.blockedByNumbers) {
      assertSnapshot(byNumber.has(dependencyNumber), `issue #${issue.number} has missing dependency #${dependencyNumber}`);
    }
    for (const dependencyNumber of declaredDependencies(issue.body)) {
      assertSnapshot(byNumber.has(dependencyNumber), `issue #${issue.number} declares missing dependency #${dependencyNumber}`);
    }
  }

  for (const start of byNumber.values()) {
    const visited = new Set();
    let current = start;
    while (current.parentNumber != null) {
      assertSnapshot(!visited.has(current.number), `parent cycle includes #${current.number}`);
      visited.add(current.number);
      current = byNumber.get(current.parentNumber);
    }
  }
  assertSnapshot(
    isDescendantOf(byNumber.get(effectivePolicy.horizonIssueNumber), effectivePolicy.rootIssueNumber, byNumber),
    `horizon #${effectivePolicy.horizonIssueNumber} is not a descendant of root #${effectivePolicy.rootIssueNumber}`,
  );

  return { policy: effectivePolicy, byNumber };
}

function headingSections(body) {
  const matches = [...body.matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)];
  const found = {};
  for (let index = 0; index < matches.length; index += 1) {
    const heading = matches[index][1].trim().toLowerCase();
    const contentStart = matches[index].index + matches[index][0].length;
    const contentEnd = index + 1 < matches.length ? matches[index + 1].index : body.length;
    found[heading] = body.slice(contentStart, contentEnd).trim();
  }
  return found;
}

function firstSection(sections, aliases) {
  for (const alias of aliases) {
    if (Object.hasOwn(sections, alias)) return sections[alias];
  }
  return undefined;
}

function cleanList(content) {
  if (!content) return [];
  return content.split(/\r?\n/)
    .map((line) => line.trim().replace(/^(?:[-*+]\s+|\d+[.)]\s+)(?:\[[ xX]\]\s*)?/, '').trim())
    .filter(Boolean);
}

function bodyDetails(issue) {
  const sections = headingSections(issue.body);
  const values = {};
  const reasons = [];
  for (const [key, aliases] of Object.entries(REQUIRED_SECTIONS)) {
    const content = firstSection(sections, aliases);
    if (!content) reasons.push(`required ${key} section is missing or empty`);
    values[key] = content || '';
  }
  const goal = values.goal.split(/\r?\n\s*\r?\n/)[0].trim();
  if (!goal && !reasons.some((reason) => reason.includes('goal'))) reasons.push('required goal section is missing or empty');
  const acceptanceCriteria = cleanList(values.acceptanceCriteria);
  const requiredGates = cleanList(values.requiredGates);
  const evidenceRequirements = cleanList(values.evidenceRequirements);
  if (values.acceptanceCriteria && acceptanceCriteria.length === 0) reasons.push('required acceptanceCriteria section is missing or empty');
  if (values.requiredGates && requiredGates.length === 0) reasons.push('required requiredGates section is missing or empty');
  if (values.evidenceRequirements && evidenceRequirements.length === 0) reasons.push('required evidenceRequirements section is missing or empty');
  return {
    reasons,
    goal,
    acceptanceCriteria,
    requiredGates,
    evidenceRequirements,
    declaredDependencies: declaredDependencies(issue.body),
    constraints: values.dependencies && !/^none\.?$/i.test(values.dependencies) ? cleanList(values.dependencies).filter((item) => !/^(?:depends\s+on|blocked\s+by)\s*:/i.test(item)) : [],
  };
}

function isDescendantOf(issue, ancestorNumber, byNumber) {
  const seen = new Set();
  let current = issue;
  while (current.parentNumber != null) {
    if (seen.has(current.number)) return false;
    seen.add(current.number);
    if (current.parentNumber === ancestorNumber) return true;
    current = byNumber.get(current.parentNumber);
  }
  return false;
}

function ancestors(issue, byNumber) {
  const result = [];
  let current = issue;
  while (current.parentNumber != null) {
    current = byNumber.get(current.parentNumber);
    result.unshift({ number: current.number, title: current.title, url: current.url });
  }
  return result;
}

function labelsFor(issue) {
  return issue.labels.map((label) => label.toLowerCase());
}

function priorityFor(issue) {
  const label = labelsFor(issue).find((item) => item.startsWith('priority:'));
  const value = label && label.slice('priority:'.length);
  return Object.hasOwn(PRIORITY_ORDER, value) ? PRIORITY_ORDER[value] : 4;
}

function candidateReasons(issue, context) {
  const { byNumber, policy } = context;
  const labels = labelsFor(issue);
  const reasons = [];
  if (!isDescendantOf(issue, policy.horizonIssueNumber, byNumber)) reasons.push('outside allowed horizon');
  if (policy.excludedHorizonIssueNumbers.some((number) => isDescendantOf(issue, number, byNumber) || issue.number === number)) reasons.push('inside excluded future horizon');
  if (issue.state.toUpperCase() !== 'OPEN') reasons.push('issue is not open');
  if (issue.childNumbers.length > 0) reasons.push('issue has children');
  if (labels.includes('type:epic')) reasons.push('issue is an epic');
  const statusLabels = labels.filter((label) => label.startsWith('status:'));
  if (statusLabels.length !== 1 || statusLabels[0] !== 'status:backlog') reasons.push('issue does not have exactly one ready status');
  if (labels.some((label) => /^gate:.*:failed$/.test(label) || label === 'gate:failed' || label === 'security:veto')) reasons.push('issue has a failed gate or veto');

  const details = bodyDetails(issue);
  reasons.push(...details.reasons);
  const native = [...issue.blockedByNumbers].sort((a, b) => a - b);
  const declared = details.declaredDependencies;
  if (native.length && declared.length && (native.length !== declared.length || native.some((number, index) => number !== declared[index]))) {
    reasons.push('native and declared dependencies contradict');
  }
  const dependencies = [...new Set([...native, ...declared])].sort((a, b) => a - b);
  for (const number of dependencies) {
    if (byNumber.get(number).state.toUpperCase() !== 'CLOSED') reasons.push(`open dependency #${number}`);
  }
  return { reasons, details, dependencies };
}

function evaluateCandidates(snapshot, policy) {
  const context = validateSnapshot(snapshot, policy);
  const exclusions = {};
  const candidates = [];
  const detailsByNumber = new Map();
  for (const issue of snapshot.issues) {
    const result = candidateReasons(issue, context);
    detailsByNumber.set(issue.number, result);
    if (result.reasons.length) exclusions[issue.number] = [...new Set(result.reasons)].sort();
    else candidates.push(issue);
  }
  candidates.sort((left, right) => priorityFor(left) - priorityFor(right)
    || Date.parse(left.createdAt) - Date.parse(right.createdAt)
    || left.number - right.number);
  return { candidates, exclusions, context, detailsByNumber };
}

function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('canonical JSON does not support undefined or non-JSON values');
}

function isoNow(clock) {
  const value = typeof clock === 'function' ? clock() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('clock returned an invalid time');
  return date.toISOString();
}

function createExecutionDecision(snapshot, policy, clock) {
  const evaluated = evaluateCandidates(snapshot, policy);
  const { candidates, exclusions, context, detailsByNumber } = evaluated;
  const generatedAt = isoNow(clock);
  if (candidates.length === 0) {
    return {
      schemaVersion: 1,
      policyVersion: POLICY_VERSION,
      kind: 'no-action',
      mode: 'preview',
      generatedAt,
      source: {
        repository: snapshot.repository,
        observedAt: snapshot.observedAt,
        rootIssueNumber: context.policy.rootIssueNumber,
        horizonIssueNumber: context.policy.horizonIssueNumber,
      },
      exclusions,
    };
  }

  const issue = candidates[0];
  const details = detailsByNumber.get(issue.number).details;
  const dependencyNumbers = detailsByNumber.get(issue.number).dependencies;
  const packet = {
    schemaVersion: 1,
    policyVersion: POLICY_VERSION,
    kind: 'execution-packet',
    mode: 'preview',
    generatedAt,
    source: {
      repository: snapshot.repository,
      observedAt: snapshot.observedAt,
      rootIssueNumber: context.policy.rootIssueNumber,
      horizonIssueNumber: context.policy.horizonIssueNumber,
    },
    issue: {
      number: issue.number,
      title: issue.title,
      url: issue.url,
      labels: issue.labels,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    },
    hierarchy: ancestors(issue, context.byNumber),
    goal: details.goal,
    constraints: details.constraints,
    acceptanceCriteria: details.acceptanceCriteria,
    dependencies: dependencyNumbers.map((number) => {
      const dependency = context.byNumber.get(number);
      return { number, title: dependency.title, url: dependency.url, state: dependency.state };
    }),
    requiredGates: details.requiredGates,
    evidenceRequirements: details.evidenceRequirements,
  };
  const hashContent = { ...packet, source: { ...packet.source } };
  delete hashContent.generatedAt;
  delete hashContent.source.observedAt;
  packet.packetHash = `sha256:${createHash('sha256').update(canonicalJson(hashContent)).digest('hex')}`;
  return packet;
}

module.exports = {
  POLICY_VERSION,
  canonicalJson,
  createExecutionDecision,
  evaluateCandidates,
  validateSnapshot,
};
