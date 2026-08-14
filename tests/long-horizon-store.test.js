'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
    appendFileSync,
    existsSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    renameSync,
    rmSync,
    symlinkSync,
    unlinkSync,
    writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const {
    FileLongHorizonStore,
    openStore,
    migrateStore,
    rebuildIndex,
    verifyStore,
} = require('../lib/long-horizon/store.js');
const STORE_V1_FIXTURE = require('./fixtures/long-horizon/store-v1.json');

const FIXED_NOW = '2026-08-11T00:00:00.000Z';
const EMPTY_DIGEST = 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function withTemporaryStore(run) {
    const parent = mkdtempSync(join(tmpdir(), 'devlead-store-test-'));
    const storePath = join(parent, 'v1');
    try {
        return run(storePath, parent);
    } finally {
        rmSync(parent, { recursive: true, force: true });
    }
}

describe('absent-store migration', () => {
    test('creates and verifies the approved empty schema-v1 store atomically', () => {
        withTemporaryStore((storePath) => {
            const migration = migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });

            assert.deepEqual(migration, {
                migrationId: '0001-init-file-store',
                created: true,
                schemaVersion: 1,
                fileCount: 3,
                recordCount: 0,
                lastSequence: 0,
                journalDigest: EMPTY_DIGEST,
            });
            assert.deepEqual(
                JSON.parse(readFileSync(join(storePath, 'manifest.json'), 'utf8')),
                STORE_V1_FIXTURE.manifest,
            );
            assert.equal(readFileSync(join(storePath, 'journal.ndjson'), 'utf8'), '');
            assert.deepEqual(
                JSON.parse(readFileSync(join(storePath, 'index.json'), 'utf8')),
                STORE_V1_FIXTURE.index,
            );

            const verification = verifyStore(storePath);
            assert.equal(verification.valid, true);
            assert.equal(verification.fileCount, 3);
            assert.equal(verification.recordCount, 0);
            assert.equal(verification.lastSequence, 0);
            assert.equal(verification.journalDigest, EMPTY_DIGEST);

            const store = openStore(storePath);
            assert.ok(store instanceof FileLongHorizonStore);
            assert.deepEqual(store.verify(), verification);
        });
    });

    test('refuses an unknown existing schema without creating a backup', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const manifestPath = join(storePath, 'manifest.json');
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            manifest.schemaVersion = 99;
            writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');

            assert.throws(
                () => migrateStore(storePath, {
                    now: '2026-08-11T00:01:00.000Z',
                    storeId: 'store-demo-1',
                }),
                (error) => error.code === 'unknown_schema_version',
            );
            assert.deepEqual(readdirSync(join(storePath, 'backups')), []);
        });
    });
});

describe('append-only operations', () => {
    test('returns the original operation for a duplicate idempotency key', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath);
            const input = {
                operationId: 'operation-demo-1',
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                sourceEventIdOrDigest: 'source-event-demo-1',
                policyVersion: 'issue-integrity-v1',
                payload: {
                    integrityRecordRef: 'integrity-record-demo-1',
                },
            };

            const first = store.append(input);
            const duplicate = store.append({
                ...input,
                operationId: 'operation-demo-retry',
                timestamp: '2026-08-11T00:02:00.000Z',
                payload: {
                    integrityRecordRef: 'retry-payload-must-not-replace-original',
                },
            });

            assert.deepEqual(duplicate, first);
            assert.equal(first.sequence, 1);
            assert.equal(first.operationId, 'operation-demo-1');
            assert.equal(
                first.idempotencyKey,
                'paperclip:demo-company:WEIA-1379:integrity_recorded:' +
                    'source-event-demo-1:issue-integrity-v1',
            );
            const lines = readFileSync(join(storePath, 'journal.ndjson'), 'utf8')
                .trimEnd()
                .split('\n');
            assert.equal(lines.length, 1);
            assert.deepEqual(JSON.parse(lines[0]), first);

            const verification = store.verify();
            assert.equal(verification.recordCount, 1);
            assert.equal(verification.lastSequence, 1);
        });
    });

    test('rejects a reused operation ID before changing the journal', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath);
            const base = {
                operationId: 'operation-unique-1',
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                policyVersion: 'issue-integrity-v1',
                payload: { integrityRecordRef: 'integrity-record-demo-1' },
            };
            store.append({
                ...base,
                sourceEventIdOrDigest: 'source-event-demo-1',
            });
            const journalPath = join(storePath, 'journal.ndjson');
            const before = readFileSync(journalPath, 'utf8');

            assert.throws(
                () => store.append({
                    ...base,
                    sourceEventIdOrDigest: 'source-event-demo-2',
                }),
                (error) => error.code === 'operation_id_conflict',
            );
            assert.equal(readFileSync(journalPath, 'utf8'), before);
            assert.equal(store.verify().recordCount, 1);
        });
    });

    test('indexes untrusted family and fingerprint keys as data, not object prototypes', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath);
            store.append({
                operationId: 'operation-prototype-1',
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'family_recorded',
                sourceEventIdOrDigest: 'source-event-prototype-1',
                policyVersion: 'issue-integrity-v1',
                payload: {
                    familyId: '__proto__',
                    fingerprints: { exact: '__proto__' },
                },
            });

            const index = JSON.parse(readFileSync(join(storePath, 'index.json'), 'utf8'));
            assert.equal(
                Object.prototype.hasOwnProperty.call(index.families, '__proto__'),
                true,
            );
            assert.equal(index.families.__proto__, 1);
            assert.equal(
                Object.prototype.hasOwnProperty.call(index.fingerprints, '__proto__'),
                true,
            );
            assert.equal(index.fingerprints.__proto__, '__proto__');
        });
    });

    test('rejects payload values that JSON would drop or rewrite', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath);
            const base = {
                operationId: 'operation-invalid-payload',
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                sourceEventIdOrDigest: 'source-event-invalid-payload',
                policyVersion: 'issue-integrity-v1',
            };

            for (const invalidValue of [undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
                assert.throws(
                    () => store.append({
                        ...base,
                        payload: { invalidValue },
                    }),
                    (error) => error.code === 'payload_value_invalid',
                );
            }
            assert.equal(readFileSync(join(storePath, 'journal.ndjson'), 'utf8'), '');
            assert.equal(store.verify().recordCount, 0);
        });
    });

    test('rejects ambiguous idempotency-key delimiter segments before writing', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath);
            const base = {
                operationId: 'operation-ambiguous-key',
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                sourceEventIdOrDigest: 'sha256:abc123',
                payload: { integrityRecordRef: 'integrity-record-demo-1' },
            };

            for (const invalid of [
                { eventType: 'integrity:recorded', policyVersion: 'issue-integrity-v1' },
                { eventType: 'integrity_recorded', policyVersion: 'issue:integrity:v1' },
            ]) {
                assert.throws(
                    () => store.append({ ...base, ...invalid }),
                    (error) => error.code === 'operation_identifier_invalid',
                );
            }
            assert.equal(readFileSync(join(storePath, 'journal.ndjson'), 'utf8'), '');
        });
    });

    test('refuses an active writer and recovers one bounded stale lock', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const lockPath = join(storePath, '.write.lock');
            writeFileSync(lockPath, `${JSON.stringify({
                processId: process.pid,
                acquiredAt: '2026-08-11T00:00:30.000Z',
                operationId: 'active-operation',
            })}\n`, 'utf8');
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:01:00.000Z',
                lockStaleAfterMs: 60_000,
                isProcessAlive: () => true,
            });
            const input = {
                operationId: 'operation-after-lock',
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                sourceEventIdOrDigest: 'source-event-lock',
                policyVersion: 'issue-integrity-v1',
                payload: { integrityRecordRef: 'integrity-record-lock' },
            };

            assert.throws(
                () => store.append(input),
                (error) => error.code === 'writer_locked',
            );

            unlinkSync(lockPath);
            writeFileSync(lockPath, `${JSON.stringify({
                processId: process.pid,
                acquiredAt: '2026-08-10T00:00:00.000Z',
                operationId: 'stale-operation',
            })}\n`, 'utf8');
            const recoveryStore = openStore(storePath, {
                clock: () => '2026-08-11T00:01:00.000Z',
                lockStaleAfterMs: 60_000,
                isProcessAlive: () => true,
            });
            const recovered = recoveryStore.append(input);

            assert.equal(recovered.sequence, 1);
            assert.equal(recoveryStore.verify().recordCount, 1);
            const quarantineDirectory = join(storePath, 'quarantine', 'locks');
            assert.equal(readdirSync(quarantineDirectory).length, 1);

            writeFileSync(lockPath, `${JSON.stringify({
                processId: process.pid,
                acquiredAt: '2099-01-01T00:00:00.000Z',
                operationId: 'future-operation',
            })}\n`, 'utf8');
            assert.throws(
                () => recoveryStore.append(input),
                (error) => error.code === 'writer_lock_invalid',
            );
            assert.equal(readdirSync(quarantineDirectory).length, 1);
            assert.equal(recoveryStore.verify().recordCount, 1);
        });
    });
});

describe('deterministic index recovery', () => {
    test('recovers a complete first journal append left ahead of empty metadata', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const journalPath = join(storePath, 'journal.ndjson');
            const record = {
                sequence: 1,
                operationId: 'operation-crash-recovery-1',
                idempotencyKey: [
                    'paperclip:demo-company:WEIA-1379',
                    'integrity_recorded',
                    'source-event-crash-recovery-1',
                    'issue-integrity-v1',
                ].join(':'),
                schemaVersion: 1,
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                sourceEventIdOrDigest: 'source-event-crash-recovery-1',
                policyVersion: 'issue-integrity-v1',
                payload: { integrityRecordRef: 'integrity-record-crash-recovery-1' },
            };
            appendFileSync(journalPath, `${JSON.stringify(record)}\n`, 'utf8');

            assert.throws(
                () => verifyStore(storePath),
                (error) => error.code === 'store_sequence_mismatch',
            );

            const rebuilt = rebuildIndex(storePath, {
                now: '2026-08-11T00:02:00.000Z',
            });

            assert.equal(rebuilt.rebuilt, true);
            assert.equal(rebuilt.lastSequence, 1);
            assert.equal(verifyStore(storePath).valid, true);
        });
    });

    test('recovers a valid append after an unchanged authenticated prefix', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:03:00.000Z',
            });
            const base = {
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                policyVersion: 'issue-integrity-v1',
            };
            store.append({
                ...base,
                operationId: 'operation-prefix-recovery-1',
                sourceEventIdOrDigest: 'source-event-prefix-recovery-1',
                payload: { integrityRecordRef: 'integrity-record-prefix-recovery-1' },
            });
            assert.equal(verifyStore(storePath).lastSequence, 1);

            const journalPath = join(storePath, 'journal.ndjson');
            const manifestPath = join(storePath, 'manifest.json');
            const indexPath = join(storePath, 'index.json');
            const authenticatedPrefix = readFileSync(journalPath);
            const authenticatedManifest = readFileSync(manifestPath, 'utf8');
            const authenticatedIndex = readFileSync(indexPath, 'utf8');

            store.append({
                ...base,
                operationId: 'operation-prefix-recovery-2',
                sourceEventIdOrDigest: 'source-event-prefix-recovery-2',
                payload: { integrityRecordRef: 'integrity-record-prefix-recovery-2' },
            });
            const completeJournal = readFileSync(journalPath);
            writeFileSync(manifestPath, authenticatedManifest, 'utf8');
            writeFileSync(indexPath, authenticatedIndex, 'utf8');

            assert.equal(
                JSON.parse(readFileSync(manifestPath, 'utf8')).lastSequence,
                1,
            );
            assert.equal(
                JSON.parse(readFileSync(indexPath, 'utf8')).lastSequence,
                1,
            );
            assert.throws(
                () => verifyStore(storePath),
                (error) => error.code === 'store_sequence_mismatch',
            );

            const rebuilt = rebuildIndex(storePath, {
                now: '2026-08-11T00:04:00.000Z',
            });
            const recoveredJournal = readFileSync(journalPath);

            assert.equal(rebuilt.rebuilt, true);
            assert.equal(rebuilt.recordCount, 2);
            assert.equal(rebuilt.lastSequence, 2);
            assert.deepEqual(recoveredJournal, completeJournal);
            assert.deepEqual(
                recoveredJournal.subarray(0, authenticatedPrefix.length),
                authenticatedPrefix,
            );
            assert.deepEqual(verifyStore(storePath), {
                valid: true,
                schemaVersion: 1,
                fileCount: 3,
                recordCount: 2,
                lastSequence: 2,
                journalDigest: rebuilt.journalDigest,
            });
        });
    });

    test('quarantines invalid UTF-8 journal bytes instead of normalizing them', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const record = {
                sequence: 1,
                operationId: 'operation-invalid-utf8-1',
                idempotencyKey: [
                    'paperclip:demo-company:WEIA-1379',
                    'integrity_recorded',
                    'source-event-invalid-utf8-1',
                    'issue-integrity-v1',
                ].join(':'),
                schemaVersion: 1,
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                sourceEventIdOrDigest: 'source-event-invalid-utf8-1',
                policyVersion: 'issue-integrity-v1',
                payload: { integrityRecordRef: 'X' },
            };
            const journalBytes = Buffer.from(`${JSON.stringify(record)}\n`, 'utf8');
            const marker = journalBytes.indexOf(Buffer.from('"X"', 'utf8'));
            assert.notEqual(marker, -1);
            journalBytes[marker + 1] = 0x80;
            const journalPath = join(storePath, 'journal.ndjson');
            writeFileSync(journalPath, journalBytes);

            assert.throws(
                () => rebuildIndex(storePath, {
                    now: '2026-08-11T00:02:00.000Z',
                }),
                (error) => {
                    assert.equal(error.code, 'journal_encoding_invalid');
                    assert.deepEqual(
                        readFileSync(error.details.quarantinePath),
                        journalBytes,
                    );
                    return true;
                },
            );
            assert.deepEqual(readFileSync(journalPath), journalBytes);
        });
    });

    test('quarantines a rewritten authenticated prefix before accepting a valid append', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:03:00.000Z',
            });
            const base = {
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                policyVersion: 'issue-integrity-v1',
                payload: { integrityRecordRef: 'integrity-record-original' },
            };
            store.append({
                ...base,
                operationId: 'operation-prefix-1',
                sourceEventIdOrDigest: 'source-event-prefix-1',
            });
            const manifestPath = join(storePath, 'manifest.json');
            const indexPath = join(storePath, 'index.json');
            const authenticatedManifest = readFileSync(manifestPath, 'utf8');
            const authenticatedIndex = readFileSync(indexPath, 'utf8');

            store.append({
                ...base,
                operationId: 'operation-prefix-2',
                sourceEventIdOrDigest: 'source-event-prefix-2',
            });
            const journalPath = join(storePath, 'journal.ndjson');
            const records = readFileSync(journalPath, 'utf8')
                .trimEnd()
                .split('\n')
                .map((line) => JSON.parse(line));
            records[0].payload.integrityRecordRef = 'integrity-record-rewritten';
            const rewrittenJournal = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
            writeFileSync(journalPath, rewrittenJournal, 'utf8');
            writeFileSync(manifestPath, authenticatedManifest, 'utf8');
            writeFileSync(indexPath, authenticatedIndex, 'utf8');

            assert.throws(
                () => rebuildIndex(storePath, {
                    now: '2026-08-11T00:04:00.000Z',
                }),
                (error) => {
                    assert.equal(error.code, 'journal_digest_changed');
                    assert.equal(existsSync(error.details.quarantinePath), true);
                    assert.equal(
                        readFileSync(error.details.quarantinePath, 'utf8'),
                        rewrittenJournal,
                    );
                    return true;
                },
            );
            assert.equal(readFileSync(journalPath, 'utf8'), rewrittenJournal);
            assert.equal(readFileSync(manifestPath, 'utf8'), authenticatedManifest);
            assert.equal(readFileSync(indexPath, 'utf8'), authenticatedIndex);
            assert.throws(
                () => verifyStore(storePath),
                (error) => error.code === 'store_sequence_mismatch',
            );
        });
    });

    test('rebuilds the index to the journal sequence and digest', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:03:00.000Z',
            });
            const base = {
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                policyVersion: 'issue-integrity-v1',
                payload: { integrityRecordRef: 'integrity-record-demo' },
            };
            store.append({
                ...base,
                operationId: 'operation-demo-1',
                sourceEventIdOrDigest: 'source-event-demo-1',
            });
            store.append({
                ...base,
                operationId: 'operation-demo-2',
                sourceEventIdOrDigest: 'source-event-demo-2',
            });
            const before = store.verify();
            writeFileSync(join(storePath, 'index.json'), '{}\n', 'utf8');

            const rebuilt = rebuildIndex(storePath, {
                now: '2026-08-11T00:04:00.000Z',
            });

            assert.equal(rebuilt.rebuilt, true);
            assert.equal(rebuilt.lastSequence, 2);
            assert.equal(rebuilt.journalDigest, before.journalDigest);
            assert.deepEqual(verifyStore(storePath), before);
        });
    });

    test('quarantines and surfaces a truncated journal tail without rewriting it', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const journalPath = join(storePath, 'journal.ndjson');
            appendFileSync(journalPath, '{"sequence":1', 'utf8');
            const corruptBytes = readFileSync(journalPath, 'utf8');

            assert.throws(
                () => rebuildIndex(storePath, {
                    now: '2026-08-11T00:05:00.000Z',
                }),
                (error) => {
                    assert.equal(error.code, 'journal_truncated');
                    assert.ok(error.details.quarantinePath);
                    assert.equal(existsSync(error.details.quarantinePath), true);
                    return true;
                },
            );
            assert.equal(readFileSync(journalPath, 'utf8'), corruptBytes);
        });
    });

    test('quarantines and surfaces an unsupported complete journal record', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const journalPath = join(storePath, 'journal.ndjson');
            const issueKey = 'paperclip:demo-company:WEIA-1379';
            const eventType = 'integrity_recorded';
            const sourceEventIdOrDigest = 'source-event-unknown-schema';
            const policyVersion = 'issue-integrity-v1';
            const record = {
                sequence: 1,
                operationId: 'operation-unknown-schema',
                idempotencyKey: [
                    issueKey,
                    eventType,
                    sourceEventIdOrDigest,
                    policyVersion,
                ].join(':'),
                schemaVersion: 99,
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey,
                eventType,
                sourceEventIdOrDigest,
                policyVersion,
                payload: { integrityRecordRef: 'integrity-record-unknown-schema' },
            };
            writeFileSync(journalPath, `${JSON.stringify(record)}\n`, 'utf8');
            const retained = readFileSync(journalPath, 'utf8');

            assert.throws(
                () => rebuildIndex(storePath, {
                    now: '2026-08-11T00:05:00.000Z',
                }),
                (error) => {
                    assert.equal(error.code, 'unknown_schema_version');
                    assert.equal(existsSync(error.details.quarantinePath), true);
                    return true;
                },
            );
            assert.equal(readFileSync(journalPath, 'utf8'), retained);
        });
    });
});

describe('verified backup and restore', () => {
    test('records count and digest readback while restoring only derived files', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:06:00.000Z',
            });
            store.append({
                operationId: 'operation-backup-1',
                timestamp: '2026-08-11T00:01:00.000Z',
                issueKey: 'paperclip:demo-company:WEIA-1379',
                eventType: 'integrity_recorded',
                sourceEventIdOrDigest: 'source-event-backup-1',
                policyVersion: 'issue-integrity-v1',
                payload: { integrityRecordRef: 'integrity-record-backup-1' },
            });
            const before = store.verify();

            const backup = store.createBackup({
                now: '2026-08-11T00:07:00.000Z',
            });
            assert.equal(backup.fileCount, 3);
            assert.equal(backup.recordCount, 1);
            assert.equal(backup.journalDigest, before.journalDigest);

            writeFileSync(join(storePath, 'index.json'), '{}\n', 'utf8');
            const restored = store.restoreBackup(backup.path, {
                now: '2026-08-11T00:08:00.000Z',
            });

            assert.equal(restored.restoredFileCount, 2);
            assert.equal(restored.backupFileCount, 3);
            assert.equal(restored.recordCount, 1);
            assert.equal(restored.journalDigest, before.journalDigest);
            assert.deepEqual(store.verify(), before);
        });
    });

    test('rejects a backup whose manifest provenance differs from the live store', () => {
        withTemporaryStore((storePath) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:06:00.000Z',
            });
            const before = store.verify();
            const backup = store.createBackup({
                now: '2026-08-11T00:07:00.000Z',
            });
            const manifestPath = join(backup.path, 'manifest.json');
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            manifest.storeId = 'different-store';
            writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');

            assert.throws(
                () => store.restoreBackup(backup.path, {
                    now: '2026-08-11T00:08:00.000Z',
                }),
                (error) => error.code === 'backup_provenance_mismatch',
            );
            assert.deepEqual(store.verify(), before);
        });
    });

    test('rejects a backup path whose junction escapes the backups directory', () => {
        withTemporaryStore((storePath, parent) => {
            migrateStore(storePath, {
                now: FIXED_NOW,
                storeId: 'store-demo-1',
            });
            const store = openStore(storePath, {
                clock: () => '2026-08-11T00:06:00.000Z',
            });
            const backup = store.createBackup({
                now: '2026-08-11T00:07:00.000Z',
            });
            const outside = join(parent, 'outside-backup');
            renameSync(backup.path, outside);
            symlinkSync(outside, backup.path, 'junction');

            assert.throws(
                () => store.restoreBackup(backup.path, {
                    now: '2026-08-11T00:08:00.000Z',
                }),
                (error) => error.code === 'backup_path_forbidden',
            );
        });
    });
});
