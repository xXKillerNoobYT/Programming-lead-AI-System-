/**
 * R4 QA adversarial break-test for WEI-1121 fix.
 * Exercises mergeSavedPreferences via the Dashboard component
 * with malicious, partial, and malformed localStorage payloads.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../app/page';

const setupLocalStorage = (value: string | null) => {
    Object.defineProperty(window, 'localStorage', {
        value: {
            getItem: jest.fn().mockReturnValue(value),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
        },
        writable: true,
    });
};

const switchToGuidance = () => {
    const btn = screen.getByRole('button', { name: 'User Guidance' });
    require('@testing-library/react').fireEvent.click(btn);
};

const expectDefaultsRendered = () => {
    expect(screen.getByDisplayValue('grok-4.20')).toBeInTheDocument();
    expect(screen.getByLabelText('MemPalace')).not.toBeChecked();
    expect(screen.getByText('30s')).toBeInTheDocument();
};

describe('R4 adversarial: partial/malformed localStorage payloads', () => {
    afterEach(() => cleanup());

    const cases: [string, string][] = [
        ['empty object', '{}'],
        ['only heartbeatInterval', '{"heartbeatInterval":60}'],
        ['only toggles', '{"toggles":{"memPalace":true}}'],
        ['only modelMappings', '{"modelMappings":{"code":"test-model"}}'],
        ['null toggles', '{"toggles":null}'],
        ['null modelMappings', '{"modelMappings":null}'],
        ['string toggles', '{"toggles":"bad"}'],
        ['array modelMappings', '{"modelMappings":[1,2,3]}'],
        ['number toggles', '{"toggles":42}'],
        ['boolean heartbeatInterval', '{"heartbeatInterval":true}'],
        ['string heartbeatInterval', '{"heartbeatInterval":"fast"}'],
        ['NaN-like heartbeatInterval', '{"heartbeatInterval":"NaN"}'],
        ['negative heartbeatInterval', '{"heartbeatInterval":-100}'],
        ['zero heartbeatInterval', '{"heartbeatInterval":0}'],
        ['null maxParallelism', '{"maxParallelism":null}'],
        ['array approvalThreshold', '{"approvalThreshold":["high"]}'],
        ['nested garbage toggles', '{"toggles":{"memPalace":"yes","autoGPT":1,"hourlyGrok":null}}'],
        ['extra unknown keys', '{"unknownField":"value","anotherOne":999}'],
        ['deeply nested junk', '{"toggles":{"memPalace":{"nested":true}}}'],
    ];

    it.each(cases)('does not crash with %s: %s', (_label, json) => {
        setupLocalStorage(json);
        expect(() => render(<Dashboard />)).not.toThrow();
        switchToGuidance();
        expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeInTheDocument();
    });
});

describe('R4 adversarial: JSON-level edge cases', () => {
    afterEach(() => cleanup());

    const jsonCases: [string, string | null][] = [
        ['JSON null', 'null'],
        ['JSON number', '42'],
        ['JSON string', '"hello"'],
        ['JSON boolean true', 'true'],
        ['JSON boolean false', 'false'],
        ['JSON array', '[1,2,3]'],
        ['empty string', ''],
        ['whitespace only', '   '],
        ['null localStorage value', null],
        ['malformed JSON', '{bad json!!!'],
        ['unicode payload', '{"heartbeatInterval":"\\u0000\\u0001"}'],
        ['very long string value', JSON.stringify({ approvalThreshold: 'x'.repeat(10000) })],
    ];

    it.each(jsonCases)('does not crash with %s', (_label, value) => {
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        setupLocalStorage(value);
        expect(() => render(<Dashboard />)).not.toThrow();
        switchToGuidance();
        expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeInTheDocument();
        consoleError.mockRestore();
    });
});

describe('R4 adversarial: prototype pollution attempt', () => {
    afterEach(() => cleanup());

    it('does not crash with __proto__ key in payload', () => {
        setupLocalStorage('{"__proto__":{"polluted":true},"toggles":{"__proto__":true}}');
        expect(() => render(<Dashboard />)).not.toThrow();
        switchToGuidance();
        expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeInTheDocument();
    });

    it('does not crash with constructor key in payload', () => {
        setupLocalStorage('{"constructor":{"prototype":{"polluted":true}}}');
        expect(() => render(<Dashboard />)).not.toThrow();
        switchToGuidance();
        expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeInTheDocument();
    });
});

describe('R4 adversarial: defaults preserved on partial load', () => {
    afterEach(() => cleanup());

    it('preserves default toggles when only heartbeatInterval is stored', () => {
        setupLocalStorage('{"heartbeatInterval":60}');
        render(<Dashboard />);
        switchToGuidance();
        expect(screen.getByText('60s')).toBeInTheDocument();
        expect(screen.getByLabelText('MemPalace')).not.toBeChecked();
        expect(screen.getByLabelText('AutoGPT')).not.toBeChecked();
        expect(screen.getByLabelText('Hourly Grok')).not.toBeChecked();
        expect(screen.getByDisplayValue('grok-4.20')).toBeInTheDocument();
    });

    it('preserves default modelMappings when only toggles are stored', () => {
        setupLocalStorage('{"toggles":{"memPalace":true}}');
        render(<Dashboard />);
        switchToGuidance();
        expect(screen.getByLabelText('MemPalace')).toBeChecked();
        expect(screen.getByDisplayValue('grok-4.20')).toBeInTheDocument();
        expect(screen.getAllByText('30s').length).toBeGreaterThanOrEqual(1);
    });

    it('ignores extra toggle keys not in defaults', () => {
        setupLocalStorage('{"toggles":{"memPalace":true,"phantomToggle":true}}');
        render(<Dashboard />);
        switchToGuidance();
        expect(screen.getByLabelText('MemPalace')).toBeChecked();
        expect(screen.queryByLabelText('phantomToggle')).not.toBeInTheDocument();
    });
});
