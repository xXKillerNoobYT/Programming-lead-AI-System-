'use strict';

const { existsSync, readFileSync } = require('node:fs');

function parseEnvText(text) {
    const out = {};
    const lines = String(text || '').split(/\r?\n/);
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith('\'') && value.endsWith('\''))
        ) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

function loadEnvFile(path, options = {}) {
    const override = options.override === true;
    if (!path || !existsSync(path)) return { loaded: false, count: 0 };
    const parsed = parseEnvText(readFileSync(path, 'utf8'));
    let count = 0;
    for (const [k, v] of Object.entries(parsed)) {
        if (override || process.env[k] === undefined) {
            process.env[k] = v;
            count += 1;
        }
    }
    return { loaded: true, count };
}

module.exports = {
    parseEnvText,
    loadEnvFile,
};
