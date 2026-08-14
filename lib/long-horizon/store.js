'use strict';

const {
    closeSync,
    existsSync,
    fstatSync,
    fsyncSync,
    mkdirSync,
    openSync,
    readFileSync,
    realpathSync,
    renameSync,
    rmSync,
    statSync,
    unlinkSync,
    writeFileSync,
} = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { TextDecoder } = require('node:util');
const {
    basename,
    dirname,
    isAbsolute,
    join,
    relative,
    resolve,
} = require('node:path');

const { STORE_SCHEMA_VERSION } = require('./contracts.js');

const MIGRATION_ID = '0001-init-file-store';
const CORE_FILES = Object.freeze(['manifest.json', 'journal.ndjson', 'index.json']);
const EMPTY_DIGEST = `sha256:${createHash('sha256').update('').digest('hex')}`;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ISSUE_KEY = /^(?:github|paperclip):[^:]+:[^:]+$/;
const JOURNAL_DIGEST = /^sha256:[a-f0-9]{64}$/;
const FORBIDDEN_PAYLOAD_KEY = /^(?:(?:api|access|client|refresh)[_-]?(?:key|secret|token)|authorization|body|commentBody|content|cookie|credential|evidenceBody|password|private[_-]?key|raw|rawBody|secret|token)$/i;

class StoreError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'StoreError';
        this.code = code;
        if (details !== undefined) this.details = details;
    }
}

function fail(code, message, details) {
    throw new StoreError(code, message, details);
}

function requireStorePath(storePath) {
    if (typeof storePath !== 'string' || !storePath.trim()) {
        throw new TypeError('storePath is required and must be a non-empty string');
    }
    return storePath;
}

function requireTimestamp(value, name) {
    if (typeof value !== 'string' || !ISO_TIMESTAMP.test(value)) {
        throw new TypeError(`${name} must be a canonical UTC ISO timestamp`);
    }
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime()) || instant.toISOString() !== value) {
        throw new TypeError(`${name} must be a canonical UTC ISO timestamp`);
    }
    return value;
}

function requireIdentifier(value, name) {
    if (typeof value !== 'string' || !value.trim() || /\p{Cc}/u.test(value)) {
        throw new TypeError(`${name} must be a non-empty string without control characters`);
    }
    return value.trim();
}

function requireIdempotencySegment(value, name) {
    const normalized = requireIdentifier(value, name);
    if (normalized.includes(':')) {
        fail('operation_identifier_invalid', `${name} must not contain a colon`);
    }
    return normalized;
}

function requirePlainObject(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${name} must be an object`);
    }
    return value;
}

function readJson(path, label) {
    let bytes;
    try {
        bytes = readFileSync(path, 'utf8');
    } catch (error) {
        fail('store_file_unreadable', `cannot read ${label}: ${error.message}`);
    }
    try {
        return JSON.parse(bytes);
    } catch (error) {
        fail('store_json_invalid', `${label} is not valid JSON: ${error.message}`);
    }
}

function writeDurableFile(path, bytes) {
    const descriptor = openSync(path, 'wx');
    try {
        writeFileSync(descriptor, bytes, 'utf8');
        fsyncSync(descriptor);
    } finally {
        closeSync(descriptor);
    }
}

function fsyncDirectoryBestEffort(path) {
    let descriptor;
    try {
        descriptor = openSync(path, 'r');
        fsyncSync(descriptor);
    } catch {
        // Windows may refuse directory fsync. All data files are fsynced before rename.
    } finally {
        if (descriptor !== undefined) closeSync(descriptor);
    }
}

function writeAtomicJson(path, value) {
    const temporary = `${path}.tmp-${randomUUID()}`;
    try {
        writeDurableFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
        renameSync(temporary, path);
        fsyncDirectoryBestEffort(dirname(path));
    } catch (error) {
        rmSync(temporary, { force: true });
        throw error;
    }
}

function digestJournal(bytes) {
    return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function emptyMap() {
    return Object.create(null);
}

function emptyIndex() {
    return {
        schemaVersion: STORE_SCHEMA_VERSION,
        lastSequence: 0,
        journalDigest: EMPTY_DIGEST,
        issues: emptyMap(),
        families: emptyMap(),
        fingerprints: emptyMap(),
        idempotency: emptyMap(),
    };
}

function parseJournal(bytes) {
    if (bytes.length === 0) return [];
    if (bytes[bytes.length - 1] !== 0x0a) {
        fail('journal_truncated', 'journal.ndjson ends with an incomplete record');
    }
    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
        fail('journal_encoding_invalid', `journal.ndjson is not valid UTF-8: ${error.message}`);
    }
    const records = [];
    for (const [index, line] of text.slice(0, -1).split('\n').entries()) {
        if (!line) fail('journal_blank_line', `journal.ndjson line ${index + 1} is blank`);
        try {
            records.push(JSON.parse(line));
        } catch (error) {
            fail(
                'journal_record_invalid',
                `journal.ndjson line ${index + 1} is invalid JSON: ${error.message}`,
            );
        }
    }
    return records;
}

function journalPrefixThroughSequence(journalBytes, sequence) {
    if (sequence === 0) return Buffer.alloc(0);
    let boundary = 0;
    for (let index = 0; index < sequence; index += 1) {
        boundary = journalBytes.indexOf(0x0a, boundary);
        if (boundary === -1) {
            fail('journal_history_missing', 'journal is behind the manifest sequence');
        }
        boundary += 1;
    }
    return journalBytes.subarray(0, boundary);
}

function scanPayload(value, path, seen = new WeakSet()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number') {
        if (Number.isFinite(value)) return;
        fail('payload_value_invalid', `${path} must be a finite JSON number`);
    }
    if (typeof value !== 'object') {
        fail('payload_value_invalid', `${path} must be a JSON value`);
    }
    if (Array.isArray(value)) {
        if (seen.has(value)) throw new TypeError(`${path} must not be cyclic`);
        seen.add(value);
        value.forEach((entry, index) => scanPayload(entry, `${path}[${index}]`, seen));
        seen.delete(value);
        return;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) {
        throw new TypeError(`${path} must contain JSON objects only`);
    }
    if (seen.has(value)) throw new TypeError(`${path} must not be cyclic`);
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
        if (FORBIDDEN_PAYLOAD_KEY.test(key)) {
            fail('payload_field_forbidden', `${path}.${key} is not allowed in durable metadata`);
        }
        scanPayload(child, `${path}.${key}`, seen);
    }
    seen.delete(value);
}

function normalizeOperationFields(input, path) {
    const operationId = requireIdentifier(input.operationId, `${path}.operationId`);
    const timestamp = requireTimestamp(input.timestamp, `${path}.timestamp`);
    const issueKey = requireIdentifier(input.issueKey, `${path}.issueKey`);
    if (!ISSUE_KEY.test(issueKey)) {
        throw new TypeError(`${path}.issueKey must be sourceKind:scopeKey:sourceIssueId`);
    }
    const eventType = requireIdempotencySegment(input.eventType, `${path}.eventType`);
    const sourceEventIdOrDigest = requireIdentifier(
        input.sourceEventIdOrDigest,
        `${path}.sourceEventIdOrDigest`,
    );
    const policyVersion = requireIdempotencySegment(
        input.policyVersion,
        `${path}.policyVersion`,
    );
    const payload = requirePlainObject(input.payload, `${path}.payload`);
    scanPayload(payload, `${path}.payload`);
    try {
        JSON.stringify(payload);
    } catch (error) {
        throw new TypeError(`${path}.payload must be JSON serializable: ${error.message}`);
    }
    return {
        operationId,
        timestamp,
        issueKey,
        eventType,
        sourceEventIdOrDigest,
        policyVersion,
        payload: structuredClone(payload),
    };
}

function normalizeAppendInput(value) {
    const input = requirePlainObject(value, 'operation');
    const allowed = new Set([
        'operationId',
        'timestamp',
        'issueKey',
        'eventType',
        'sourceEventIdOrDigest',
        'policyVersion',
        'payload',
    ]);
    for (const key of Object.keys(input)) {
        if (!allowed.has(key)) fail('operation_field_not_allowed', `operation.${key} is not allowed`);
    }
    return normalizeOperationFields(input, 'operation');
}

function operationKey(input) {
    return [
        input.issueKey,
        input.eventType,
        input.sourceEventIdOrDigest,
        input.policyVersion,
    ].join(':');
}

function validateJournalRecords(records) {
    const operationIds = new Set();
    const idempotencyKeys = new Set();
    const allowed = new Set([
        'sequence',
        'operationId',
        'idempotencyKey',
        'schemaVersion',
        'timestamp',
        'issueKey',
        'eventType',
        'sourceEventIdOrDigest',
        'policyVersion',
        'payload',
    ]);
    for (let index = 0; index < records.length; index += 1) {
        const record = requirePlainObject(records[index], `journal record ${index + 1}`);
        for (const key of Object.keys(record)) {
            if (!allowed.has(key)) {
                fail('journal_field_not_allowed', `journal record ${index + 1}.${key} is not allowed`);
            }
        }
        if (record.schemaVersion !== STORE_SCHEMA_VERSION) {
            fail('unknown_schema_version', `journal record ${index + 1} schema is unsupported`);
        }
        if (record.sequence !== index + 1) {
            fail('journal_sequence_invalid', `journal record ${index + 1} is not monotonic`);
        }
        const normalized = normalizeOperationFields(record, `journal record ${index + 1}`);
        const expectedKey = operationKey(normalized);
        if (record.idempotencyKey !== expectedKey) {
            fail('journal_idempotency_invalid', `journal record ${index + 1} key is invalid`);
        }
        if (operationIds.has(record.operationId)) {
            fail('journal_operation_duplicate', `operationId is duplicated at sequence ${record.sequence}`);
        }
        if (idempotencyKeys.has(record.idempotencyKey)) {
            fail('journal_idempotency_duplicate', `idempotency key is duplicated at sequence ${record.sequence}`);
        }
        operationIds.add(record.operationId);
        idempotencyKeys.add(record.idempotencyKey);
    }
}

function buildIndex(records, journalDigest) {
    validateJournalRecords(records);
    const index = {
        schemaVersion: STORE_SCHEMA_VERSION,
        lastSequence: records.length,
        journalDigest,
        issues: emptyMap(),
        families: emptyMap(),
        fingerprints: emptyMap(),
        idempotency: emptyMap(),
    };
    for (const record of records) {
        const issue = index.issues[record.issueKey] || {
            lastSequence: 0,
            operationSequences: [],
        };
        issue.lastSequence = record.sequence;
        issue.operationSequences.push(record.sequence);
        index.issues[record.issueKey] = issue;
        index.idempotency[record.idempotencyKey] = record.sequence;

        if (typeof record.payload.familyId === 'string') {
            index.families[record.payload.familyId] = record.sequence;
        }
        if (record.payload.fingerprints && typeof record.payload.fingerprints === 'object') {
            for (const fingerprint of Object.values(record.payload.fingerprints)) {
                if (typeof fingerprint === 'string') {
                    index.fingerprints[fingerprint] = record.payload.familyId || record.sequence;
                }
            }
        }
    }
    return index;
}

function assertSchemaVersion(value, label) {
    if (!value || value.schemaVersion !== STORE_SCHEMA_VERSION) {
        fail(
            'unknown_schema_version',
            `${label} schema version is not supported`,
            { found: value && value.schemaVersion, supported: STORE_SCHEMA_VERSION },
        );
    }
}

function validateManifest(value, label) {
    const manifest = requirePlainObject(value, label);
    const allowed = new Set([
        'schemaVersion',
        'storeId',
        'createdAt',
        'lastSequence',
        'journalDigest',
        'lastMigrationId',
    ]);
    for (const key of Object.keys(manifest)) {
        if (!allowed.has(key)) fail('manifest_field_not_allowed', `${label}.${key} is not allowed`);
    }
    for (const key of allowed) {
        if (!Object.prototype.hasOwnProperty.call(manifest, key)) {
            fail('manifest_field_missing', `${label}.${key} is required`);
        }
    }
    assertSchemaVersion(manifest, label);
    requireIdentifier(manifest.storeId, `${label}.storeId`);
    requireTimestamp(manifest.createdAt, `${label}.createdAt`);
    if (!Number.isSafeInteger(manifest.lastSequence) || manifest.lastSequence < 0) {
        fail('manifest_sequence_invalid', `${label}.lastSequence is invalid`);
    }
    if (
        typeof manifest.journalDigest !== 'string' ||
        !JOURNAL_DIGEST.test(manifest.journalDigest)
    ) {
        fail('manifest_digest_invalid', `${label}.journalDigest is invalid`);
    }
    if (manifest.lastMigrationId !== MIGRATION_ID) {
        fail('unknown_migration', `${label}.lastMigrationId is unsupported`);
    }
    return manifest;
}

function verifyStoreSnapshot(manifest, index, journalBytes) {
    validateManifest(manifest, 'manifest.json');
    assertSchemaVersion(index, 'index.json');
    const records = parseJournal(journalBytes);
    const journalDigest = digestJournal(journalBytes);
    validateJournalRecords(records);
    const lastSequence = records.length === 0 ? 0 : records[records.length - 1].sequence;

    if (manifest.lastSequence !== lastSequence || index.lastSequence !== lastSequence) {
        fail('store_sequence_mismatch', 'manifest/index sequence does not match the journal');
    }
    if (manifest.journalDigest !== journalDigest || index.journalDigest !== journalDigest) {
        fail('store_digest_mismatch', 'manifest/index digest does not match the journal');
    }
    const expectedIndex = buildIndex(records, journalDigest);
    if (JSON.stringify(index) !== JSON.stringify(expectedIndex)) {
        fail('store_index_mismatch', 'index.json does not match the deterministic journal index');
    }

    return {
        valid: true,
        schemaVersion: STORE_SCHEMA_VERSION,
        fileCount: CORE_FILES.length,
        recordCount: records.length,
        lastSequence,
        journalDigest,
    };
}

function verifyStore(storePath) {
    const root = requireStorePath(storePath);
    if (!existsSync(root)) fail('store_absent', `store does not exist: ${root}`);

    const manifest = readJson(join(root, 'manifest.json'), 'manifest.json');
    const index = readJson(join(root, 'index.json'), 'index.json');
    let journalBytes;
    try {
        journalBytes = readFileSync(join(root, 'journal.ndjson'));
    } catch (error) {
        fail('store_file_unreadable', `cannot read journal.ndjson: ${error.message}`);
    }
    return verifyStoreSnapshot(manifest, index, journalBytes);
}

function migrateStore(storePath, options = {}) {
    const root = requireStorePath(storePath);
    if (existsSync(root)) {
        const verification = verifyStore(root);
        return {
            migrationId: MIGRATION_ID,
            created: false,
            schemaVersion: verification.schemaVersion,
            fileCount: verification.fileCount,
            recordCount: verification.recordCount,
            lastSequence: verification.lastSequence,
            journalDigest: verification.journalDigest,
        };
    }

    const createdAt = requireTimestamp(options.now, 'options.now');
    const storeId = requireIdentifier(options.storeId, 'options.storeId');
    const parent = dirname(root);
    mkdirSync(parent, { recursive: true });
    const temporary = join(parent, `.${basename(root)}.tmp-${randomUUID()}`);

    try {
        mkdirSync(temporary, { recursive: false });
        mkdirSync(join(temporary, 'backups'), { recursive: false });
        const manifest = {
            schemaVersion: STORE_SCHEMA_VERSION,
            storeId,
            createdAt,
            lastSequence: 0,
            journalDigest: EMPTY_DIGEST,
            lastMigrationId: MIGRATION_ID,
        };
        writeDurableFile(join(temporary, 'journal.ndjson'), '');
        writeDurableFile(join(temporary, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
        writeDurableFile(join(temporary, 'index.json'), `${JSON.stringify(emptyIndex(), null, 2)}\n`);
        const verification = verifyStore(temporary);
        fsyncDirectoryBestEffort(temporary);
        renameSync(temporary, root);
        fsyncDirectoryBestEffort(parent);
        return {
            migrationId: MIGRATION_ID,
            created: true,
            schemaVersion: verification.schemaVersion,
            fileCount: verification.fileCount,
            recordCount: verification.recordCount,
            lastSequence: verification.lastSequence,
            journalDigest: verification.journalDigest,
        };
    } catch (error) {
        rmSync(temporary, { recursive: true, force: true });
        if (existsSync(root)) return migrateStore(root, options);
        throw error;
    }
}

function quarantineJournalFailure(storePath, journalBytes, now, error) {
    const quarantineDirectory = join(storePath, 'quarantine', 'journal');
    mkdirSync(quarantineDirectory, { recursive: true });
    const quarantinePath = join(
        quarantineDirectory,
        `${now.replace(/[:.]/g, '-')}-${randomUUID()}.ndjson`,
    );
    const lastCompleteBoundary = journalBytes.lastIndexOf(0x0a) + 1;
    const tail = journalBytes.subarray(lastCompleteBoundary);
    const corruptTail = tail.length === 0 ? journalBytes : tail;
    writeDurableFile(quarantinePath, corruptTail);
    throw new StoreError(error.code, error.message, {
        ...(error.details || {}),
        quarantinePath,
        retainedJournalPath: join(storePath, 'journal.ndjson'),
    });
}

function rebuildIndex(storePath, options = {}) {
    const root = requireStorePath(storePath);
    const now = requireTimestamp(options.now, 'options.now');
    const storeOptions = normalizeStoreOptions({
        ...options,
        clock: () => now,
    });
    const release = acquireWriteLock(root, `rebuild-index-${randomUUID()}`, storeOptions);
    try {
        const manifest = readJson(join(root, 'manifest.json'), 'manifest.json');
        validateManifest(manifest, 'manifest.json');
        const journalPath = join(root, 'journal.ndjson');
        let journalBytes;
        try {
            journalBytes = readFileSync(journalPath);
        } catch (error) {
            fail('store_file_unreadable', `cannot read journal.ndjson: ${error.message}`);
        }
        let records;
        try {
            records = parseJournal(journalBytes);
            validateJournalRecords(records);
        } catch (error) {
            if (
                error instanceof StoreError &&
                (error.code.startsWith('journal_') || error.code === 'unknown_schema_version')
            ) {
                quarantineJournalFailure(root, journalBytes, now, error);
            }
            throw error;
        }

        const journalDigest = digestJournal(journalBytes);
        const lastSequence = records.length;
        if (manifest.lastSequence > lastSequence) {
            fail('journal_history_missing', 'journal is behind the manifest sequence');
        }
        const authenticatedPrefix = journalPrefixThroughSequence(
            journalBytes,
            manifest.lastSequence,
        );
        if (manifest.journalDigest !== digestJournal(authenticatedPrefix)) {
            quarantineJournalFailure(
                root,
                journalBytes,
                now,
                new StoreError(
                    'journal_digest_changed',
                    'journal history changed before the manifest sequence',
                ),
            );
        }

        const index = buildIndex(records, journalDigest);
        manifest.lastSequence = lastSequence;
        manifest.journalDigest = journalDigest;
        writeAtomicJson(join(root, 'index.json'), index);
        writeAtomicJson(join(root, 'manifest.json'), manifest);
        const verification = verifyStore(root);
        return {
            rebuilt: true,
            schemaVersion: verification.schemaVersion,
            recordCount: verification.recordCount,
            lastSequence: verification.lastSequence,
            journalDigest: verification.journalDigest,
        };
    } finally {
        release();
    }
}

function defaultIsProcessAlive(processId) {
    if (!Number.isSafeInteger(processId) || processId <= 0) return false;
    try {
        process.kill(processId, 0);
        return true;
    } catch (error) {
        return Boolean(error && error.code === 'EPERM');
    }
}

function normalizeStoreOptions(options = {}) {
    const clock = options.clock === undefined
        ? () => new Date().toISOString()
        : options.clock;
    if (typeof clock !== 'function') throw new TypeError('options.clock must be a function');
    const isProcessAlive = options.isProcessAlive === undefined
        ? defaultIsProcessAlive
        : options.isProcessAlive;
    if (typeof isProcessAlive !== 'function') {
        throw new TypeError('options.isProcessAlive must be a function');
    }
    const lockStaleAfterMs = options.lockStaleAfterMs === undefined
        ? 300_000
        : options.lockStaleAfterMs;
    if (
        !Number.isSafeInteger(lockStaleAfterMs) ||
        lockStaleAfterMs < 1_000 ||
        lockStaleAfterMs > 86_400_000
    ) {
        throw new TypeError('options.lockStaleAfterMs must be between 1000 and 86400000');
    }
    const lockRecoveryMaxAgeMs = Math.min(lockStaleAfterMs * 2, 86_400_000);
    return { clock, isProcessAlive, lockStaleAfterMs, lockRecoveryMaxAgeMs };
}

function createWriteLock(lockPath, operationId, acquiredAt, lockId) {
    let descriptor;
    let created = false;
    let failure;
    try {
        descriptor = openSync(lockPath, 'wx');
        created = true;
        writeFileSync(descriptor, `${JSON.stringify({
            lockId,
            processId: process.pid,
            acquiredAt,
            operationId,
        }, null, 2)}\n`, 'utf8');
        fsyncSync(descriptor);
    } catch (error) {
        failure = error;
    } finally {
        if (descriptor !== undefined) {
            try {
                closeSync(descriptor);
            } catch (error) {
                if (!failure) failure = error;
            }
        }
    }
    if (failure) {
        if (created) {
            try {
                unlinkSync(lockPath);
            } catch {
                // Preserve the write/fsync failure. A malformed lock fails closed on the next writer.
            }
        }
        throw failure;
    }
}

function acquireWriteLock(storePath, operationId, options) {
    const lockPath = join(storePath, '.write.lock');
    const acquiredAt = requireTimestamp(options.clock(), 'options.clock()');
    const lockId = randomUUID();
    try {
        createWriteLock(lockPath, operationId, acquiredAt, lockId);
    } catch (error) {
        if (!error || error.code !== 'EEXIST') throw error;
        let observedBytes;
        let existing;
        try {
            observedBytes = readFileSync(lockPath, 'utf8');
            existing = JSON.parse(observedBytes);
        } catch (readError) {
            fail('writer_lock_invalid', `.write.lock cannot be inspected: ${readError.message}`);
        }
        const existingAcquiredAt = requireTimestamp(
            existing.acquiredAt,
            '.write.lock.acquiredAt',
        );
        const processId = existing.processId;
        if (!Number.isSafeInteger(processId) || processId <= 0) {
            fail('writer_lock_invalid', '.write.lock processId is invalid');
        }
        const ageMs = new Date(acquiredAt).getTime() - new Date(existingAcquiredAt).getTime();
        const futureBeyondClockSkew = ageMs < -60_000;
        if (futureBeyondClockSkew) {
            fail('writer_lock_invalid', '.write.lock acquiredAt exceeds allowed clock skew');
        }
        if (
            ageMs < options.lockStaleAfterMs ||
            (
                ageMs < options.lockRecoveryMaxAgeMs &&
                options.isProcessAlive(processId)
            )
        ) {
            fail('writer_locked', 'another writer owns .write.lock');
        }

        const quarantineDirectory = join(storePath, 'quarantine', 'locks');
        mkdirSync(quarantineDirectory, { recursive: true });
        const quarantinePath = join(
            quarantineDirectory,
            `${existingAcquiredAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`,
        );
        renameSync(lockPath, quarantinePath);
        const claimedBytes = readFileSync(quarantinePath, 'utf8');
        if (claimedBytes !== observedBytes) {
            if (!existsSync(lockPath)) {
                renameSync(quarantinePath, lockPath);
            }
            fail(
                'writer_lock_raced',
                'writer lock changed while stale recovery was claiming it',
            );
        }
        try {
            createWriteLock(lockPath, operationId, acquiredAt, lockId);
        } catch (retryError) {
            if (retryError && retryError.code === 'EEXIST') {
                fail('writer_locked', 'another writer acquired .write.lock during recovery');
            }
            throw retryError;
        }
    }
    return () => {
        const releaseDirectory = join(storePath, 'quarantine', 'locks');
        mkdirSync(releaseDirectory, { recursive: true });
        const releasePath = join(releaseDirectory, `release-${lockId}.json`);
        try {
            renameSync(lockPath, releasePath);
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                fail('writer_lock_lost', 'writer lock disappeared before release');
            }
            throw error;
        }
        const claimed = readJson(releasePath, 'claimed .write.lock');
        if (claimed.lockId !== lockId) {
            if (!existsSync(lockPath)) renameSync(releasePath, lockPath);
            fail('writer_lock_lost', 'writer lock ownership changed before release');
        }
        unlinkSync(releasePath);
    };
}

function appendOperation(storePath, value, options) {
    const input = normalizeAppendInput(value);
    const release = acquireWriteLock(storePath, input.operationId, options);
    try {
        verifyStore(storePath);
        const journalPath = join(storePath, 'journal.ndjson');
        const currentBytes = readFileSync(journalPath);
        const records = parseJournal(currentBytes);
        const idempotencyKey = operationKey(input);
        const original = records.find((record) => record.idempotencyKey === idempotencyKey);
        if (original) return structuredClone(original);
        if (records.some((record) => record.operationId === input.operationId)) {
            fail(
                'operation_id_conflict',
                `operationId ${input.operationId} already belongs to another operation`,
            );
        }

        const operation = {
            sequence: records.length + 1,
            operationId: input.operationId,
            idempotencyKey,
            schemaVersion: STORE_SCHEMA_VERSION,
            timestamp: input.timestamp,
            issueKey: input.issueKey,
            eventType: input.eventType,
            sourceEventIdOrDigest: input.sourceEventIdOrDigest,
            policyVersion: input.policyVersion,
            payload: input.payload,
        };
        const descriptor = openSync(journalPath, 'a');
        try {
            writeFileSync(descriptor, `${JSON.stringify(operation)}\n`, 'utf8');
            fsyncSync(descriptor);
        } finally {
            closeSync(descriptor);
        }

        const updatedBytes = readFileSync(journalPath);
        const updatedRecords = parseJournal(updatedBytes);
        const journalDigest = digestJournal(updatedBytes);
        const index = buildIndex(updatedRecords, journalDigest);
        const manifest = readJson(join(storePath, 'manifest.json'), 'manifest.json');
        manifest.lastSequence = operation.sequence;
        manifest.journalDigest = journalDigest;
        writeAtomicJson(join(storePath, 'index.json'), index);
        writeAtomicJson(join(storePath, 'manifest.json'), manifest);
        verifyStore(storePath);
        return structuredClone(operation);
    } finally {
        release();
    }
}

function optionsForMaintenance(options, fallbackOptions) {
    const now = requireTimestamp(options && options.now, 'options.now');
    return {
        now,
        storeOptions: normalizeStoreOptions({
            ...fallbackOptions,
            ...options,
            clock: () => now,
        }),
    };
}

function createBackup(storePath, options, fallbackOptions) {
    const { now, storeOptions } = optionsForMaintenance(options, fallbackOptions);
    const release = acquireWriteLock(
        storePath,
        `create-backup-${randomUUID()}`,
        storeOptions,
    );
    const backupPath = join(
        storePath,
        'backups',
        `${now.replace(/[:.]/g, '-')}-${randomUUID()}`,
    );
    try {
        const source = verifyStore(storePath);
        mkdirSync(backupPath, { recursive: false });
        for (const file of CORE_FILES) {
            writeDurableFile(
                join(backupPath, file),
                readFileSync(join(storePath, file)),
            );
        }
        fsyncDirectoryBestEffort(backupPath);
        const readback = verifyStore(backupPath);
        if (
            readback.recordCount !== source.recordCount ||
            readback.lastSequence !== source.lastSequence ||
            readback.journalDigest !== source.journalDigest
        ) {
            fail('backup_readback_mismatch', 'backup count or digest differs from the source');
        }
        return {
            path: backupPath,
            createdAt: now,
            fileCount: readback.fileCount,
            recordCount: readback.recordCount,
            lastSequence: readback.lastSequence,
            journalDigest: readback.journalDigest,
        };
    } catch (error) {
        rmSync(backupPath, { recursive: true, force: true });
        throw error;
    } finally {
        release();
    }
}

function requireOwnedBackupPath(storePath, backupPath) {
    let storeRoot;
    let backupRoot;
    let candidate;
    try {
        storeRoot = realpathSync(resolve(storePath));
        backupRoot = realpathSync(resolve(storePath, 'backups'));
        candidate = realpathSync(resolve(requireStorePath(backupPath)));
    } catch (error) {
        fail('backup_path_invalid', `cannot resolve backup path: ${error.message}`);
    }
    const backupRootFromStore = relative(storeRoot, backupRoot);
    if (
        !backupRootFromStore ||
        backupRootFromStore.startsWith('..') ||
        isAbsolute(backupRootFromStore)
    ) {
        fail('backup_path_forbidden', 'store backups directory escapes the store root');
    }
    const fromRoot = relative(backupRoot, candidate);
    if (!fromRoot || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
        fail('backup_path_forbidden', 'backupPath must name a child of the store backups directory');
    }
    return candidate;
}

function readContainedBackupFile(storePath, backupPath, fileName, encoding = 'utf8') {
    const candidate = requireOwnedBackupPath(storePath, backupPath);
    let canonicalFile;
    try {
        canonicalFile = realpathSync(join(candidate, fileName));
    } catch (error) {
        fail('backup_file_unreadable', `cannot resolve backup ${fileName}: ${error.message}`);
    }
    const fromCandidate = relative(candidate, canonicalFile);
    if (!fromCandidate || fromCandidate.startsWith('..') || isAbsolute(fromCandidate)) {
        fail('backup_path_forbidden', `backup ${fileName} escapes the selected backup`);
    }

    let descriptor;
    try {
        descriptor = openSync(canonicalFile, 'r');
        const openedStat = fstatSync(descriptor);
        const revalidatedCandidate = requireOwnedBackupPath(storePath, backupPath);
        const revalidatedFile = realpathSync(canonicalFile);
        const currentFromCandidate = relative(revalidatedCandidate, revalidatedFile);
        const pathStat = statSync(revalidatedFile);
        if (
            !currentFromCandidate ||
            currentFromCandidate.startsWith('..') ||
            isAbsolute(currentFromCandidate) ||
            (process.platform !== 'win32' && openedStat.dev !== pathStat.dev) ||
            openedStat.ino !== pathStat.ino
        ) {
            fail('backup_path_changed', `backup ${fileName} changed during containment validation`);
        }
        return encoding === null
            ? readFileSync(descriptor)
            : readFileSync(descriptor, encoding);
    } catch (error) {
        if (error instanceof StoreError) throw error;
        fail('backup_file_unreadable', `cannot read backup ${fileName}: ${error.message}`);
    } finally {
        if (descriptor !== undefined) closeSync(descriptor);
    }
}

function restoreBackup(storePath, backupPath, options, fallbackOptions) {
    const { now, storeOptions } = optionsForMaintenance(options, fallbackOptions);
    const release = acquireWriteLock(
        storePath,
        `restore-backup-${randomUUID()}`,
        storeOptions,
    );
    try {
        const backupJournal = readContainedBackupFile(
            storePath,
            backupPath,
            'journal.ndjson',
            null,
        );
        const backupManifestBytes = readContainedBackupFile(
            storePath,
            backupPath,
            'manifest.json',
        );
        const backupIndexBytes = readContainedBackupFile(
            storePath,
            backupPath,
            'index.json',
        );
        let backupManifest;
        let backupIndex;
        try {
            backupManifest = JSON.parse(backupManifestBytes);
            backupIndex = JSON.parse(backupIndexBytes);
        } catch (error) {
            fail('store_json_invalid', `backup metadata is not valid JSON: ${error.message}`);
        }
        const backup = verifyStoreSnapshot(backupManifest, backupIndex, backupJournal);
        const currentJournal = readFileSync(join(storePath, 'journal.ndjson'));
        if (!currentJournal.equals(backupJournal)) {
            fail(
                'backup_journal_mismatch',
                'backup journal does not exactly match the retained append-only journal',
            );
        }

        const liveManifest = readJson(join(storePath, 'manifest.json'), 'manifest.json');
        validateManifest(liveManifest, 'manifest.json');
        validateManifest(backupManifest, 'backup manifest.json');
        if (
            backupManifest.storeId !== liveManifest.storeId ||
            backupManifest.createdAt !== liveManifest.createdAt ||
            backupManifest.lastMigrationId !== liveManifest.lastMigrationId
        ) {
            fail(
                'backup_provenance_mismatch',
                'backup manifest provenance does not match the live store',
            );
        }
        writeAtomicJson(join(storePath, 'index.json'), backupIndex);
        writeAtomicJson(join(storePath, 'manifest.json'), backupManifest);
        const readback = verifyStore(storePath);
        return {
            path: requireOwnedBackupPath(storePath, backupPath),
            restoredAt: now,
            restoredFileCount: 2,
            backupFileCount: backup.fileCount,
            recordCount: readback.recordCount,
            lastSequence: readback.lastSequence,
            journalDigest: readback.journalDigest,
        };
    } finally {
        release();
    }
}

class FileLongHorizonStore {
    constructor(storePath, options) {
        this.path = requireStorePath(storePath);
        this.options = normalizeStoreOptions(options);
    }

    verify() {
        return verifyStore(this.path);
    }

    append(operation) {
        return appendOperation(this.path, operation, this.options);
    }

    createBackup(options) {
        return createBackup(this.path, options, this.options);
    }

    restoreBackup(backupPath, options) {
        return restoreBackup(this.path, backupPath, options, this.options);
    }
}

function openStore(storePath, options) {
    const store = new FileLongHorizonStore(storePath, options);
    store.verify();
    return store;
}

module.exports = {
    FileLongHorizonStore,
    StoreError,
    openStore,
    migrateStore,
    rebuildIndex,
    verifyStore,
};
