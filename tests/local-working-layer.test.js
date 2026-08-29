'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(name) {
    return readFileSync(path.join(root, name), 'utf8');
}

function lineCount(text) {
    return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
}

test('active TODO stays bounded and points work back to canonical tasks', () => {
    const todo = read('TODO.md');
    assert.ok(lineCount(todo) <= 100, 'TODO.md must stay at or below 100 lines');
    assert.match(todo, /Never add an unlinked task/);
    assert.match(todo, /GitHub Issues and assigned Paperclip\/AI Hub tasks remain canonical/);
    assert.match(todo, /When work completes, move evidence and the final disposition to the canonical task/);
    assert.match(todo, /When work is deferred, return it to the canonical backlog/);
});

test('scratchpad stays bounded and defines promotion and rotation', () => {
    const scratchpad = read('SCRATCHPAD.md');
    assert.ok(lineCount(scratchpad) <= 2000, 'SCRATCHPAD.md must stay at or below 2,000 lines');
    assert.match(scratchpad, /## Promotion and rotation/);
    assert.match(scratchpad, /Promote durable decisions to `decision-log\.md`/);
    assert.match(scratchpad, /Delete resolved, disproven, duplicated, or stale notes/);
});

test('both local files prohibit sensitive material', () => {
    for (const name of ['TODO.md', 'SCRATCHPAD.md']) {
        const content = read(name);
        assert.match(content, /Never store secrets, credentials, tokens, customer data, personal data, or unredacted/,
            `${name} must carry the sensitive-data prohibition`);
    }
});
