'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const FIXTURE_DIR = join(__dirname, 'fixtures', 'long-horizon');

function readFixture(name) {
    return JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8'));
}

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
    return value;
}

function projectionInput(overrides = {}) {
    const blocked = readFixture('blocked-chain-8d.json');
    const contracts = readFixture('contracts-valid.json');
    return {
        sourceSnapshot: blocked.issue,
        localRecord: contracts.integrityRecord,
        dependencies: blocked.dependencies,
        events: blocked.events,
        leases: blocked.leases,
        families: [],
        policy: blocked.policy,
        now: blocked.now,
        sourceWatermark: blocked.sourceWatermark,
        ...overrides,
    };
}

function paperclipIssue(overrides = {}) {
    return {
        id: 'issue-42',
        identifier: 'DEMO-42',
        title: 'Sanitized blocked chain',
        status: 'blocked',
        companyId: 'company-demo',
        projectId: 'project-demo',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-03T00:00:00.000Z',
        blockedBy: [],
        ...overrides,
    };
}

function githubIssue(number, overrides = {}) {
    return {
        number,
        title: `Sanitized GitHub issue ${number}`,
        state: 'open',
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-03T00:00:00.000Z',
        repository_url: 'https://api.github.com/repos/demo/repo',
        ...overrides,
    };
}

const SOURCE_WATERMARK = deepFreeze({
    sourceKind: 'paperclip',
    scopeKey: 'company-demo',
    cursor: 'cursor-demo-0001',
    observedAt: '2026-08-11T00:00:00.000Z',
    snapshotDigest: 'sha256:' + 'b'.repeat(64),
});

const GITHUB_WATERMARK = deepFreeze({
    sourceKind: 'github',
    scopeKey: 'demo/repo',
    cursor: 'github-cursor-demo-0001',
    observedAt: '2026-08-11T00:00:00.000Z',
    snapshotDigest: 'sha256:' + 'c'.repeat(64),
});

describe('canonical issue-integrity projection and serializers', () => {
    test('composes one deterministic projection without mutating the fixed fixture', () => {
        const {
            evaluateIssueIntegrity,
        } = require('../lib/long-horizon/projection.js');
        const input = deepFreeze(projectionInput());
        const before = JSON.stringify(input);

        const projection = evaluateIssueIntegrity(input);

        assert.equal(JSON.stringify(input), before);
        assert.deepEqual(projection, {
            schemaVersion: 1,
            policyVersion: 'issue-integrity-v1',
            issue: {
                issueKey: 'paperclip:company-demo:issue-42',
                sourceKind: 'paperclip',
                scopeKey: 'company-demo',
                sourceIssueId: 'issue-42',
                identifier: 'DEMO-42',
                title: 'Sanitized blocked chain',
                operationalStatus: 'blocked',
                createdAt: '2026-08-01T00:00:00.000Z',
                updatedAt: '2026-08-03T00:00:00.000Z',
            },
            lifecycle: {
                state: 'verified',
                closeAllowed: true,
                reasons: [],
            },
            attention: {
                ...readFixture('blocked-chain-8d.json').expected.attention,
                sourceWatermark: SOURCE_WATERMARK,
            },
            recurrence: {
                familyId: null,
                candidates: [],
            },
            evaluatedAt: '2026-08-11T00:00:00.000Z',
            sourceWatermark: SOURCE_WATERMARK,
        });
    });

    test('emits byte-equivalent canonical item fields through JSON, list, and NDJSON', () => {
        const {
            evaluateIssueIntegrity,
            serializeProjection,
            serializeProjectionList,
            serializeProjectionNdjson,
        } = require('../lib/long-horizon/projection.js');
        const projection = evaluateIssueIntegrity(deepFreeze(projectionInput()));
        const originalDateNow = Date.now;
        const originalDate = global.Date;
        Date.now = () => {
            throw new Error('serializers must not read time');
        };
        global.Date = class DateForbidden extends originalDate {
            constructor(...args) {
                if (args.length === 0) throw new Error('serializers must not construct current time');
                super(...args);
            }

            static now() {
                throw new Error('serializers must not read time');
            }
        };

        try {
            const jsonItem = JSON.parse(serializeProjection(projection));
            const list = JSON.parse(serializeProjectionList([projection]));
            const ndjsonLines = serializeProjectionNdjson([projection])
                .trimEnd()
                .split('\n')
                .map((line) => JSON.parse(line));

            assert.deepEqual(jsonItem, projection);
            assert.deepEqual(list, {
                schemaVersion: projection.schemaVersion,
                policyVersion: projection.policyVersion,
                evaluatedAt: projection.evaluatedAt,
                sourceWatermark: projection.sourceWatermark,
                items: [projection],
            });
            assert.deepEqual(ndjsonLines, [projection]);
            assert.equal(JSON.stringify(list.items[0]), JSON.stringify(jsonItem));
            assert.equal(JSON.stringify(ndjsonLines[0]), JSON.stringify(jsonItem));
        } finally {
            global.Date = originalDate;
            Date.now = originalDateNow;
        }
    });

    test('fails closed for source kind, scope, project, and list-envelope mismatches', () => {
        const {
            evaluateIssueIntegrity,
            serializeProjection,
            serializeProjectionList,
        } = require('../lib/long-horizon/projection.js');
        const baseline = projectionInput();

        assert.throws(
            () => evaluateIssueIntegrity({
                ...baseline,
                localRecord: {
                    ...baseline.localRecord,
                    issueKey: 'github:company-demo:issue-42',
                },
            }),
            /localRecord issueKey must match sourceSnapshot issueKey/,
        );
        assert.throws(
            () => evaluateIssueIntegrity({
                ...baseline,
                sourceWatermark: {
                    ...baseline.sourceWatermark,
                    scopeKey: 'different-company',
                },
            }),
            /sourceWatermark sourceKind and scopeKey must match issue/,
        );
        assert.throws(
            () => evaluateIssueIntegrity({
                ...baseline,
                dependencies: [{
                    ...baseline.dependencies[0],
                    issueKey: 'github:demo/repo:7',
                    sourceKind: 'github',
                    scopeKey: 'demo/repo',
                    sourceIssueId: '7',
                }],
            }),
            /dependencies\[0\] source kind and scope must match sourceSnapshot/,
        );
        assert.throws(
            () => evaluateIssueIntegrity({
                ...baseline,
                events: [{
                    ...baseline.events[0],
                    issueKey: 'github:demo/repo:7',
                }],
            }),
            /events\[0\] source kind and scope must match sourceSnapshot/,
        );

        const first = evaluateIssueIntegrity(baseline);
        const second = structuredClone(first);
        second.sourceWatermark = {
            ...second.sourceWatermark,
            cursor: 'different-cursor',
        };
        second.attention.sourceWatermark = second.sourceWatermark;
        assert.throws(
            () => serializeProjectionList([first, second]),
            /all projections in a list must share one canonical envelope/,
        );
        assert.throws(
            () => serializeProjection({
                ...first,
                issue: {
                    ...first.issue,
                    issueKey: 'github:demo/repo:42',
                    sourceKind: 'github',
                    scopeKey: 'demo/repo',
                },
            }),
            /projection source identity must match its watermark/,
        );
    });
});

describe('Paperclip read-only source adapter', () => {
    test('exports only reads and preserves normalized source watermark/cursor', async () => {
        const adapter = require('../lib/long-horizon/adapters/paperclip.js');
        assert.deepEqual(
            Object.keys(adapter).sort(),
            ['listIssues', 'readDependencyGraph', 'readIssue'],
        );

        const dependency = paperclipIssue({
            id: 'issue-7',
            identifier: 'DEMO-7',
            title: 'Sanitized dependency',
            status: 'in_progress',
        });
        const issue = paperclipIssue({ blockedBy: [dependency] });
        const calls = [];
        const http = async (request) => {
            calls.push(request);
            if (request.path.includes('/companies/')) {
                return { data: [issue, dependency], sourceWatermark: SOURCE_WATERMARK };
            }
            return { data: issue, sourceWatermark: SOURCE_WATERMARK };
        };
        const common = {
            http,
            scopeKey: 'company-demo',
            projectId: 'project-demo',
        };

        const single = await adapter.readIssue({ ...common, issueId: 'issue-42' });
        const list = await adapter.listIssues(common);
        const graph = await adapter.readDependencyGraph({ ...common, issueId: 'issue-42' });

        assert.equal(single.sourceWatermark, SOURCE_WATERMARK);
        assert.equal(list.sourceWatermark, SOURCE_WATERMARK);
        assert.equal(graph.sourceWatermark, SOURCE_WATERMARK);
        assert.equal(single.sourceWatermark.cursor, 'cursor-demo-0001');
        assert.deepEqual(single.sourceSnapshot.blockerIssueKeys, [
            'paperclip:company-demo:issue-7',
        ]);
        assert.deepEqual(list.items.map((item) => item.issueKey), [
            'paperclip:company-demo:issue-42',
            'paperclip:company-demo:issue-7',
        ]);
        assert.deepEqual(graph, {
            issue: single.sourceSnapshot,
            dependencies: [
                {
                    ...single.sourceSnapshot,
                    issueKey: 'paperclip:company-demo:issue-7',
                    sourceIssueId: 'issue-7',
                    identifier: 'DEMO-7',
                    title: 'Sanitized dependency',
                    operationalStatus: 'in_progress',
                    blockerIssueKeys: [],
                },
            ],
            sourceWatermark: SOURCE_WATERMARK,
        });
        assert.ok(calls.every((call) => call.method === 'GET'));
        assert.equal(calls.length, 3, 'dependency graph must consume one coherent root read');
    });

    test('rejects source kind, company scope, and project mismatches before returning facts', async () => {
        const { readIssue } = require('../lib/long-horizon/adapters/paperclip.js');
        const common = {
            scopeKey: 'company-demo',
            projectId: 'project-demo',
            issueId: 'issue-42',
        };
        const mismatches = [
            paperclipIssue({ sourceKind: 'github' }),
            paperclipIssue({ companyId: 'different-company' }),
            paperclipIssue({ projectId: 'different-project' }),
        ];

        for (const data of mismatches) {
            await assert.rejects(
                () => readIssue({
                    ...common,
                    http: async () => ({ data, sourceWatermark: SOURCE_WATERMARK }),
                }),
                /source kind|scope|project/i,
            );
        }

        await assert.rejects(
            () => readIssue({
                ...common,
                http: async () => ({
                    data: paperclipIssue(),
                    sourceWatermark: { ...SOURCE_WATERMARK, token: 'not-retained' },
                }),
            }),
            /sourceWatermark\.token is not allowed/,
        );

        const { readDependencyGraph } = require('../lib/long-horizon/adapters/paperclip.js');
        await assert.rejects(
            () => readDependencyGraph({
                ...common,
                http: async ({ path }) => ({
                    data: path.endsWith('/issue-42')
                        ? paperclipIssue({ blockedBy: ['issue-7'] })
                        : paperclipIssue({
                            id: 'issue-7',
                            identifier: 'DEMO-7',
                            title: 'Sanitized dependency',
                        }),
                    sourceWatermark: path.endsWith('/issue-42')
                        ? SOURCE_WATERMARK
                        : { ...SOURCE_WATERMARK, cursor: 'different-cursor' },
                }),
            }),
            /dependency watermark mismatch/,
        );
    });
});

describe('GitHub read-only source adapter', () => {
    test('uses injected read runner and local relations without exposing mutations', async () => {
        const adapter = require('../lib/long-horizon/adapters/github.js');
        assert.deepEqual(
            Object.keys(adapter).sort(),
            ['listIssues', 'readDependencyGraph', 'readIssue'],
        );

        const calls = [];
        const runner = async (args) => {
            calls.push(args);
            if (args.includes('--paginate')) {
                return {
                    data: [githubIssue(42), githubIssue(7)],
                    sourceWatermark: GITHUB_WATERMARK,
                };
            }
            const number = Number(args.at(-1).split('/').at(-1));
            return {
                data: githubIssue(number),
                sourceWatermark: GITHUB_WATERMARK,
            };
        };
        const common = {
            runner,
            scopeKey: 'demo/repo',
            projectId: 'project-demo',
            relations: [{
                sourceKind: 'github',
                scopeKey: 'demo/repo',
                projectId: 'project-demo',
                sourceIssueId: '42',
                blockerSourceIssueIds: ['7'],
            }],
        };

        const single = await adapter.readIssue({ ...common, issueId: '42' });
        const list = await adapter.listIssues(common);
        const graph = await adapter.readDependencyGraph({ ...common, issueId: '42' });

        assert.equal(single.sourceWatermark, GITHUB_WATERMARK);
        assert.deepEqual(single.sourceSnapshot.blockerIssueKeys, ['github:demo/repo:7']);
        assert.deepEqual(list.items.map((item) => item.issueKey), [
            'github:demo/repo:42',
            'github:demo/repo:7',
        ]);
        assert.equal(graph.dependencies[0].issueKey, 'github:demo/repo:7');
        assert.equal(graph.sourceWatermark.cursor, 'github-cursor-demo-0001');
        assert.ok(calls.every((args) => args[0] === 'api'));
        assert.ok(calls.flat().every((arg) => !/edit|close|merge|reopen|comment/i.test(arg)));
    });

    test('rejects source, repository scope, relation project, and watermark mismatches', async () => {
        const { readIssue } = require('../lib/long-horizon/adapters/github.js');
        const base = {
            scopeKey: 'demo/repo',
            projectId: 'project-demo',
            issueId: '42',
            relations: [],
        };
        const cases = [
            {
                data: githubIssue(42, { sourceKind: 'paperclip' }),
                watermark: GITHUB_WATERMARK,
                relations: [],
            },
            {
                data: githubIssue(42, {
                    repository_url: 'https://api.github.com/repos/different/repo',
                }),
                watermark: GITHUB_WATERMARK,
                relations: [],
            },
            {
                data: githubIssue(42),
                watermark: GITHUB_WATERMARK,
                relations: [{
                    sourceKind: 'github',
                    scopeKey: 'demo/repo',
                    projectId: 'different-project',
                    sourceIssueId: '42',
                    blockerSourceIssueIds: [],
                }],
            },
            {
                data: githubIssue(42),
                watermark: { ...GITHUB_WATERMARK, scopeKey: 'different/repo' },
                relations: [],
            },
        ];

        for (const fixtureCase of cases) {
            await assert.rejects(
                () => readIssue({
                    ...base,
                    relations: fixtureCase.relations,
                    runner: async () => ({
                        data: fixtureCase.data,
                        sourceWatermark: fixtureCase.watermark,
                    }),
                }),
                /source kind|scope|project|watermark/i,
            );
        }

        await assert.rejects(
            () => readIssue({
                ...base,
                runner: async () => ({
                    data: githubIssue(42),
                    sourceWatermark: { ...GITHUB_WATERMARK, accessToken: 'not-retained' },
                }),
            }),
            /sourceWatermark\.accessToken is not allowed/,
        );
    });
});

describe('supported long-horizon public contract', () => {
    test('re-exports the approved contracts, store, evaluators, projection, and read adapters', () => {
        const publicContract = require('../lib/long-horizon/index.js');
        for (const symbol of [
            'normalizeSourceIssueSnapshot',
            'evaluateAttention',
            'deriveLifecycleState',
            'evaluateCloseGate',
            'buildFingerprints',
            'rankRecurrenceCandidates',
            'openStore',
            'migrateStore',
            'evaluateIssueIntegrity',
            'serializeProjection',
            'serializeProjectionList',
            'serializeProjectionNdjson',
            'paperclip',
            'github',
        ]) {
            assert.ok(Object.prototype.hasOwnProperty.call(publicContract, symbol), symbol);
        }
        assert.deepEqual(Object.keys(publicContract.paperclip).sort(), [
            'listIssues',
            'readDependencyGraph',
            'readIssue',
        ]);
        assert.deepEqual(Object.keys(publicContract.github).sort(), [
            'listIssues',
            'readDependencyGraph',
            'readIssue',
        ]);
    });
});
