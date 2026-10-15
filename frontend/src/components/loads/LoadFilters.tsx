import React, { useState } from 'react';
import { Search, Calendar } from 'lucide-react';
import { cn } from '@/utils/classNames';
import { LOAD_TYPE_FILTER_OPTIONS } from '../../constants/loadTypes';

interface LoadFiltersProps {
  onFilterChange: (filters: LoadFilters) => void;
}

export interface LoadFilters {
  search: string;
  type: string;
  status: string;
  fromDate: string;
  toDate: string;
}

const STATUSES = ['All Status', 'Pending', 'Dispatched', 'In Transit', 'Delivered'];

export const LoadFilters: React.FC<LoadFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<LoadFilters>({
    search: '',
    type: '',
    status: 'All Status',
    fromDate: '',
    toDate: '',
  });

  const handleChange = (key: keyof LoadFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="space-y-4 mb-6 flex flex-col">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search loads..."
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          value={filters.search}
          onChange={(e) => handleChange('search', e.target.value)}
        />
      </div>

      {/* Types Filters */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg self-start">
        {LOAD_TYPE_FILTER_OPTIONS.map((type) => (
          <button
            key={type.value}
            onClick={() => handleChange('type', type.value)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              filters.type === type.value
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg self-start">
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => handleChange('status', status)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              filters.status === status
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Date Pickers */}
      <div className="flex flex-wrap gap-3 pt-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="date"
            className="block w-40 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={filters.fromDate}
            onChange={(e) => handleChange('fromDate', e.target.value)}
          />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="date"
            className="block w-40 pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={filters.toDate}
            onChange={(e) => handleChange('toDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
