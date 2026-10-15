import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLoads } from '../../hooks/useLoads';

const filters = [{ label: 'All', value: '' }, { label: 'Pending', value: 'pending' }, { label: 'Dispatched', value: 'dispatched' }, { label: 'In Transit', value: 'in_transit' }, { label: 'Delivered', value: 'delivered' }];
const statusLabels: Record<string, string> = { pending: 'Pending', dispatched: 'Dispatched', in_transit: 'In Transit', delivered: 'Delivered' };

const DriverLoadsPage: React.FC = () => {
  const [status, setStatus] = useState('');
  const { data, isLoading, error } = useLoads({ page: 1, limit: 100, status: status || undefined });
  const loads: any[] = data?.data || [];
  return (
    <div className="min-h-screen bg-gray-50 pb-20"><header className="bg-white px-6 py-5 sticky top-0 z-20 shadow-sm"><h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Loads</h1><div className="flex space-x-2 overflow-x-auto mt-4 pb-2 hide-scrollbar">{filters.map((filter) => <button key={filter.value} onClick={() => setStatus(filter.value)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-medium ${status === filter.value ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>{filter.label}</button>)}</div></header>
      <main className="p-4 space-y-4">{isLoading && <div className="text-center py-12 text-gray-500">Loading your loads...</div>}{error && <div className="bg-red-50 p-4 rounded-2xl text-red-700">Unable to load assigned loads.</div>}{!isLoading && !error && loads.length === 0 && <div className="bg-white rounded-3xl p-8 text-center text-gray-500">No assigned loads found.</div>}{loads.map((load) => <Link key={load.id} to={`/driver/loads/${load.id}`} className="block bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden"><div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" /><div className="flex justify-between items-start mb-3"><span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-blue-100 text-blue-700">{statusLabels[load.status] || load.status}</span><ChevronRight className="text-gray-400" /></div><p className="text-xs text-gray-400 font-medium mb-4">#{load.load_number}</p><div className="flex items-center"><div className="flex flex-col items-center mr-4"><div className="w-3 h-3 rounded-full border-2 border-gray-300 bg-white" /><div className="w-0.5 h-8 bg-gray-200 my-1" /><div className="w-3 h-3 rounded-full bg-gray-800" /></div><div className="flex-1 space-y-4"><p className="text-sm font-bold text-gray-900">{load.origin || '—'}</p><p className="text-sm font-bold text-gray-900">{load.destination || '—'}</p></div></div></Link>)}</main>
    </div>
  );
};

export default DriverLoadsPage;
export { DriverLoadsPage };
