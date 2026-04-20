import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Issue #154 / Phase 3 §D.3.c — Coding-tab inline diff rendering.
 * Issue #168 / Phase 3 §D.3.e — Shiki syntax highlighting integration.
 *
 * Pure DiffBlock unit tests. Integration tests for HandoffThread+DiffBlock
 * and the stopPropagation wrapper live in coding-tab.test.tsx next to the
 * existing HandoffThread / CodingTabContent tests.
 *
 * Shiki mock: per-file `jest.mock('shiki', ...)` keeps other test files that
 * don't load DiffBlock untouched. The mock records what language gets
 * requested so the language-inference tests can assert on it, and resolves
 * asynchronously so the progressive-enhancement test can assert on the
 * pre-resolution fallback state.
 */

// Shared state for the Shiki mock. Tests can `shikiControl.resolve()` to
// release the deferred `createHighlighter` promise and inspect
// `shikiControl.calls` to see which languages were requested.
interface ShikiControl {
    calls: Array<{ code: string; lang: string }>;
    resolve: () => void;
    reset: () => void;
    highlighterResolved: boolean;
}

const shikiControl: ShikiControl = {
    calls: [],
    resolve: () => {},
    reset: () => {},
    highlighterResolved: false,
};

jest.mock('shiki', () => {
    let pendingResolve: ((value: unknown) => void) | null = null;
    const makeDeferred = () => {
        return new Promise((res) => {
            pendingResolve = res;
        });
    };
    let currentDeferred = makeDeferred();

    shikiControl.resolve = () => {
        if (pendingResolve) {
            const r = pendingResolve;
            pendingResolve = null;
            shikiControl.highlighterResolved = true;
            r(undefined);
        }
    };
    shikiControl.reset = () => {
        shikiControl.calls.length = 0;
        shikiControl.highlighterResolved = false;
        pendingResolve = null;
        currentDeferred = makeDeferred();
    };

    const highlighter = {
        codeToHtml: (code: string, options: { lang: string; theme: string }) => {
            shikiControl.calls.push({ code, lang: options.lang });
            // Mock: emit a <span class="shiki-token"> wrapping the escaped
            // code so tests can identify "this was Shiki-highlighted".
            const escaped = code
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<span class="shiki-token" data-lang="${options.lang}">${escaped}</span>`;
        },
    };

    return {
        createHighlighter: jest.fn(async () => {
            await currentDeferred;
            return highlighter;
        }),
    };
});

// `jest.mock` calls are hoisted above imports, so these normal import
// statements see the mocked `shiki` module at require-time.
import { DiffBlock } from '../app/_components/coding/DiffBlock';
import { resetHighlighterForTests } from '../app/_components/coding/shiki-highlighter';
import type { DiffFile } from '../app/_components/coding/types';

const SMALL_PATCH = [
    'diff --git a/src/alpha.ts b/src/alpha.ts',
    '--- a/src/alpha.ts',
    '+++ b/src/alpha.ts',
    '@@ -1,3 +1,5 @@',
    ' context-line',
    '-removed-line-1',
    '+added-line-1',
    '+added-line-2',
].join('\n');

const SMALL_DIFF: DiffFile = {
    path: 'src/alpha.ts',
    added: 5,
    removed: 3,
    patch: SMALL_PATCH,
};

// Tipping-past-the-threshold diff: (30 + 25) = 55 > 50 → collapsed by default.
const LARGE_DIFF: DiffFile = {
    path: 'src/beta.ts',
    added: 30,
    removed: 25,
    patch: [
        '--- a/src/beta.ts',
        '+++ b/src/beta.ts',
        '@@ -1,10 +1,12 @@',
        ' ctx',
        '-old-1',
        '+new-1',
    ].join('\n'),
};

describe('Issue #154 §D.3.c — DiffBlock', () => {
    beforeEach(() => {
        // Reset the Shiki mock so every test starts with a fresh unresolved
        // `createHighlighter` promise AND a fresh singleton in the module
        // under test (so the previous test's resolution doesn't bleed
        // through as an already-loaded highlighter).
        shikiControl.reset();
        resetHighlighterForTests();
    });
    afterEach(cleanup);

    // T1 — path + counts visible in the header.
    it('renders the file path and added/removed counts', () => {
        render(<DiffBlock diff={SMALL_DIFF} />);
        expect(screen.getByText('src/alpha.ts')).toBeInTheDocument();
        // Added / removed summary. Use a loose regex so formatting can evolve
        // ("+5 / -3" vs "+5 -3" etc.) without breaking the test brittle-ly.
        expect(screen.getByText(/\+\s*5/)).toBeInTheDocument();
        expect(screen.getByText(/-\s*3/)).toBeInTheDocument();
    });

    // T2 — small diff (<=50 line-delta) renders expanded by default.
    it('renders expanded by default for small diffs (added + removed <= 50)', () => {
        render(<DiffBlock diff={SMALL_DIFF} />);
        const toggle = screen.getByRole('button', { name: /src\/alpha\.ts/i });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        // Body lines should be present.
        expect(screen.getByText('+added-line-1')).toBeInTheDocument();
    });

    // T3 — large diff (>50 line-delta) renders collapsed by default.
    it('renders collapsed by default for large diffs (added + removed > 50)', () => {
        render(<DiffBlock diff={LARGE_DIFF} />);
        const toggle = screen.getByRole('button', { name: /src\/beta\.ts/i });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        // Body lines should NOT be present.
        expect(screen.queryByText('+new-1')).not.toBeInTheDocument();
    });

    // T4 — toggle button flips expanded state (uncontrolled mode).
    it('flips expanded state when the toggle button is clicked', () => {
        render(<DiffBlock diff={LARGE_DIFF} />);
        const toggle = screen.getByRole('button', { name: /src\/beta\.ts/i });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('+new-1')).toBeInTheDocument();
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    // T5 — per-line color classes for +/-/context/hunk-header/file-header.
    it('applies correct color classes to diff lines', () => {
        render(<DiffBlock diff={SMALL_DIFF} />);
        // Added line — green.
        const added = screen.getByText('+added-line-1');
        expect(added.className).toContain('text-green-400');
        // Removed line — red.
        const removed = screen.getByText('-removed-line-1');
        expect(removed.className).toContain('text-red-400');
        // Hunk header — gray.
        const hunk = screen.getByText('@@ -1,3 +1,5 @@');
        expect(hunk.className).toContain('text-gray-500');
        // File header lines (--- / +++) — also gray (NOT green/red; they
        // start with + / - but are structural, not content).
        const fileMinus = screen.getByText('--- a/src/alpha.ts');
        expect(fileMinus.className).toContain('text-gray-500');
        expect(fileMinus.className).not.toContain('text-red-400');
        const filePlus = screen.getByText('+++ b/src/alpha.ts');
        expect(filePlus.className).toContain('text-gray-500');
        expect(filePlus.className).not.toContain('text-green-400');
    });

    // T6 — controlled mode: `expanded` + `onExpandedChange` honored.
    it('honors controlled expanded + onExpandedChange props', () => {
        const onExpandedChange = jest.fn();
        const { rerender } = render(
            <DiffBlock
                diff={SMALL_DIFF}
                expanded={false}
                onExpandedChange={onExpandedChange}
            />,
        );
        const toggle = screen.getByRole('button', { name: /src\/alpha\.ts/i });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        // Body hidden despite small diff — parent owns the state.
        expect(screen.queryByText('+added-line-1')).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(onExpandedChange).toHaveBeenCalledTimes(1);
        expect(onExpandedChange).toHaveBeenCalledWith(true);
        // Parent hasn't rerendered yet → still shows false.
        expect(toggle).toHaveAttribute('aria-expanded', 'false');

        rerender(
            <DiffBlock
                diff={SMALL_DIFF}
                expanded
                onExpandedChange={onExpandedChange}
            />,
        );
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('+added-line-1')).toBeInTheDocument();
    });
});

/**
 * Issue #168 / Phase 3 §D.3.e — Shiki syntax highlighting.
 *
 * Tests for the new syntax-highlighting behavior added on top of the §D.3.c
 * DiffBlock. These tests rely on the module-level `jest.mock('shiki', ...)`
 * above, which resolves `createHighlighter` only when `shikiControl.resolve()`
 * is called, allowing us to assert on BOTH the pre-resolve fallback state
 * AND the post-resolve highlighted state.
 */

const JS_PATCH = [
    '--- a/src/alpha.js',
    '+++ b/src/alpha.js',
    '@@ -1,3 +1,3 @@',
    ' const x = 1;',
    '-const y = 2;',
    '+const y = 3;',
].join('\n');

const JS_DIFF: DiffFile = {
    path: 'src/alpha.js',
    added: 1,
    removed: 1,
    patch: JS_PATCH,
};

const WEIRD_EXT_DIFF: DiffFile = {
    path: 'README.xyz',
    added: 1,
    removed: 0,
    patch: [
        '--- a/README.xyz',
        '+++ b/README.xyz',
        '@@ -1,1 +1,2 @@',
        ' hello',
        '+world',
    ].join('\n'),
};

describe('Issue #168 §D.3.e — DiffBlock Shiki syntax highlighting', () => {
    beforeEach(() => {
        shikiControl.reset();
        resetHighlighterForTests();
    });
    afterEach(cleanup);

    // T7 — language inferred from path extension (`.js` → 'js').
    it('infers Shiki language from path extension when diff.language is absent', async () => {
        render(<DiffBlock diff={JS_DIFF} />);
        // Release the highlighter so DiffBlock swaps to Shiki output.
        await act(async () => {
            shikiControl.resolve();
        });
        await waitFor(() => {
            expect(shikiControl.calls.length).toBeGreaterThan(0);
        });
        // Every highlighted call for this diff should request lang='js'.
        const contentLangs = shikiControl.calls.map((c) => c.lang);
        expect(contentLangs).toContain('js');
        // And never a non-js language for this .js file.
        for (const lang of contentLangs) {
            expect(lang).toBe('js');
        }
    });

    // T8 — explicit `language` field on DiffFile overrides extension inference.
    it('uses explicit diff.language over extension inference', async () => {
        const overrideDiff: DiffFile = {
            ...JS_DIFF,
            // Same .js path, but force language='ts'. All Shiki calls for
            // code lines should request 'ts'.
            language: 'ts',
        };
        render(<DiffBlock diff={overrideDiff} />);
        await act(async () => {
            shikiControl.resolve();
        });
        await waitFor(() => {
            expect(shikiControl.calls.length).toBeGreaterThan(0);
        });
        for (const call of shikiControl.calls) {
            expect(call.lang).toBe('ts');
        }
    });

    // T9 — unknown extension falls back to 'text'.
    it('falls back to language "text" when the extension is unknown', async () => {
        render(<DiffBlock diff={WEIRD_EXT_DIFF} />);
        await act(async () => {
            shikiControl.resolve();
        });
        await waitFor(() => {
            expect(shikiControl.calls.length).toBeGreaterThan(0);
        });
        for (const call of shikiControl.calls) {
            expect(call.lang).toBe('text');
        }
    });

    // T10 — +/- lines get background tint classes (green-400/10, red-400/10).
    it('applies green/red background tints to added/removed lines', async () => {
        const { container } = render(<DiffBlock diff={SMALL_DIFF} />);
        // Assert on the FALLBACK render (Shiki unresolved) — tint classes
        // are a property of the diff-line wrapper, not of Shiki output, so
        // they must be present regardless of highlighter state.
        const html = container.innerHTML;
        expect(html).toContain('bg-green-400/10');
        expect(html).toContain('bg-red-400/10');

        // Also assert that a specific added/removed line carries the
        // background class via its wrapper (not only free-floating in the
        // DOM). Walk up from the text node's element to find the wrapper.
        const addedText = screen.getByText(/added-line-1/);
        const addedWrapper = addedText.closest('[data-diff-line-kind="added"]');
        expect(addedWrapper).not.toBeNull();
        expect(addedWrapper?.className).toContain('bg-green-400/10');

        const removedText = screen.getByText(/removed-line-1/);
        const removedWrapper = removedText.closest('[data-diff-line-kind="removed"]');
        expect(removedWrapper).not.toBeNull();
        expect(removedWrapper?.className).toContain('bg-red-400/10');
    });

    // T11 — hunk header + file headers stay plain gray, NOT Shiki-highlighted.
    it('does not send hunk/file-header lines through Shiki (plain gray only)', async () => {
        render(<DiffBlock diff={JS_DIFF} />);
        await act(async () => {
            shikiControl.resolve();
        });
        await waitFor(() => {
            // Once resolved, Shiki was called for the CONTENT lines.
            expect(shikiControl.calls.length).toBeGreaterThan(0);
        });
        // The hunk + file-header framing must NEVER have been submitted to
        // Shiki — language-level tokenization of unified-diff framing bytes
        // isn't meaningful.
        for (const call of shikiControl.calls) {
            expect(call.code).not.toMatch(/^@@/);
            expect(call.code).not.toMatch(/^---/);
            expect(call.code).not.toMatch(/^\+\+\+/);
        }
        // And the DOM for those framing lines still shows plain gray.
        const hunk = screen.getByText('@@ -1,3 +1,3 @@');
        expect(hunk.className).toContain('text-gray-500');
    });

    // T12 — progressive enhancement: fallback renders immediately, BEFORE
    // the Shiki highlighter resolves. (If Shiki were awaited synchronously,
    // the expanded body would be empty / a spinner until resolution.)
    it('renders the plain-text fallback before Shiki resolves (progressive enhancement)', () => {
        render(<DiffBlock diff={SMALL_DIFF} />);
        // Mock still has a pending `createHighlighter` promise — NOT resolved.
        expect(shikiControl.highlighterResolved).toBe(false);
        // Despite that, the body is already populated with the parsed lines.
        expect(screen.getByText('+added-line-1')).toBeInTheDocument();
        expect(screen.getByText('-removed-line-1')).toBeInTheDocument();
        // Context line has a leading space — @testing-library/dom's default
        // text normalizer collapses leading/trailing whitespace, so we use
        // `{ normalizer: (s) => s }` to preserve it and match exactly.
        expect(
            screen.getByText('context-line', { exact: false }),
        ).toBeInTheDocument();
        // Shiki was never called because the highlighter never resolved.
        expect(shikiControl.calls.length).toBe(0);
    });
});
