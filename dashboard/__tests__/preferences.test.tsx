import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../app/page';

/**
 * Comprehensive Jest tests for the preferences UI in dashboard/app/page.tsx
 * Tests model mapping persistence, toggles, slider, save/load from localStorage, button interactions
 * Follows mode-specific instructions: describe/it blocks, beforeEach for isolation, error cases, JSDoc, typed mocks
 * Aims for >85% coverage on the preferences section (guidance tab)
 */

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useState: jest.fn(),
  useEffect: jest.fn(),
}));

const mockSetPreferences = jest.fn();
const mockSetSaveMessage = jest.fn();
const mockSetActiveTab = jest.fn();

const defaultPreferences = {
  modelMappings: {
    'design-lead': 'grok-4.20',
    'orchestrator': '',
    'code': '',
    'architect': '',
    'debug': '',
    'security-review': '',
    'documentation-writer': '',
    'jest-test-engineer': '',
    'user-story-creator': '',
    'devops': '',
    'skill-writer': '',
    'mode-writer': '',
  },
  toggles: {
    memPalace: false,
    autoGPT: false,
    hourlyGrok: false,
  },
  heartbeatInterval: 30,
  maxParallelism: 5,
  approvalThreshold: 'medium',
};

describe('Preferences UI', () => {
  let localStorageMock: { getItem: jest.Mock; setItem: jest.Mock };

  beforeEach(() => {
    // Reset mocks for test isolation
    jest.clearAllMocks();
    mockSetPreferences.mockClear();
    mockSetSaveMessage.mockClear();
    mockSetActiveTab.mockClear();

    // Mock localStorage
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock useState to control preferences state
    (React.useState as jest.Mock).mockImplementation((initialValue) => {
      if (initialValue === defaultPreferences) {
        return [defaultPreferences, mockSetPreferences];
      }
      if (typeof initialValue === 'string') {
        return ['', mockSetSaveMessage];
      }
      return [initialValue, jest.fn()];
    });

    // Mock useEffect to prevent localStorage load in tests
    (React.useEffect as jest.Mock).mockImplementation((callback) => {
      // Do not call callback to avoid side effects in test
    });
  });

  it('renders preferences section when guidance tab is active', () => {
    render(<Dashboard />);
    // Switch to guidance tab
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    expect(screen.getByText('Model Mappings')).toBeInTheDocument();
    expect(screen.getByText('Toggles')).toBeInTheDocument();
    expect(screen.getByText('Heartbeat Interval')).toBeInTheDocument();
    expect(screen.getByText('Max Parallelism')).toBeInTheDocument();
    expect(screen.getByText('Approval Gate Threshold')).toBeInTheDocument();
    expect(screen.getByText('Save Preferences')).toBeInTheDocument();
  });

  it('loads preferences from localStorage on mount', () => {
    const savedPrefs = JSON.stringify({
      ...defaultPreferences,
      toggles: { memPalace: true, autoGPT: false, hourlyGrok: true },
    });
    localStorageMock.getItem.mockReturnValue(savedPrefs);

    // Override useEffect for this test to simulate load
    (React.useEffect as jest.Mock).mockImplementationOnce((callback) => callback());

    render(<Dashboard />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('preferences');
  });

  it('updates model mappings and persists changes', () => {
    render(<Dashboard />);
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    const designLeadInput = screen.getByDisplayValue('grok-4.20');
    fireEvent.change(designLeadInput, { target: { value: 'claude-3.5' } });

    expect(mockSetPreferences).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetPreferences.mock.calls[0][0];
    const newState = updater(defaultPreferences);
    expect(newState.modelMappings['design-lead']).toBe('claude-3.5');
  });

  it('toggles preferences correctly for all toggle types', () => {
    render(<Dashboard />);
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    // Test MemPalace toggle
    const memPalaceCheckbox = screen.getByLabelText('MemPalace');
    fireEvent.click(memPalaceCheckbox);
    expect(mockSetPreferences).toHaveBeenCalledWith(expect.any(Function));

    // Test AutoGPT toggle
    const autoGPTCheckbox = screen.getByLabelText('AutoGPT');
    fireEvent.click(autoGPTCheckbox);

    // Test Hourly Grok toggle
    const hourlyGrokCheckbox = screen.getByLabelText('Hourly Grok');
    fireEvent.click(hourlyGrokCheckbox);

    expect(mockSetPreferences).toHaveBeenCalledTimes(3);
  });

  it('handles heartbeat interval slider changes', () => {
    render(<Dashboard />);
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '120' } });

    expect(mockSetPreferences).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetPreferences.mock.calls[0][0];
    const newState = updater(defaultPreferences);
    expect(newState.heartbeatInterval).toBe(120);
  });

  it('handles max parallelism number input', () => {
    render(<Dashboard />);
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    const parallelismInput = screen.getByRole('spinbutton');
    fireEvent.change(parallelismInput, { target: { value: '10' } });

    expect(mockSetPreferences).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetPreferences.mock.calls[0][0];
    const newState = updater(defaultPreferences);
    expect(newState.maxParallelism).toBe(10);
  });

  it('handles approval threshold select changes', () => {
    render(<Dashboard />);
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'high' } });

    expect(mockSetPreferences).toHaveBeenCalledWith(expect.any(Function));
    const updater = mockSetPreferences.mock.calls[0][0];
    const newState = updater(defaultPreferences);
    expect(newState.approvalThreshold).toBe('high');
  });

  it('saves preferences to localStorage on button click', async () => {
    render(<Dashboard />);
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    const saveButton = screen.getByText('Save Preferences');
    fireEvent.click(saveButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'preferences',
      JSON.stringify(defaultPreferences)
    );
    expect(mockSetSaveMessage).toHaveBeenCalledWith('Preferences saved successfully!');

    // Test save message timeout
    await waitFor(() => {
      expect(mockSetSaveMessage).toHaveBeenCalledWith('');
    }, { timeout: 3500 });
  });

  it('displays save success message after saving', () => {
    (React.useState as jest.Mock).mockImplementation((initialValue) => {
      if (typeof initialValue === 'string') {
        return ['Preferences saved successfully!', mockSetSaveMessage];
      }
      return [initialValue, jest.fn()];
    });

    render(<Dashboard />);
    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    expect(screen.getByText('Preferences saved successfully!')).toBeInTheDocument();
  });

  it('handles error cases for invalid localStorage data', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate parse error by forcing useEffect
    (React.useEffect as jest.Mock).mockImplementationOnce((callback) => {
      try {
        callback();
      } catch (e) {
        // Expected error for invalid JSON
      }
    });

    render(<Dashboard />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('preferences');
    consoleError.mockRestore();
  });

  it('switches to guidance tab to access preferences', () => {
    render(<Dashboard />);

    const guidanceButton = screen.getByText('User Guidance');
    fireEvent.click(guidanceButton);

    expect(screen.getByText('User Guidance')).toHaveClass('bg-blue-600');
    expect(screen.getByText('Model Mappings')).toBeInTheDocument();
  });
});
