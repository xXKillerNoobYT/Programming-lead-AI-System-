import React, { act } from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../app/page';

describe('Preferences UI', () => {
    let getItemMock: jest.Mock;
    let setItemMock: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        getItemMock = jest.fn();
        setItemMock = jest.fn();
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: getItemMock,
                setItem: setItemMock,
                removeItem: jest.fn(),
                clear: jest.fn(),
            },
            writable: true,
        });
    });

    afterEach(() => {
        jest.useRealTimers();
        cleanup();
    });

    const switchToGuidance = () => {
        fireEvent.click(screen.getByRole('button', { name: 'User Guidance' }));
    };

    it('renders the Coding tab by default', () => {
        render(<Dashboard />);
        expect(
            screen.getByRole('heading', { name: 'Coding AI Relay', level: 2 }),
        ).toBeInTheDocument();
    });

    it('switches to the guidance tab and highlights its button', () => {
        render(<Dashboard />);
        const guidanceButton = screen.getByRole('button', { name: 'User Guidance' });
        expect(guidanceButton).toHaveClass('bg-gray-800');
        fireEvent.click(guidanceButton);
        expect(guidanceButton).toHaveClass('bg-blue-600');
    });

    it('renders the preferences form when the guidance tab is active', () => {
        render(<Dashboard />);
        switchToGuidance();
        expect(screen.getByRole('heading', { name: 'Model Mappings' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Toggles' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Heartbeat Interval' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Max Parallelism' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Approval Gate Threshold' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeInTheDocument();
    });

    it('loads saved preferences from localStorage on mount', () => {
        const saved = {
            modelMappings: {
                'design-lead': 'loaded-model',
                orchestrator: '',
                code: '',
                architect: '',
                debug: '',
                'security-review': '',
                'documentation-writer': '',
                'jest-test-engineer': '',
                'user-story-creator': '',
                devops: '',
                'skill-writer': '',
                'mode-writer': '',
            },
            toggles: { memPalace: true, autoGPT: false, hourlyGrok: true },
            heartbeatInterval: 120,
            maxParallelism: 10,
            approvalThreshold: 'high',
        };
        getItemMock.mockReturnValue(JSON.stringify(saved));

        render(<Dashboard />);
        switchToGuidance();

        expect(getItemMock).toHaveBeenCalledWith('preferences');
        expect(screen.getByDisplayValue('loaded-model')).toBeInTheDocument();
        expect(screen.getByText('120s')).toBeInTheDocument();
    });

    it('updates a model mapping input', () => {
        render(<Dashboard />);
        switchToGuidance();
        const designLeadInput = screen.getByDisplayValue('grok-4.20');
        fireEvent.change(designLeadInput, { target: { value: 'claude-opus-4.7' } });
        expect(screen.getByDisplayValue('claude-opus-4.7')).toBeInTheDocument();
    });

    it('toggles each preference switch independently', () => {
        render(<Dashboard />);
        switchToGuidance();
        const memPalace = screen.getByLabelText('MemPalace') as HTMLInputElement;
        const autoGPT = screen.getByLabelText('AutoGPT') as HTMLInputElement;
        const hourlyGrok = screen.getByLabelText('Hourly Grok') as HTMLInputElement;

        expect(memPalace.checked).toBe(false);
        fireEvent.click(memPalace);
        expect(memPalace.checked).toBe(true);

        expect(autoGPT.checked).toBe(false);
        fireEvent.click(autoGPT);
        expect(autoGPT.checked).toBe(true);

        expect(hourlyGrok.checked).toBe(false);
        fireEvent.click(hourlyGrok);
        expect(hourlyGrok.checked).toBe(true);
    });

    it('updates the heartbeat interval via the slider', () => {
        render(<Dashboard />);
        switchToGuidance();
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '180' } });
        expect(screen.getByText('180s')).toBeInTheDocument();
    });

    it('updates max parallelism via the number input', () => {
        render(<Dashboard />);
        switchToGuidance();
        const input = screen.getByRole('spinbutton') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '15' } });
        expect(input.value).toBe('15');
    });

    it('updates the approval threshold via the select', () => {
        render(<Dashboard />);
        switchToGuidance();
        const select = screen.getByRole('combobox') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'high' } });
        expect(select.value).toBe('high');
    });

    it('persists preferences to localStorage when Save is clicked', () => {
        render(<Dashboard />);
        switchToGuidance();

        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '90' } });

        fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));

        expect(setItemMock).toHaveBeenCalledWith('preferences', expect.any(String));
        const payload = JSON.parse(setItemMock.mock.calls[0][1]);
        expect(payload.heartbeatInterval).toBe(90);
        expect(payload.approvalThreshold).toBe('medium');
    });

    it('shows a save-success message and clears it after 3 seconds', async () => {
        render(<Dashboard />);
        switchToGuidance();
        fireEvent.click(screen.getByRole('button', { name: 'Save Preferences' }));

        expect(screen.getByText('Preferences saved successfully!')).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(3000);
        });
        await waitFor(() => {
            expect(screen.queryByText('Preferences saved successfully!')).not.toBeInTheDocument();
        });
    });

    it('does not crash when localStorage contains invalid JSON', () => {
        getItemMock.mockReturnValue('not-json{');
        const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<Dashboard />)).not.toThrow();
        expect(consoleError).toHaveBeenCalled();

        consoleError.mockRestore();
    });
});
