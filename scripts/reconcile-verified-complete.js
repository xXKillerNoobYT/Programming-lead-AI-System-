#!/usr/bin/env node
'use strict';

const { readFileSync } = require('node:fs');
const {
    applyReconciliationPlan,
    planReconciliationBatch,
} = require('../lib/verified-complete-reconciler.js');

const USAGE = `Usage: node scripts/reconcile-verified-complete.js --snapshot <path> [options]

Plans against an offline normalized snapshot in dry-run mode by default.

Options:
  --now <RFC3339>           Evaluation time (defaults to current time)
  --max-actions <1-100>     Bound the deterministic action batch
  --apply                   Request application of the plan
  --enable-mutation         Second explicit mutation enable
  --help                    Show this help

Apply mode also requires an adapter injected by a trusted embedding process.
`;

function parseIntegerFlag(flag, value, minimum, maximum) {
    if (!/^\d+$/.test(value || '')) throw new Error(`invalid-integer:${flag}`);
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new Error(`invalid-integer:${flag}`);
    }
    return parsed;
}

function parseArgs(argv) {
    const parsed = {
        snapshotPath: null,
        now: null,
        maxActions: undefined,
        apply: false,
        enableMutation: false,
        help: false,
    };

    const seen = new Set();

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (![
            '--snapshot',
            '--now',
            '--max-actions',
            '--apply',
            '--enable-mutation',
            '--help',
        ].includes(token)) {
            throw new Error(`unknown-argument:${token}`);
        }
        if (seen.has(token)) throw new Error(`duplicate-argument:${token}`);
        seen.add(token);

        if (['--apply', '--enable-mutation', '--help'].includes(token)) {
            if (token === '--apply') parsed.apply = true;
            if (token === '--enable-mutation') parsed.enableMutation = true;
            if (token === '--help') parsed.help = true;
            continue;
        }

        const value = argv[index + 1];
        if (!value || value.startsWith('--')) throw new Error(`missing-value:${token}`);
        index += 1;
        if (token === '--snapshot') parsed.snapshotPath = value;
        if (token === '--now') parsed.now = value;
        if (token === '--max-actions') {
            parsed.maxActions = parseIntegerFlag(token, value, 1, 100);
        }
    }

    if (parsed.help) return parsed;
    if (!parsed.snapshotPath) throw new Error('missing-snapshot');
    if (parsed.apply && !parsed.enableMutation) throw new Error('mutation-enable-required');
    if (parsed.enableMutation && !parsed.apply) throw new Error('apply-required');
    return parsed;
}

async function runCli(argv, deps = {}) {
    const stdout = deps.stdout || ((value) => process.stdout.write(value));
    const stderr = deps.stderr || ((value) => process.stderr.write(value));
    const readSnapshot = deps.readSnapshot
        || ((path) => JSON.parse(readFileSync(path, 'utf8')));
    const applyPlan = deps.applyPlan || applyReconciliationPlan;

    try {
        const args = parseArgs(argv);
        if (args.help) {
            stdout(USAGE);
            return 0;
        }
        if (args.apply && !deps.adapter) throw new Error('injected-adapter-required');

        const snapshot = await readSnapshot(args.snapshotPath);
        const plan = planReconciliationBatch(snapshot, {
            now: args.now || undefined,
            maxActions: args.maxActions,
        });
        if (!args.apply) {
            stdout(`${JSON.stringify({ mode: 'dry-run', applied: false, plan }, null, 2)}\n`);
            return plan.blocked || plan.blockedItems.length > 0 ? 1 : 0;
        }

        if (plan.blocked || plan.blockedItems.length > 0) {
            stdout(`${JSON.stringify({ mode: 'apply', applied: false, plan }, null, 2)}\n`);
            return 1;
        }
        const result = await applyPlan(plan, deps.adapter, {
            enabled: true,
            now: args.now || undefined,
        });
        stdout(`${JSON.stringify({
            mode: 'apply',
            applied: result.applied === true,
            plan,
            result,
        }, null, 2)}\n`);
        return result.ok === true ? 0 : 1;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        stderr(`${JSON.stringify({ error: message })}\n`);
        return 2;
    }
}

module.exports = {
    USAGE,
    parseArgs,
    runCli,
};

if (require.main === module) {
    runCli(process.argv.slice(2)).then((exitCode) => {
        process.exitCode = exitCode;
    });
}
