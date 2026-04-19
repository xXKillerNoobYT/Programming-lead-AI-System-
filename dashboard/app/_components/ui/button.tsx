import type { ButtonHTMLAttributes, ReactElement } from 'react';
import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';

export type ButtonVariant = 'default' | 'ghost' | 'danger';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    default:
        'bg-accent text-white hover:bg-accent-hover focus-visible:ring-accent',
    ghost: 'text-fg-primary hover:bg-bg-raised focus-visible:ring-border-strong',
    danger: 'bg-danger text-white hover:opacity-90 focus-visible:ring-danger',
};

const BASE_CLASSES =
    'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-body font-medium transition-colors duration-xs ease-fast-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'default', className, children, ...rest }, ref): ReactElement => {
        return (
            <button
                ref={ref}
                data-variant={variant}
                className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
                {...rest}
            >
                {children}
            </button>
        );
    },
);

Button.displayName = 'Button';
