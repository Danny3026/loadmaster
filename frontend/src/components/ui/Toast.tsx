import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ToastProps {
  id: string;
  title?: string;
  description: string;
  variant?: 'default' | 'success' | 'destructive';
  onClose: (id: string) => void;
  duration?: number;
}

export function Toast({ id, title, description, variant = 'default', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    default: <Info className="h-5 w-5 text-blue-500" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    destructive: <AlertCircle className="h-5 w-5 text-red-500" />,
  };

  const variants = {
    default: 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950',
    success: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20',
    destructive: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        variants[variant]
      )}
    >
      <div className="flex gap-3">
        {icons[variant]}
        <div className="flex flex-col gap-1">
          {title && <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</div>}
          <div className="text-sm text-slate-500 dark:text-slate-400 opacity-90">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onClose(id)}
        className="absolute right-2 top-2 rounded-md p-1 text-slate-500 opacity-0 transition-opacity hover:text-slate-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 dark:text-slate-400 dark:hover:text-slate-50"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Simple Toast Container
export function ToastProvider({ toasts, onClose }: { toasts: ToastProps[], onClose: (id: string) => void }) {
  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
