/**
 * Issue #168 / Phase 3 §D.3.e — Shiki syntax-highlighter singleton for the
 * Coding-tab DiffBlock.
 *
 * Design:
 *   - `getHighlighter()` is a memoized async factory. First call triggers a
 *     dynamic `import('shiki')` (kept out of the initial bundle — Webpack
 *     code-splits it into a separate chunk that loads only when a DiffBlock
 *     first mounts). Subsequent calls resolve to the same instance.
 *   - Languages loaded: `js`, `jsx`, `ts`, `tsx`, `python`, `markdown`,
 *     `json`, `bash`, `text`. Anything else is normalized to `text` by the
 *     caller (see DiffBlock language-inference map).
 *   - Theme: `github-dark` — matches the existing bg-gray-950 palette of
 *     the dashboard's Coding tab.
 *
 * Security note on the inner-HTML boundary:
 *   Shiki escapes ALL input code before emitting HTML — it never echoes raw
 *   strings. The output is a tree of span elements wrapping escaped text.
 *   That makes raw-HTML injection safe IF AND ONLY IF the caller only ever
 *   passes bytes that came out of `codeToHtml`. DiffBlock does exactly that
 *   — it feeds the ALREADY-parsed diff-line body (not raw user input mixed
 *   with markup) to `tokensToHtml` and then renders the returned string.
 *   Do not change this boundary without re-reviewing the escape chain.
 */

import type { Highlighter } from 'shiki';

export const SHIKI_THEME = 'github-dark' as const;

// Languages supported by DiffBlock's extension-inference map. Kept as a
// tuple literal so TypeScript gives us narrow autocomplete AND so we can
// reuse the list as both the Shiki-load set and a runtime guard.
export const SUPPORTED_LANGUAGES = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'python',
    'markdown',
    'json',
    'bash',
    'text',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

// Memoized highlighter promise. The FIRST call triggers the dynamic
// import + createHighlighter; every subsequent call returns the same
// promise so we never double-load grammars/themes.
let highlighterPromise: Promise<Highlighter> | null = null;

export async function getHighlighter(): Promise<Highlighter> {
    if (highlighterPromise) return highlighterPromise;
    highlighterPromise = (async () => {
        // Dynamic import keeps Shiki out of the initial bundle — Webpack
        // emits this as its own chunk, and Next.js only fetches it when a
        // DiffBlock first mounts in the browser.
        const shiki = await import('shiki');
        const highlighter = await shiki.createHighlighter({
            themes: [SHIKI_THEME],
            langs: [...SUPPORTED_LANGUAGES],
        });
        return highlighter;
    })();
    return highlighterPromise;
}

/**
 * Convenience wrapper: returns inline HTML for a single code snippet.
 *
 * The caller is responsible for ensuring `language` is one of
 * `SUPPORTED_LANGUAGES` — if it isn't, Shiki will throw. DiffBlock's
 * inference map guarantees this.
 */
export async function tokensToHtml(
    code: string,
    language: SupportedLanguage,
): Promise<string> {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code, { lang: language, theme: SHIKI_THEME });
}

/**
 * Test-only hook: drops the memoized highlighter so the next call to
 * `getHighlighter()` restarts from the (mocked) dynamic import.
 *
 * DO NOT call from production code. Jest's `beforeEach` uses this to
 * guarantee each test starts with a fresh deferred promise.
 */
export function resetHighlighterForTests(): void {
    // Defense-in-depth: make accidental production use a no-op.
    // `ForTests`-suffixed export naming isn't enough — a future caller
    // who imports the symbol doesn't see the name collision at runtime.
    // Suggested by code-quality reviewer on PR for #168 (NIT N2).
    if (process.env.NODE_ENV === 'production') return;
    highlighterPromise = null;
}
