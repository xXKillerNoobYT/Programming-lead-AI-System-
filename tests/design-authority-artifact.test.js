'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const VERSION = 'consolidated-candidate-v0.2.2';
const EXPECTED_BYTES = 79_369;
const EXPECTED_SHA256 =
    '544A6D22EA43EBA0F3D379D4E125353D2907D1FCC3B8C39116B8A0A66901AFFE';
const EXPECTED_GIT_BLOB_SHA1 = '92d2cb6f478aa649e736b8fe8a7bb5b944cfb5cf';
const ARTIFACT_REPOSITORY_PATH =
    'reports/design-authority/desktop/consolidated-candidate-v0.2.2/index.html';
const ARTIFACT_DIR = join(
    __dirname,
    '..',
    'reports',
    'design-authority',
    'desktop',
    VERSION,
);

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function gitBlobSha1(bytes) {
    return createHash('sha1')
        .update(`blob ${bytes.length}\0`)
        .update(bytes)
        .digest('hex');
}

function readPublishedEvidence() {
    const artifact = readFileSync(join(ARTIFACT_DIR, 'index.html'));
    const manifest = JSON.parse(
        readFileSync(join(ARTIFACT_DIR, 'manifest.json'), 'utf8'),
    );
    return { artifact, manifest };
}

test('published v0.2.2 desktop authority remains byte-identical to owner approval', () => {
    const { artifact, manifest } = readPublishedEvidence();

    assert.equal(artifact.length, EXPECTED_BYTES);
    assert.equal(sha256(artifact), EXPECTED_SHA256);
    assert.equal(manifest.artifact.version, VERSION);
    assert.equal(manifest.artifact.entrypoint, 'index.html');
    assert.equal(manifest.artifact.byte_size, EXPECTED_BYTES);
    assert.equal(manifest.artifact.sha256, EXPECTED_SHA256);
});

test('Git treats the approved artifact as raw bytes instead of normalizing text', () => {
    const result = execFileSync(
        'git',
        ['check-attr', 'text', '--', ARTIFACT_REPOSITORY_PATH],
        {
            cwd: join(__dirname, '..'),
            encoding: 'utf8',
        },
    ).trim();

    assert.equal(result, `${ARTIFACT_REPOSITORY_PATH}: text: unset`);
});

test('published evidence binds the exact owner approvals and preserves scope limits', () => {
    const { manifest } = readPublishedEvidence();

    assert.deepEqual(manifest.provenance.approval_permalinks, [
        'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/218#issuecomment-5389372090',
        'https://github.com/xXKillerNoobYT/Programming-lead-AI-System-/issues/225#issuecomment-5389372359',
    ]);
    assert.deepEqual(manifest.scope.approved, [
        'desktop-design-and-interaction-authority',
    ]);
    assert.deepEqual(manifest.scope.not_approved, [
        'mobile-design-authority',
        'accessibility-conformance',
        'production-implementation',
    ]);
    assert.deepEqual(manifest.scope.does_not_complete_issues, [224, 225]);
});

test('published evidence is content-addressed and fails closed for downstream use', () => {
    const { artifact, manifest } = readPublishedEvidence();

    assert.equal(gitBlobSha1(artifact), EXPECTED_GIT_BLOB_SHA1);
    assert.equal(manifest.artifact.git_blob_sha1, EXPECTED_GIT_BLOB_SHA1);
    assert.equal(
        manifest.artifact.git_blob_api_permalink,
        `https://api.github.com/repos/xXKillerNoobYT/Programming-lead-AI-System-/git/blobs/${EXPECTED_GIT_BLOB_SHA1}`,
    );
    assert.equal(manifest.immutability.artifact_bytes_must_not_change, true);
    assert.equal(
        manifest.immutability.changes_require_new_version_hash_and_approval,
        true,
    );
    assert.equal(manifest.consumption.verify_sha256_before_use, true);
    assert.equal(manifest.consumption.pin_version_and_sha256, true);
    assert.equal(manifest.consumption.do_not_infer_unapproved_scope, true);
});

test('published evidence discloses its self-contained viewer behavior', () => {
    const { manifest } = readPublishedEvidence();

    assert.equal(manifest.runtime.self_contained, true);
    assert.equal(manifest.runtime.external_network_dependencies_detected, false);
    assert.deepEqual(manifest.runtime.browser_storage, {
        kind: 'localStorage',
        key: 'devlead-v022-layout',
        transmitted: false,
    });
});
