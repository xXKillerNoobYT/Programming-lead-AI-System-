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

function requireHttp(http) {
    if (typeof http !== 'function') {
        throw new TypeError('http is required and must be a function');
    }
    return http;
}

function normalizeWatermark(value, scopeKey) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('source watermark is required');
    }
    if (value.sourceKind !== 'paperclip') {
        throw new TypeError('source watermark source kind must be paperclip');
    }
    if (value.scopeKey !== scopeKey) {
        throw new TypeError('source watermark scope must match Paperclip company scope');
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

function blockerId(blocker) {
    if (typeof blocker === 'string') return blocker;
    if (blocker && typeof blocker === 'object') {
        return blocker.id || blocker.sourceIssueId;
    }
    return null;
}

function rawBlockers(issue) {
    if (Array.isArray(issue.blockedBy)) return issue.blockedBy;
    if (Array.isArray(issue.blockers)) return issue.blockers;
    if (Array.isArray(issue.blockedByIssueIds)) return issue.blockedByIssueIds;
    return [];
}

function mapIssue(issue, { scopeKey, projectId }) {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
        throw new TypeError('Paperclip issue response must be an object');
    }
    if (issue.sourceKind != null && issue.sourceKind !== 'paperclip') {
        throw new TypeError('Paperclip source kind mismatch');
    }
    if (issue.companyId != null && issue.companyId !== scopeKey) {
        throw new TypeError('Paperclip company scope mismatch');
    }
    if (issue.projectId !== projectId) {
        throw new TypeError('Paperclip project mismatch');
    }
    const sourceIssueId = requireString(issue.id || issue.sourceIssueId, 'issue.id');
    return normalizeSourceIssueSnapshot({
        schemaVersion: 1,
        issueKey: `paperclip:${scopeKey}:${sourceIssueId}`,
        sourceKind: 'paperclip',
        scopeKey,
        sourceIssueId,
        identifier: requireString(issue.identifier, 'issue.identifier'),
        title: requireString(issue.title, 'issue.title'),
        operationalStatus: requireString(
            issue.status || issue.operationalStatus,
            'issue.status',
        ),
        createdAt: requireString(issue.createdAt, 'issue.createdAt'),
        updatedAt: requireString(issue.updatedAt, 'issue.updatedAt'),
        blockerIssueKeys: rawBlockers(issue).map((blocker) => {
            const id = blockerId(blocker);
            if (!id) throw new TypeError('Paperclip blocker is missing an issue id');
            if (blocker && typeof blocker === 'object') {
                if (blocker.companyId != null && blocker.companyId !== scopeKey) {
                    throw new TypeError('Paperclip blocker company scope mismatch');
                }
                if (blocker.projectId != null && blocker.projectId !== projectId) {
                    throw new TypeError('Paperclip blocker project mismatch');
                }
            }
            return `paperclip:${scopeKey}:${id}`;
        }),
    });
}

function unwrap(response, scopeKey) {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
        throw new TypeError('Paperclip HTTP response must be an object');
    }
    return {
        data: response.data,
        sourceWatermark: normalizeWatermark(response.sourceWatermark, scopeKey),
    };
}

async function readIssue({ http, scopeKey, projectId, issueId } = {}) {
    const request = requireHttp(http);
    const company = requireString(scopeKey, 'scopeKey');
    const project = requireString(projectId, 'projectId');
    const id = requireString(issueId, 'issueId');
    const response = unwrap(await request({
        method: 'GET',
        path: `/api/issues/${encodeURIComponent(id)}`,
    }), company);
    return {
        sourceSnapshot: mapIssue(response.data, { scopeKey: company, projectId: project }),
        sourceWatermark: response.sourceWatermark,
    };
}

async function listIssues({ http, scopeKey, projectId } = {}) {
    const request = requireHttp(http);
    const company = requireString(scopeKey, 'scopeKey');
    const project = requireString(projectId, 'projectId');
    const response = unwrap(await request({
        method: 'GET',
        path: `/api/companies/${encodeURIComponent(company)}/issues?projectId=${encodeURIComponent(project)}`,
    }), company);
    return {
        items: requireArray(response.data, 'Paperclip issue list')
            .map((issue) => mapIssue(issue, { scopeKey: company, projectId: project })),
        sourceWatermark: response.sourceWatermark,
    };
}

async function readDependencyGraph(options = {}) {
    const request = requireHttp(options.http);
    const company = requireString(options.scopeKey, 'scopeKey');
    const project = requireString(options.projectId, 'projectId');
    const id = requireString(options.issueId, 'issueId');
    const rootResponse = unwrap(await request({
        method: 'GET',
        path: `/api/issues/${encodeURIComponent(id)}`,
    }), company);
    const issue = mapIssue(rootResponse.data, { scopeKey: company, projectId: project });
    const sourceById = new Map();
    for (const blocker of rawBlockers(rootResponse.data)) {
        if (blocker && typeof blocker === 'object') {
            const mapped = mapIssue(blocker, {
                scopeKey: company,
                projectId: project,
            });
            sourceById.set(mapped.sourceIssueId, mapped);
        }
    }
    const dependencies = [];
    for (const issueKey of issue.blockerIssueKeys) {
        const id = issueKey.split(':').at(-1);
        let dependency = sourceById.get(id);
        if (!dependency) {
            const dependencyResult = await readIssue({ ...options, issueId: id });
            if (dependencyResult.sourceWatermark !== rootResponse.sourceWatermark) {
                if (JSON.stringify(dependencyResult.sourceWatermark) !== JSON.stringify(
                    rootResponse.sourceWatermark,
                )) {
                    throw new TypeError('Paperclip dependency watermark mismatch');
                }
            }
            dependency = dependencyResult.sourceSnapshot;
        }
        dependencies.push(dependency);
    }
    return {
        issue,
        dependencies,
        sourceWatermark: rootResponse.sourceWatermark,
    };
}

module.exports = {
    readIssue,
    listIssues,
    readDependencyGraph,
};
