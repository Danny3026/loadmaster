import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loadsApi } from '../../api/loads';
import { useLoads } from '../../hooks/useLoads';
import { useToast } from '../../contexts/ToastContext';
import { Search, Calendar, X, Package } from 'lucide-react';
import { LOAD_TYPE_FILTER_OPTIONS } from '../../constants/loadTypes';

const statusColors: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  ASSIGNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  DISPATCHED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  AT_PICKUP: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
  PICKED_UP: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  IN_TRANSIT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  AT_DELIVERY: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  DELIVERED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ArchivePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [restoringLoadId, setRestoringLoadId] = useState<string | null>(null);

  const { data: response, isLoading, error } = useLoads({ page, limit: 20, search: searchQuery, status: 'CANCELLED', type: typeFilter, date_from: dateFrom, date_to: dateTo });

  const loads: any[] = response?.data ?? [];
  const total = (response as any)?.meta?.total ?? response?.total ?? 0;

  const hasDateFilter = dateFrom || dateTo;

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  const restoreLoad = async (id: string) => {
    setRestoringLoadId(id);
    try {
      await loadsApi.restoreLoad(id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loads'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }),
      ]);
      showSuccess('Load restored successfully');
    } catch (restoreError: any) {
      showError(restoreError.response?.data?.error?.message || restoreError.message || 'Failed to restore load');
    } finally {
      setRestoringLoadId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto min-h-screen bg-[#F9FAFB] dark:bg-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] dark:text-white leading-tight">Archived Loads</h1>
          <p className="text-[14px] text-[#6B7280] dark:text-slate-400 mt-1">Cancelled loads archive</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          placeholder="Search loads..."
          className="w-full sm:w-[320px] bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-2 pl-9 pr-4 text-[14px] text-gray-900 dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Equipment Type Segmented Control */}
      <div className="mb-4">
        <div className="inline-flex bg-[#F3F4F6] dark:bg-slate-800 rounded-md p-1">
          {LOAD_TYPE_FILTER_OPTIONS.map((type) => (
            <button
              key={type.value}
              onClick={() => { setTypeFilter(type.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-[4px] text-[13px] font-medium transition-all ${
                typeFilter === type.value
                  ? 'bg-white text-[#111827] shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-[#6B7280] hover:text-[#374151] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={15} />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-[#4B5563] dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[140px]"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={15} />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-[#4B5563] dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[140px]"
            placeholder="To date"
          />
        </div>
        {hasDateFilter && (
          <button
            onClick={clearDates}
            className="p-1 text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-[14px]">
          Error loading archived loads: {(error as any)?.message}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && loads.length === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-20 flex flex-col items-center justify-center">
          <Package className="text-[#9CA3AF] mb-3" size={40} strokeWidth={1.5} />
          <p className="text-[#6B7280] dark:text-slate-400 text-[14px]">No loads found.</p>
        </div>
      )}

      {/* Archived Loads Table */}
      {!isLoading && !error && loads.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-slate-700 overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="border-b border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800">
                <tr>
                  {[
                    'Load #', 'Type', 'Broker', 'Status', 'Rate', 'Origin', 'Destination',
                    'Cancelled Date', 'Actions'
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        {heading}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-700">
                {loads.map((load: any) => {
                  const typeLabel = LOAD_TYPE_FILTER_OPTIONS.find(t => t.value === load.equipment_type)?.label || load.equipment_type || '—';
                  
                  return (
                    <tr 
                      key={load.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/loads/${load.id}`)}
                    >
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.load_number || load.loadNumber || '—'}
                      </td>
                      <td className="px-4 py-4">
                        {typeLabel !== '—' ? (
                          <button 
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#EBF5FF] text-[#1E40AF] dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            {typeLabel}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.broker?.name || load.broker_name || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${statusColors[load.status] || 'bg-slate-100 text-slate-700'}`}>
                          {load.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200 font-medium">
                        {load.rate ? `$${Number(load.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.origin || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.destination || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.updated_at ? formatDate(load.updated_at) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <button type="button" disabled={restoringLoadId === load.id} onClick={(event) => { event.stopPropagation(); void restoreLoad(load.id); }} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                          {restoringLoadId === load.id ? 'Restoring...' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center gap-2 text-[13px] text-[#6B7280] dark:text-slate-400">
              <span>Rows per page</span>
              <div className="relative">
                <select className="appearance-none bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-600 rounded px-2 py-1.5 pr-8 outline-none focus:border-blue-500">
                  <option>20</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <svg className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-[13px] text-[#6B7280] dark:text-slate-400">
              <span>
                {total === 0 ? '0-0 of 0' : `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}`}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-[#E5E7EB] dark:border-slate-600 rounded text-[#374151] dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={loads.length < 20}
                  className="px-3 py-1.5 border border-[#E5E7EB] dark:border-slate-600 rounded text-[#374151] dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
