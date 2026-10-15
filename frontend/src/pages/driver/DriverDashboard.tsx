import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Package, Upload, Landmark } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLoads } from '../../hooks/useLoads';
import { useQuery } from '@tanstack/react-query';
import { settlementsApi } from '../../api/settlements';

const statusLabels: Record<string, string> = { pending: 'Pending', dispatched: 'Dispatched', in_transit: 'In Transit', delivered: 'Delivered' };

const currency = (value: any) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const settlementStatus = (status?: string) => String(status || 'DRAFT').toUpperCase() === 'UNPAID' ? 'DRAFT' : String(status || 'DRAFT').toUpperCase();

const settlementBadge = (status?: string) => {
  const normalized = settlementStatus(status);
  if (normalized === 'PAID') return 'bg-green-100 text-green-700';
  if (normalized === 'APPROVED') return 'bg-blue-100 text-blue-700';
  if (normalized === 'PENDING' || normalized === 'REVIEW') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useLoads({ page: 1, limit: 5 });
  const loads: any[] = data?.data || [];
  const load: any = loads[0];

  const { data: settlementData, isLoading: settlementsLoading, error: settlementsError } = useQuery({
    queryKey: ['driver-settlements-dashboard'],
    queryFn: settlementsApi.getMySettlements,
  });
  const settlements: any[] = settlementData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {(user as any)?.firstName || (user as any)?.first_name || 'Driver'}</h1>
        <p className="text-blue-100 text-sm mt-1">Driver Portal</p>
      </header>
      <main className="p-4 -mt-4 relative z-10 space-y-6">
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1"><h2 className="text-lg font-bold text-gray-800">Current Load</h2>{load && <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase">Active</span>}</div>
          {isLoading ? <div className="bg-white rounded-3xl p-8 text-center text-gray-500 shadow-sm">Loading your load...</div> : error ? <div className="bg-red-50 rounded-3xl p-5 text-red-700">Unable to load your assigned loads.</div> : !load ? <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100"><Package className="mx-auto text-gray-300 mb-3" size={40} /><h3 className="font-bold text-gray-900">No Active Load</h3><p className="text-sm text-gray-500 mt-1">You currently have no load assigned.</p></div> : (
            <Link to={`/driver/loads/${load.id}`} className="block bg-white rounded-3xl shadow-sm border border-gray-100 p-5 overflow-hidden relative"><div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" /><div className="flex justify-between items-start mb-4"><div><p className="text-sm text-gray-500 font-medium">Load #{load.load_number}</p><p className="text-xs text-blue-600 font-bold uppercase mt-2">{statusLabels[load.status] || load.status}</p></div><ChevronRight className="text-blue-600" /></div><div className="relative pl-6"><div className="absolute left-2 top-2 bottom-0 w-0.5 bg-gray-200" /><div className="relative mb-6"><div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white" /><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Pickup</p><p className="font-bold text-gray-900 text-lg">{load.origin || '—'}</p></div><div className="relative"><div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-500" /><p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Delivery</p><p className="font-bold text-gray-900 text-lg">{load.destination || '—'}</p></div></div></Link>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><MapPin className="text-blue-600" size={18} /><h2 className="text-lg font-bold text-gray-800">My Loads</h2></div>
            <Link to="/driver/loads" className="text-sm font-semibold text-blue-600">See all</Link>
          </div>
          {isLoading ? <div className="text-sm text-gray-500">Loading loads...</div> : error ? <div className="text-sm text-red-600">Unable to load assigned loads.</div> : loads.length === 0 ? <div className="text-sm text-gray-500">No loads assigned yet.</div> : (
            <div className="space-y-3">
              {loads.map((entry: any) => (
                <Link key={entry.id} to={`/driver/loads/${entry.id}`} className="block rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">#{entry.load_number}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{entry.origin || '—'} → {entry.destination || '—'}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">{statusLabels[entry.status] || entry.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><Landmark className="text-blue-600" size={18} /><h2 className="text-lg font-bold text-gray-800">Settlements</h2></div>
            <Link to="/driver/settlements" className="text-sm font-semibold text-blue-600">See all</Link>
          </div>
          {settlementsLoading ? <div className="text-sm text-gray-500">Loading settlements...</div> : settlementsError ? <div className="text-sm text-red-600">Unable to load settlements.</div> : settlements.length === 0 ? <div className="text-sm text-gray-500">No settlements available yet.</div> : (
            <div className="space-y-3">
              {settlements.slice(0, 3).map((settlement: any) => (
                <Link key={settlement.id} to={`/driver/settlements/${settlement.id}`} className="block rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Settlement {String(settlement.id).slice(0, 8)}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{currency(settlement.net_amount ?? settlement.driver_pay)}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${settlementBadge(settlement.status)}`}>{settlementStatus(settlement.status)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 gap-4">
          <Link to="/driver/loads" className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 text-gray-700"><MapPin className="text-blue-600" /><span className="font-medium text-sm">My Loads</span></Link>
          <Link to={load ? `/driver/loads/${load.id}/upload` : '/driver/loads'} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center gap-3 text-gray-700"><Upload className="text-orange-600" /><span className="font-medium text-sm">Upload Document</span></Link>
        </section>
      </main>
    </div>
  );
};

export default DriverDashboard;
export { DriverDashboard };
