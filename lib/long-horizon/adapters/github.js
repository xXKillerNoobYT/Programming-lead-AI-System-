'use strict';

const { normalizeSourceIssueSnapshot } = require('../contracts.js');

function requireString(value, name) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new TypeError(`${name} is required and must be a non-empty string`);
    }
    return value.trim();
}

function requireArray(value, name) {
    if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
    return value;
}

function requireRunner(runner) {
    if (typeof runner !== 'function') {
        throw new TypeError('runner is required and must be a function');
    }
    return runner;
}

function normalizeWatermark(value, scopeKey) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('source watermark is required');
    }
    if (value.sourceKind !== 'github') {
        throw new TypeError('source watermark source kind must be github');
    }
    if (value.scopeKey !== scopeKey) {
        throw new TypeError('source watermark scope must match GitHub repository scope');
    }
    const allowed = ['sourceKind', 'scopeKey', 'cursor', 'observedAt', 'snapshotDigest'];
    for (const field of Object.keys(value)) {
        if (!allowed.includes(field)) {
            throw new TypeError(`sourceWatermark.${field} is not allowed`);
        }
    }
    for (const field of ['cursor', 'observedAt', 'snapshotDigest']) {
        requireString(value[field], `sourceWatermark.${field}`);
    }
    return value;
}

function issueRepositoryScope(issue) {
    if (typeof issue.repository_url === 'string') {
        const marker = '/repos/';
        const index = issue.repository_url.indexOf(marker);
        if (index >= 0) return issue.repository_url.slice(index + marker.length);
    }
    if (issue.repository && typeof issue.repository.full_name === 'string') {
        return issue.repository.full_name;
    }
    return null;
}

function relationFor(relations, sourceIssueId, context) {
    const matches = requireArray(relations, 'relations')
        .filter((relation) => String(relation.sourceIssueId) === sourceIssueId);
    for (const relation of matches) {
        if (relation.sourceKind !== 'github') {
            throw new TypeError('GitHub relation source kind mismatch');
        }
        if (relation.scopeKey !== context.scopeKey) {
            throw new TypeError('GitHub relation repository scope mismatch');
        }
        if (relation.projectId !== context.projectId) {
            throw new TypeError('GitHub relation project mismatch');
        }
    }
    if (matches.length > 1) {
        throw new TypeError('multiple GitHub relation records exist for one source issue');
    }
    return matches[0] || null;
}

function mapIssue(issue, context) {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
        throw new TypeError('GitHub issue response must be an object');
    }
    if (issue.sourceKind != null && issue.sourceKind !== 'github') {
        throw new TypeError('GitHub source kind mismatch');
    }
    const repositoryScope = issueRepositoryScope(issue);
    if (repositoryScope !== context.scopeKey) {
        throw new TypeError('GitHub repository scope mismatch');
    }
    const sourceIssueId = requireString(String(issue.number), 'issue.number');
    const relation = relationFor(context.relations, sourceIssueId, context);
    const blockerSourceIssueIds = relation
        ? requireArray(relation.blockerSourceIssueIds, 'relation.blockerSourceIssueIds')
        : [];
    const operationalStatus = issue.state === 'closed' ? 'closed' : 'open';
    return normalizeSourceIssueSnapshot({
        schemaVersion: 1,
        issueKey: `github:${context.scopeKey}:${sourceIssueId}`,
        sourceKind: 'github',
        scopeKey: context.scopeKey,
        sourceIssueId,
        identifier: `#${sourceIssueId}`,
        title: requireString(issue.title, 'issue.title'),
        operationalStatus,
        createdAt: requireString(issue.created_at, 'issue.created_at'),
        updatedAt: requireString(issue.updated_at, 'issue.updated_at'),
        blockerIssueKeys: blockerSourceIssueIds.map((blockerId) => (
            `github:${context.scopeKey}:${requireString(String(blockerId), 'blockerSourceIssueId')}`
        )),
    });
}

function unwrap(response, scopeKey) {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
        throw new TypeError('GitHub runner response must be an object');
    }
    return {
        data: response.data,
        sourceWatermark: normalizeWatermark(response.sourceWatermark, scopeKey),
    };
}

function contextFrom(options) {
    return {
        runner: requireRunner(options.runner),
        scopeKey: requireString(options.scopeKey, 'scopeKey'),
        projectId: requireString(options.projectId, 'projectId'),
        relations: options.relations == null ? [] : requireArray(options.relations, 'relations'),
    };
}

async function readIssue(options = {}) {
    const context = contextFrom(options);
    const issueId = requireString(String(options.issueId), 'issueId');
    const response = unwrap(await context.runner([
        'api',
        `repos/${context.scopeKey}/issues/${issueId}`,
    ]), context.scopeKey);
    return {
        sourceSnapshot: mapIssue(response.data, context),
        sourceWatermark: response.sourceWatermark,
    };
}

async function listIssues(options = {}) {
    const context = contextFrom(options);
    const response = unwrap(await context.runner([
        'api',
        `repos/${context.scopeKey}/issues`,
        '--paginate',
    ]), context.scopeKey);
    return {
        items: requireArray(response.data, 'GitHub issue list')
            .map((issue) => mapIssue(issue, context)),
        sourceWatermark: response.sourceWatermark,
    };
}

async function readDependencyGraph(options = {}) {
    const issueResult = await readIssue(options);
    const dependencies = [];
    for (const issueKey of issueResult.sourceSnapshot.blockerIssueKeys) {
        const dependencyResult = await readIssue({
            ...options,
            issueId: issueKey.split(':').at(-1),
        });
        if (JSON.stringify(dependencyResult.sourceWatermark) !== JSON.stringify(
            issueResult.sourceWatermark,
        )) {
            throw new TypeError('GitHub dependency watermark mismatch');
        }
        dependencies.push(dependencyResult.sourceSnapshot);
    }
    return {
        issue: issueResult.sourceSnapshot,
        dependencies,
        sourceWatermark: issueResult.sourceWatermark,
    };
}

module.exports = {
    readIssue,
    listIssues,
    readDependencyGraph,
};
