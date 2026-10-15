import React, { InputHTMLAttributes, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch: (value: string) => void;
  debounceMs?: number;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, debounceMs = 300, ...props }, ref) => {
    const [value, setValue] = useState('');

    useEffect(() => {
      const timer = setTimeout(() => {
        onSearch(value);
      }, debounceMs);
      return () => clearTimeout(timer);
    }, [value, debounceMs, onSearch]);

    const handleClear = () => {
      setValue('');
      onSearch('');
    };

    return (
      <div className={cn('relative w-full max-w-sm', className)}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white py-2 pl-10 pr-10 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          {...props}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
