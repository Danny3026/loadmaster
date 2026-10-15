import React from 'react';
import { cn } from '@/utils/classNames';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-slate-100 text-slate-800',
      primary: 'bg-primary-100 text-primary-800',
      success: 'bg-success-50 text-success-700',
      warning: 'bg-warning-50 text-warning-800',
      danger: 'bg-danger-50 text-danger-700',
      outline: 'text-slate-800 border border-slate-200',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';