'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { cn } from '../../../lib/utils';
import type { DiffFile } from './types';

/**
 * Issue #154 / Phase 3 §D.3.c — Coding-tab inline diff rendering.
 *
 * Presentational diff-viewer. Renders the unified-diff body in a monospace
 * <pre> with per-line color classes:
 *   - additions  (`+` but not `+++`)            → text-green-400
 *   - removals   (`-` but not `---`)            → text-red-400
 *   - hunk headers (`@@ ... @@`)                → text-gray-500
 *   - file headers (`--- a/... / +++ b/...`)    → text-gray-500
 *   - context / anything else                   → text-gray-300
 *
 * Defaults to collapsed when `added + removed > 50`, expanded otherwise.
 * Dual-mode controlled/uncontrolled via `expanded` + `onExpandedChange`
 * (same shape as HandoffThread / CodingTabContent).
 *
 * No data fetching, no state beyond `expanded`. In-house parser — no
 * react-diff-view dependency this tick (D-20260419-045 decision: defer to a
 * later §D.3.e-ish leaf if syntax highlighting becomes worth the bundle hit).
 */

interface DiffBlockProps {
    diff: DiffFile;
    expanded?: boolean;
    onExpandedChange?: (next: boolean) => void;
}

type LineKind = 'added' | 'removed' | 'hunk' | 'fileHeader' | 'context';

interface ParsedLine {
    kind: LineKind;
    text: string;
}

// Regex set:
//   /^@@/            hunk header ("@@ -a,b +c,d @@ optional context")
//   /^(---|\+\+\+)/  file header (--- a/path or +++ b/path)
//   /^\+(?!\+)/      addition (leading + but NOT the file-header `+++`)
//   /^-(?!-)/        removal  (leading - but NOT the file-header `---`)
//   everything else  context
const RE_HUNK = /^@@/;
const RE_FILE_HEADER = /^(?:---|\+\+\+)/;
const RE_ADDED = /^\+(?!\+)/;
const RE_REMOVED = /^-(?!-)/;

export function parseDiffLines(patch: string): ParsedLine[] {
    const lines = patch.split(/\r?\n/);
    const out: ParsedLine[] = [];
    for (const text of lines) {
        let kind: LineKind;
        // File header must be checked BEFORE added/removed — `--- a/...`
        // starts with `-` and `+++ b/...` starts with `+`, and we want them
        // classified as structural headers, not content.
        if (RE_FILE_HEADER.test(text)) {
            kind = 'fileHeader';
        } else if (RE_HUNK.test(text)) {
            kind = 'hunk';
        } else if (RE_ADDED.test(text)) {
            kind = 'added';
        } else if (RE_REMOVED.test(text)) {
            kind = 'removed';
        } else {
            kind = 'context';
        }
        out.push({ kind, text });
    }
    return out;
}

const LINE_CLASS: Record<LineKind, string> = {
    added: 'text-green-400',
    removed: 'text-red-400',
    hunk: 'text-gray-500',
    fileHeader: 'text-gray-500',
    context: 'text-gray-300',
};

const COLLAPSE_THRESHOLD = 50;

function defaultExpandedFor(diff: DiffFile): boolean {
    return diff.added + diff.removed <= COLLAPSE_THRESHOLD;
}

export function DiffBlock({
    diff,
    expanded,
    onExpandedChange,
}: DiffBlockProps): ReactElement {
    const isControlled = expanded !== undefined;
    const [internalExpanded, setInternalExpanded] = useState<boolean>(
        defaultExpandedFor(diff),
    );
    const isExpanded = isControlled ? expanded : internalExpanded;

    function handleToggle(): void {
        const next = !isExpanded;
        if (onExpandedChange) onExpandedChange(next);
        if (!isControlled) setInternalExpanded(next);
    }

    const parsedLines = parseDiffLines(diff.patch);

    return (
        <div
            className="mt-2 rounded border border-gray-800 bg-gray-950/80 overflow-hidden"
            data-testid={`diff-block-${diff.path}`}
        >
            <button
                type="button"
                onClick={handleToggle}
                aria-expanded={isExpanded}
                aria-label={`${diff.path} — +${diff.added} / -${diff.removed}`}
                className="w-full flex items-center gap-2 px-2 py-1 text-left text-[11px] font-mono text-gray-200 hover:bg-gray-800/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:ring-inset"
            >
                <span
                    aria-hidden
                    className="text-xs text-gray-500 w-3 inline-block"
                >
                    {isExpanded ? '▾' : '▸'}
                </span>
                <span className="flex-1 min-w-0 truncate">{diff.path}</span>
                <span className="text-green-400">+{diff.added}</span>
                <span className="text-gray-600" aria-hidden>
                    /
                </span>
                <span className="text-red-400">-{diff.removed}</span>
            </button>
            {isExpanded ? (
                <pre
                    data-testid={`diff-block-body-${diff.path}`}
                    className="m-0 px-2 py-1 text-[11px] leading-snug font-mono overflow-auto whitespace-pre"
                >
                    {parsedLines.map((ln, idx) => (
                        <span
                            key={idx}
                            className={cn('block', LINE_CLASS[ln.kind])}
                        >
                            {ln.text === '' ? '\u00A0' : ln.text}
                        </span>
                    ))}
                </pre>
            ) : null}
        </div>
    );
}
