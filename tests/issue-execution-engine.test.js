const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  POLICY_VERSION,
  canonicalJson,
  validateSnapshot,
  evaluateCandidates,
  createExecutionDecision,
} = require('../lib/issue-execution-engine');

const REQUIRED_BODY = `
## Goal
Ship the selected unit of work.

## Dependencies
None.

## Acceptance criteria
- [ ] The behavior is delivered.

## Verification and gates
- [ ] npm test passes.

## Completion evidence
- [ ] Link the pull request.
`;

function issue(number, overrides = {}) {
  return {
    number,
    title: `Issue ${number}`,
    url: `https://github.com/acme/widgets/issues/${number}`,
    state: 'OPEN',
    body: REQUIRED_BODY,
    labels: ['type:task', 'status:backlog'],
    createdAt: `2026-08-${String(Math.min(number, 28)).padStart(2, '0')}T00:00:00.000Z`,
    updatedAt: '2026-08-23T00:00:00.000Z',
    parentNumber: null,
    childNumbers: [],
    blockedByNumbers: [],
    ...overrides,
  };
}

function snapshot(work = []) {
  const root = issue(210, { title: 'Root', labels: ['type:epic', 'status:backlog'], childNumbers: [211], body: '' });
  const horizon = issue(211, {
    title: 'R1',
    labels: ['type:epic', 'status:backlog'],
    parentNumber: 210,
    childNumbers: work.filter((item) => item.parentNumber == null || item.parentNumber === 211).map((item) => item.number),
    body: '',
  });
  return {
    schemaVersion: 1,
    repository: 'acme/widgets',
    observedAt: '2026-08-23T12:00:00.000Z',
    issues: [root, horizon, ...work.map((item) => ({ ...item, parentNumber: item.parentNumber ?? 211 }))],
  };
}

test('selects a ready R1 leaf and creates the complete execution packet', () => {
  const decision = createExecutionDecision(snapshot([issue(236)]), undefined, () => new Date('2026-08-23T13:00:00.000Z'));

  assert.equal(POLICY_VERSION, 'r1-preview-v1');
  assert.equal(decision.kind, 'execution-packet');
  assert.equal(decision.mode, 'preview');
  assert.equal(decision.issue.number, 236);
  assert.deepEqual(decision.hierarchy.map((entry) => entry.number), [210, 211]);
  assert.equal(decision.goal, 'Ship the selected unit of work.');
  assert.deepEqual(decision.acceptanceCriteria, ['The behavior is delivered.']);
  assert.deepEqual(decision.requiredGates, ['npm test passes.']);
  assert.deepEqual(decision.evidenceRequirements, ['Link the pull request.']);
  assert.match(decision.packetHash, /^sha256:[a-f0-9]{64}$/);
});

test('excludes non-leaf, epic, active, needs-user, blocked, failed-gate, and future-horizon Issues', () => {
  const parent = issue(220, { childNumbers: [221, 222, 223, 224, 225, 226] });
  const child = issue(221, { parentNumber: 220 });
  const epic = issue(222, { parentNumber: 220, labels: ['type:epic', 'status:backlog'] });
  const active = issue(223, { parentNumber: 220, labels: ['type:task', 'status:backlog', 'status:in-progress'] });
  const needsUser = issue(224, { parentNumber: 220, labels: ['type:task', 'status:needs-user'] });
  const blocked = issue(225, { parentNumber: 220, labels: ['type:task', 'status:blocked'] });
  const failedGate = issue(226, { parentNumber: 220, labels: ['type:task', 'status:backlog', 'gate:qa:failed'] });
  const r2 = issue(227, { parentNumber: 212 });
  const r2Horizon = issue(212, { title: 'R2', labels: ['type:epic', 'status:backlog'], parentNumber: 211, childNumbers: [227], body: '' });
  const data = snapshot([parent, child, epic, active, needsUser, blocked, failedGate, r2Horizon]);
  data.issues.push(r2);

  const result = evaluateCandidates(data);

  assert.deepEqual(result.candidates, [child]);
  assert.match(result.exclusions[220].join(' '), /children/i);
  assert.match(result.exclusions[222].join(' '), /epic/i);
  assert.match(result.exclusions[223].join(' '), /status/i);
  assert.match(result.exclusions[224].join(' '), /status/i);
  assert.match(result.exclusions[225].join(' '), /status/i);
  assert.match(result.exclusions[226].join(' '), /failed/i);
  assert.match(result.exclusions[227].join(' '), /horizon/i);
});

test('requires native and declared dependencies to be closed and rejects contradictory declarations', () => {
  const groupOne = issue(229, { childNumbers: [230, 231, 232, 233, 234, 235] });
  const groupTwo = issue(228, { childNumbers: [236] });
  const nativeOpen = issue(230, { parentNumber: 229, state: 'OPEN', labels: ['type:task', 'status:blocked'] });
  const nativeBlocked = issue(231, { parentNumber: 229, blockedByNumbers: [230] });
  const declaredOpen = issue(232, { parentNumber: 229, state: 'OPEN', labels: ['type:task', 'status:blocked'] });
  const declaredBlocked = issue(233, { parentNumber: 229, body: REQUIRED_BODY.replace('None.', 'Depends on: #232') });
  const closed = issue(234, { parentNumber: 229, state: 'CLOSED' });
  const eligible = issue(235, { parentNumber: 229, blockedByNumbers: [234], body: REQUIRED_BODY.replace('None.', 'Depends on: #234') });
  const contradiction = issue(236, { parentNumber: 228, blockedByNumbers: [234], body: REQUIRED_BODY.replace('None.', 'Depends on: #230') });
  const data = snapshot([groupOne, groupTwo, nativeOpen, nativeBlocked, declaredOpen, declaredBlocked, closed, eligible, contradiction]);

  const result = evaluateCandidates(data);

  assert.deepEqual(result.candidates.map((item) => item.number), [235]);
  assert.match(result.exclusions[231].join(' '), /open dependency/i);
  assert.match(result.exclusions[233].join(' '), /open dependency/i);
  assert.match(result.exclusions[236].join(' '), /contradict/i);
});

test('recognizes open dependencies declared with Markdown list and checklist prefixes', () => {
  const declarations = [
    '- Depends on: #299',
    '* Depends on: #299',
    '+ Blocked by: #299',
    '- [ ] Depends on: #299',
    '- [x] Blocked by: #299',
    '1. Depends on: #299',
    '1) Blocked by: #299',
  ];

  for (const declaration of declarations) {
    const openDependency = issue(299, { labels: ['type:task', 'status:blocked'] });
    const target = issue(300, { body: REQUIRED_BODY.replace('None.', declaration) });
    const result = evaluateCandidates(snapshot([openDependency, target]));

    assert.match(result.exclusions[300].join(' '), /open dependency #299/i, declaration);
  }
});

test('does not infer dependencies from ordinary list-item prose', () => {
  const mentioned = issue(299, { labels: ['type:task', 'status:blocked'] });
  const target = issue(300, {
    body: REQUIRED_BODY.replace('None.', '- This work depends on: #299 for historical context only.'),
  });

  const result = evaluateCandidates(snapshot([mentioned, target]));

  assert.deepEqual(result.candidates.map((item) => item.number), [300]);
  assert.equal(result.exclusions[300], undefined);
});

test('orders eligible leaves by priority, then creation time, then Issue number', () => {
  const low = issue(240, { labels: ['type:task', 'status:backlog', 'priority:low'], createdAt: '2026-08-01T00:00:00.000Z' });
  const highLate = issue(241, { labels: ['type:task', 'status:backlog', 'priority:high'], createdAt: '2026-08-03T00:00:00.000Z' });
  const highEarlyHigherNumber = issue(242, { labels: ['type:task', 'status:backlog', 'priority:high'], createdAt: '2026-08-02T00:00:00.000Z' });
  const highEarlyLowerNumber = issue(239, { labels: ['type:task', 'status:backlog', 'priority:high'], createdAt: '2026-08-02T00:00:00.000Z' });

  const result = evaluateCandidates(snapshot([low, highLate, highEarlyHigherNumber, highEarlyLowerNumber]));

  assert.deepEqual(result.candidates.map((item) => item.number), [239, 242, 241, 240]);
});

test('emits a deterministic no-action decision with exclusion reasons when no candidate is eligible', () => {
  const decision = createExecutionDecision(snapshot([issue(250, { labels: ['type:task', 'status:needs-user'] })]), undefined, () => new Date('2026-08-23T13:00:00.000Z'));

  assert.equal(decision.kind, 'no-action');
  assert.equal(decision.mode, 'preview');
  assert.deepEqual(Object.keys(decision.exclusions), ['210', '211', '250']);
  assert.match(decision.exclusions[250].join(' '), /status/i);
});

test('fails closed for duplicate IDs, missing references, cycles, and inconsistent parent-child relationships', () => {
  const duplicate = snapshot([issue(260), issue(260)]);
  const missing = snapshot([issue(261, { blockedByNumbers: [999] })]);
  const cycle = snapshot([issue(262, { parentNumber: 263, childNumbers: [263] }), issue(263, { parentNumber: 262, childNumbers: [262] })]);
  const inconsistent = snapshot([issue(264)]);
  inconsistent.issues.find((item) => item.number === 211).childNumbers.push(264);
  inconsistent.issues.find((item) => item.number === 264).parentNumber = 210;
  const detachedHorizon = snapshot([issue(265)]);
  detachedHorizon.issues.find((item) => item.number === 210).childNumbers = [];
  detachedHorizon.issues.find((item) => item.number === 211).parentNumber = null;

  for (const invalid of [duplicate, missing, cycle, inconsistent, detachedHorizon]) {
    assert.throws(() => validateSnapshot(invalid), /snapshot|duplicate|reference|cycle|relationship/i);
    assert.throws(() => createExecutionDecision(invalid), /snapshot|duplicate|reference|cycle|relationship/i);
  }
});

test('allows six open children plus closed children, but fails closed with seven open children', () => {
  const openChildren = [291, 292, 293, 294, 295, 296].map((number) => issue(number, { parentNumber: 290 }));
  const closedChild = issue(297, { parentNumber: 290, state: 'CLOSED' });
  const parent = issue(290, { childNumbers: [...openChildren.map((child) => child.number), closedChild.number] });
  const allowed = snapshot([parent, ...openChildren, closedChild]);
  const tooManyOpen = structuredClone(allowed);
  tooManyOpen.issues.find((item) => item.number === 297).state = 'OPEN';

  assert.doesNotThrow(() => validateSnapshot(allowed));
  assert.throws(() => validateSnapshot(tooManyOpen), /more than six open children/i);
});

test('keeps packet hashes stable across clocks and observation timestamps, but changes them with content', () => {
  const first = snapshot([issue(270)]);
  const second = structuredClone(first);
  second.observedAt = '2026-08-24T12:00:00.000Z';
  const changed = structuredClone(first);
  changed.issues.find((item) => item.number === 270).title = 'Changed work';

  const one = createExecutionDecision(first, undefined, () => new Date('2026-08-23T13:00:00.000Z'));
  const two = createExecutionDecision(second, undefined, () => new Date('2026-08-24T13:00:00.000Z'));
  const three = createExecutionDecision(changed, undefined, () => new Date('2026-08-23T13:00:00.000Z'));

  assert.equal(one.packetHash, two.packetHash);
  assert.notEqual(one.packetHash, three.packetHash);
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}');
});

test('makes only a leaf with an empty required section ineligible when the snapshot is otherwise valid', () => {
  const malformed = issue(280, { body: REQUIRED_BODY.replace('Ship the selected unit of work.', '') });
  const ready = issue(281);
  const result = evaluateCandidates(snapshot([malformed, ready]));

  assert.deepEqual(result.candidates.map((item) => item.number), [281]);
  assert.match(result.exclusions[280].join(' '), /goal.*empty/i);
});

test('preserves the complete first Goal paragraph while excluding later paragraphs', () => {
  const body = REQUIRED_BODY.replace(
    'Ship the selected unit of work.',
    'Ship the selected unit of work\nwith its complete wrapped paragraph.\n\nThis later paragraph is not part of the packet goal.',
  );
  const decision = createExecutionDecision(snapshot([issue(298, { body })]));

  assert.equal(decision.goal, 'Ship the selected unit of work\nwith its complete wrapped paragraph.');
});
