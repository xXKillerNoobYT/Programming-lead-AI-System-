// WEI-647 — DevLead orchestrator routing classifier.
const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, SPECIALISTS } = require('../scripts/devlead-route.js');

test('area:ui label → Coder-Frontend', () => {
  const r = classify({ labels: ['area:ui'], title: 'Dashboard tweak' });
  assert.equal(r.specialist, 'Coder-Frontend');
  assert.equal(r.agentId, SPECIALISTS['Coder-Frontend']);
});

test('area:backend label → Coder-Backend', () => {
  const r = classify({ labels: ['area:backend'], title: 'MCP route' });
  assert.equal(r.specialist, 'Coder-Backend');
});

test('area:test label → Tester', () => {
  const r = classify({ labels: ['area:test'] });
  assert.equal(r.specialist, 'Tester');
});

test('type:bug takes priority over area:ui (regression-test first)', () => {
  const r = classify({ labels: ['type:bug', 'area:ui'] });
  assert.equal(r.specialist, 'Tester');
  assert.match(r.reason, /regression test/);
});

test('area:docs → DevLead self-handle', () => {
  const r = classify({ labels: ['area:docs'] });
  assert.equal(r.specialist, 'DevLead');
});

test('no labels → DevLead fallback', () => {
  const r = classify({ labels: [], title: 'Misc' });
  assert.equal(r.specialist, 'DevLead');
});

test('mismatched/unknown labels → DevLead fallback', () => {
  const r = classify({ labels: ['priority:high', 'phase:2'] });
  assert.equal(r.specialist, 'DevLead');
});

test('title-encoded area:ui classifies when labels[] empty', () => {
  const r = classify({ labels: [], title: 'area:ui — dashboard tweak' });
  assert.equal(r.specialist, 'Coder-Frontend');
});

test('title-encoded area:backend classifies when labels[] empty', () => {
  const r = classify({ labels: [], title: 'area:backend — MCP route cleanup' });
  assert.equal(r.specialist, 'Coder-Backend');
});

test('title-encoded type:bug keeps regression-test priority when labels[] empty', () => {
  const r = classify({ labels: [], title: 'type:bug area:backend — heartbeat crash' });
  assert.equal(r.specialist, 'Tester');
  assert.match(r.reason, /regression test/);
});

test('description prose alone does NOT classify (avoids self-match on docs)', () => {
  // An issue that describes the routing table in its body must not classify itself.
  const r = classify({ labels: [], title: 'L9: orchestrator routing', description: 'Mapping: area:ui -> Coder-Frontend; type:bug -> Tester' });
  assert.equal(r.specialist, 'DevLead');
});

test('object-shaped labels (name field) supported', () => {
  const r = classify({ labels: [{ name: 'area:backend' }], title: 'X' });
  assert.equal(r.specialist, 'Coder-Backend');
});

test('SPECIALISTS map exposes the four executors + DevLead/CTO fallback', () => {
  for (const k of ['Coder-Frontend', 'Coder-Backend', 'Tester', 'Reviewer', 'CTO']) {
    assert.ok(SPECIALISTS[k], `missing ${k}`);
  }
});
