import React from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DiffBlock } from '../app/_components/coding/DiffBlock';
import type { DiffFile } from '../app/_components/coding/types';

/**
 * Issue #154 / Phase 3 §D.3.c — Coding-tab inline diff rendering.
 *
 * Pure DiffBlock unit tests. Integration tests for HandoffThread+DiffBlock
 * and the stopPropagation wrapper live in coding-tab.test.tsx next to the
 * existing HandoffThread / CodingTabContent tests.
 */

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
