import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: ['class'],
    content: [
        './app/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './lib/**/*.{ts,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                bg: {
                    base: 'rgb(9 9 11)',
                    raised: 'rgb(24 24 27)',
                    sunken: 'rgb(0 0 0)',
                },
                fg: {
                    primary: 'rgb(244 244 245)',
                    muted: 'rgb(161 161 170)',
                    subtle: 'rgb(113 113 122)',
                },
                border: {
                    DEFAULT: 'rgb(39 39 42)',
                    strong: 'rgb(63 63 70)',
                },
                accent: {
                    DEFAULT: 'rgb(37 99 235)',
                    hover: 'rgb(59 130 246)',
                    subtle: 'rgb(30 58 138)',
                },
                success: 'rgb(34 197 94)',
                warn: 'rgb(234 179 8)',
                danger: 'rgb(239 68 68)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            fontSize: {
                'caption': ['0.6875rem', { lineHeight: '1rem' }],
                'tiny': ['0.75rem', { lineHeight: '1.1rem' }],
                'body': ['0.875rem', { lineHeight: '1.35rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'subheading': ['1.125rem', { lineHeight: '1.625rem' }],
                'heading': ['1.375rem', { lineHeight: '1.875rem' }],
            },
            spacing: {
                'rail': '4rem',
                'topbar': '3rem',
            },
            transitionTimingFunction: {
                'fast-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
                'soft-in': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
            transitionDuration: {
                'xs': '80ms',
                'sm': '160ms',
                'md': '240ms',
            },
            borderRadius: {
                'xs': '3px',
                'sm': '5px',
                'md': '7px',
                'lg': '10px',
            },
        },
    },
    plugins: [],
};

export default config;
