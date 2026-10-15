import React from 'react';
import { FileQuestion, FolderOpen } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed border-slate-300 p-8 text-center animate-in fade-in-50 dark:border-slate-800", className)}>
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          {icon || <FolderOpen className="h-10 w-10 text-slate-500 dark:text-slate-400" />}
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
        <p className="mb-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
