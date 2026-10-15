import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg' | 'xl';
}

export function Spinner({ className, size = 'default', ...props }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  return (
    <div role="status" className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className={cn("animate-spin text-slate-900 dark:text-slate-50", sizes[size])} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
