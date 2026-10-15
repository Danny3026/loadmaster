import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLoads, useAssignLoad } from '../../hooks/useLoads';
import { useDrivers } from '../../hooks/useDrivers';
import { Search, Plus, Calendar, X, Package, Send, Loader2 } from 'lucide-react';
import { LOAD_TYPE_FILTER_OPTIONS } from '../../constants/loadTypes';

const STATUS_FILTERS = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  dispatched: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
};

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const LoadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dispatchLoad, setDispatchLoad] = useState<any | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const [pageSize, setPageSize] = useState(20);
  const { data: response, isLoading, error } = useLoads({ page, limit: pageSize, search: searchQuery, status: statusFilter, type: typeFilter, date_from: dateFrom, date_to: dateTo });
  const { data: driversResponse, isLoading: isLoadingDrivers } = useDrivers({ limit: 100, offset: 0 });
  const { mutate: assignLoad, isPending: isDispatching } = useAssignLoad();

  // API returns snake_case fields
  const loads: any[] = response?.data ?? [];
  const total = (response as any)?.meta?.total ?? response?.total ?? 0;

  const hasDateFilter = dateFrom || dateTo;

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  const drivers = (driversResponse?.data ?? []).filter((driver: any) => driver.status === 'ACTIVE');

  const openDispatch = (load: any) => {
    setDispatchLoad(load);
    setSelectedDriverId('');
  };

  const closeDispatch = () => {
    if (isDispatching) return;
    setDispatchLoad(null);
    setSelectedDriverId('');
  };

  const handleDispatch = () => {
    if (!dispatchLoad || !selectedDriverId) return;

    const assignment = {
      id: dispatchLoad.id,
      loadNumber: dispatchLoad.load_number || dispatchLoad.loadNumber,
      data: { driver_id: selectedDriverId, dispatch: true },
    };
    assignLoad(assignment, {
      onSuccess: () => closeDispatch(),
      onError: (error: any) => {
        const details = error.response?.data?.error?.details;
        if (details?.type !== 'DRIVER_UNAVAILABLE') return;
        const periods = (details.periods || []).map((period: any) => `${period.start_date} to ${period.end_date}${period.reason ? ` (${period.reason})` : ''}`).join('\n');
        const confirmed = window.confirm(`${details.driver_name} is unavailable during this load period:\n${periods}\n\nAssign anyway?`);
        if (!confirmed) return;
        assignLoad({
          ...assignment,
          data: { ...assignment.data, override_availability_conflict: true },
        }, { onSuccess: () => closeDispatch() });
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto min-h-screen bg-[#F9FAFB] dark:bg-slate-900 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] dark:text-white leading-tight">Load Board</h1>
          <p className="text-[14px] text-[#6B7280] dark:text-slate-400 mt-1">Manage and dispatch your loads</p>
        </div>
        <Link
          to="/loads/new"
          className="flex items-center gap-1.5 bg-[#1D4ED8] text-white px-4 py-2 rounded-md text-[14px] font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} strokeWidth={2.5} />
          New Load
        </Link>
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

      {/* Status Segmented Control */}
      <div className="mb-4">
        <div className="inline-flex bg-[#F3F4F6] dark:bg-slate-800 rounded-md p-1">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status.value}
              onClick={() => { setStatusFilter(status.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-[4px] text-[13px] font-medium transition-all ${
                statusFilter === status.value
                  ? 'bg-white text-[#111827] shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-[#6B7280] hover:text-[#374151] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {status.label}
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
          Error loading loads: {(error as any)?.message}
        </div>
      )}

      {/* Empty State exactly matching the screenshot */}
      {!isLoading && !error && loads.length === 0 && (
        <div className="bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-20 flex flex-col items-center justify-center">
          <Package className="text-[#9CA3AF] mb-3" size={40} strokeWidth={1.5} />
          <p className="text-[#6B7280] dark:text-slate-400 text-[14px]">No loads found.</p>
        </div>
      )}

      {/* Loads Table (Shown if there is data) */}
      {!isLoading && !error && loads.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-slate-700 overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="border-b border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800">
                <tr>
                  {[
                    'Load #', 'Company', 'Type', 'Broker', 'Status', 'Driver', 
                    'Rate', 'Loaded Mi', 'DH Mi', 'Total Mi', 'Origin', 'Destination', 
                    'Pickup', 'Delivery', 'Action'
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        {heading}
                        <svg className="w-3 h-3 text-slate-300 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-700">
                {loads.map((load: any) => {
                  const typeLabel = LOAD_TYPE_FILTER_OPTIONS.find(t => t.value === load.equipment_type)?.label || load.equipment_type || '—';
                  const isPending = load.status === 'pending';
                  const companyName = load.company_name || load.company?.name || load.companyName || '—';
                  const openLoad = () => navigate(`/loads/${load.id}`);
                  const rowHandlers = {
                    onClick: () => openLoad(),
                    onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if ((event.key === 'Enter' || event.key === ' ') && !event.defaultPrevented) {
                        event.preventDefault();
                        openLoad();
                      }
                    },
                  };
                  
                  return (
                    <tr
                      key={load.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open load ${load.load_number || load.loadNumber}`}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors"
                      {...rowHandlers}
                    >
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.load_number || load.loadNumber || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {companyName}
                      </td>
                      <td className="px-4 py-4">
                        {typeLabel !== '—' ? (
                          <button 
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openLoad();
                            }}
                            className="inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium bg-[#EBF5FF] text-[#1E40AF] dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                          >
                            {typeLabel}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.broker?.name || load.broker_name || '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${isPending ? 'bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-700 dark:text-slate-300' : statusColors[load.status] || 'bg-slate-100 text-slate-700'}`}>
                          {({ pending: 'Pending', dispatched: 'Dispatched', in_transit: 'In Transit', delivered: 'Delivered' } as Record<string, string>)[load.status] || load.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.driver?.name || load.driver_name || [load.driver_first_name, load.driver_last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200 font-medium">
                        {load.rate ? `$${Number(load.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.loaded_miles ?? '0'}
                      </td>
                      <td className="px-4 py-4 text-[#6B7280] dark:text-slate-400">
                        {load.deadhead_miles ?? '0'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200 font-medium">
                        {(Number(load.loaded_miles) || 0) + (Number(load.deadhead_miles) || 0)}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.origin || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.destination || '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.pickup_date ? formatDate(load.pickup_date) : '—'}
                      </td>
                      <td className="px-4 py-4 text-[#111827] dark:text-slate-200">
                        {load.delivery_date ? formatDate(load.delivery_date) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        {isPending && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDispatch(load);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-[#D1D5DB] dark:border-slate-600 rounded-md text-[#111827] dark:text-slate-200 text-[14px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send size={16} />
                            Dispatch
                          </button>
                        )}
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
                <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="appearance-none bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-600 rounded px-2 py-1.5 pr-8 outline-none focus:border-blue-500">
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <svg className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-[13px] text-[#6B7280] dark:text-slate-400">
              <span>
                {total === 0 ? '0-0 of 0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
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
                  disabled={loads.length < pageSize}
                  className="px-3 py-1.5 border border-[#E5E7EB] dark:border-slate-600 rounded text-[#374151] dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dispatchLoad && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true" aria-labelledby="dispatch-title">
          <div className="w-full max-w-[608px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-none sm:rounded-md p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 id="dispatch-title" className="text-[24px] font-semibold text-[#111827] dark:text-white">
                Dispatch Load {dispatchLoad.load_number || dispatchLoad.loadNumber}
              </h2>
              <button
                type="button"
                onClick={closeDispatch}
                disabled={isDispatching}
                aria-label="Close dispatch dialog"
                className="p-1 text-[#6B7280] hover:text-[#111827] dark:hover:text-white disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>

            <label htmlFor="dispatch-driver" className="block text-[18px] font-medium text-[#111827] dark:text-slate-200 mb-2">
              Assign Driver
            </label>
            <select
              id="dispatch-driver"
              value={selectedDriverId}
              onChange={(event) => setSelectedDriverId(event.target.value)}
              disabled={isLoadingDrivers || isDispatching}
              className="w-full h-14 border-2 border-[#2563EB] dark:border-blue-500 rounded-md bg-white dark:bg-slate-800 px-4 text-[18px] text-[#111827] dark:text-white outline-none disabled:opacity-60"
            >
              <option value="">{isLoadingDrivers ? 'Loading drivers...' : 'Select a driver'}</option>
              {drivers.map((driver: any) => (
                <option key={driver.id} value={driver.id}>
                  {driver.first_name} {driver.last_name}
                </option>
              ))}
            </select>

            {!isLoadingDrivers && drivers.length === 0 && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">No available drivers found.</p>
            )}

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={closeDispatch}
                disabled={isDispatching}
                className="px-6 py-3 border border-[#D1D5DB] dark:border-slate-600 rounded-md text-[18px] font-medium text-[#111827] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatch}
                disabled={!selectedDriverId || isDispatching || drivers.length === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#86A8E8] text-white rounded-md text-[18px] font-medium hover:bg-[#6F95DF] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDispatching && <Loader2 size={18} className="animate-spin" />}
                <Send size={18} />
                Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadsPage;