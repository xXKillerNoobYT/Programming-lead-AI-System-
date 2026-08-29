/**
 * Issue #228 — deterministic, non-interactive dashboard lint gate.
 */

const {
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} = require('node:fs');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON = JSON.parse(
    readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'),
);
const ESLINT_CONFIG = path.join(PROJECT_ROOT, '.eslintrc.json');
const NPM_CLI = process.env.npm_execpath;

jest.setTimeout(180_000);

function runLint(extraArgs = []) {
    if (!NPM_CLI) {
        throw new Error('npm_execpath is required to exercise the npm lint gate');
    }

    const npmArgs = [NPM_CLI, 'run', 'check:lint'];
    if (extraArgs.length > 0) {
        npmArgs.push('--', ...extraArgs);
    }

    return spawnSync(process.execPath, npmArgs, {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        env: {
            ...process.env,
            CI: '1',
            FORCE_COLOR: '0',
            NO_COLOR: '1',
        },
        timeout: 120_000,
        windowsHide: true,
    });
}

function combinedOutput(result) {
    return `${result.stdout || ''}${result.stderr || ''}`;
}

describe('Issue #228 — deterministic dashboard lint gate', () => {
    it('owns an explicit ESLint config and uses the ESLint CLI', () => {
        expect(existsSync(ESLINT_CONFIG)).toBe(true);
        expect(PACKAGE_JSON.scripts.lint).toBe('eslint . --max-warnings=0');
        expect(PACKAGE_JSON.scripts['check:lint']).toBe(
            'eslint . --max-warnings=0',
        );
    });

    it('exits zero on clean code without opening a setup prompt', () => {
        const result = runLint();
        const output = combinedOutput(result);

        if (result.error || result.status !== 0) {
            throw new Error(
                `clean lint failed (status ${result.status}):\n${output}`,
                { cause: result.error },
            );
        }
        expect(output).not.toMatch(/How would you like to configure ESLint/i);
    });

    it('exits non-zero for a controlled lint violation without prompting', () => {
        const sandbox = mkdtempSync(
            path.join(os.tmpdir(), 'devlead-lint-gate-'),
        );
        const violationFixture = path.join(sandbox, 'controlled-violation.ts');
        try {
            writeFileSync(
                violationFixture,
                'const intentionallyUnusedValue = 1;\nexport {};\n',
                'utf8',
            );

            const violationResult = runLint([
                '--config',
                ESLINT_CONFIG,
                '--no-ignore',
                violationFixture,
            ]);
            const violationOutput = combinedOutput(violationResult);

            if (violationResult.error || violationResult.status === 0) {
                throw new Error(
                    `controlled lint violation returned status ${violationResult.status}:\n${violationOutput}`,
                    { cause: violationResult.error },
                );
            }
            expect(violationOutput).toMatch(/@typescript-eslint\/no-unused-vars/);
            expect(violationOutput).not.toMatch(
                /How would you like to configure ESLint/i,
            );
        } finally {
            rmSync(sandbox, { recursive: true, force: true });
        }
    });
});
