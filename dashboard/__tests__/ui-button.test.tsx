import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '../app/_components/ui/button';
import { cn } from '../lib/utils';

describe('Issue #104 — shadcn-style primitives (Button + cn utility)', () => {
    afterEach(cleanup);

    it('cn() merges tailwind classes deduplicating conflicts', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('cn() accepts conditional inputs like clsx', () => {
        expect(cn('base', true && 'active', false && 'disabled')).toBe('base active');
    });

    it('Button renders a native button with given label', () => {
        render(<Button>Save</Button>);
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('Button exposes a default variant via a data-variant attribute', () => {
        render(<Button>Save</Button>);
        expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
            'data-variant',
            'default',
        );
    });

    it('Button accepts a variant prop and reflects it in data-variant', () => {
        render(<Button variant="ghost">Cancel</Button>);
        expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute(
            'data-variant',
            'ghost',
        );
    });

    it('Button applies variant-specific classes (default vs ghost)', () => {
        const { rerender } = render(<Button>Save</Button>);
        const def = screen.getByRole('button', { name: 'Save' });
        expect(def.className).toContain('bg-accent');

        rerender(<Button variant="ghost">Cancel</Button>);
        const ghost = screen.getByRole('button', { name: 'Cancel' });
        expect(ghost.className).not.toContain('bg-accent');
        expect(ghost.className).toContain('hover:bg-bg-raised');
    });

    it('Button forwards extra className via cn() merge', () => {
        render(<Button className="my-custom">Save</Button>);
        expect(screen.getByRole('button', { name: 'Save' }).className).toContain('my-custom');
    });

    it('Button forwards onClick and other HTML button props', () => {
        const onClick = jest.fn();
        render(<Button onClick={onClick}>Save</Button>);
        screen.getByRole('button', { name: 'Save' }).click();
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
