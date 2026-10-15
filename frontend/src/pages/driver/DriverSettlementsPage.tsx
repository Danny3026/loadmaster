import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CircleDollarSign, Landmark } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settlementsApi } from '../../api/settlements';

const currency = (value: any) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const date = (value?: string) => value
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

const statusLabel = (status?: string) => String(status || 'DRAFT').toUpperCase() === 'UNPAID' ? 'DRAFT' : String(status || 'DRAFT').toUpperCase();

const statusClass = (status?: string) => {
  const normalized = statusLabel(status);
  if (normalized === 'PAID') return 'bg-green-100 text-green-700';
  if (normalized === 'APPROVED') return 'bg-blue-100 text-blue-700';
  if (normalized === 'PENDING' || normalized === 'REVIEW') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const DriverSettlementsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['driver-settlements'],
    queryFn: settlementsApi.getMySettlements,
  });
  const settlements = data?.data ?? [];

  if (isLoading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">Loading your settlements...</div>;
  if (error) return <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">Unable to load your settlements.</div>;

  return (
    <div className="space-y-5 pb-20">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Driver Portal</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">My Settlements</h1>
        <p className="mt-1 text-sm text-slate-500">Review your persisted earnings and payment history.</p>
      </header>

      {settlements.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <Landmark className="mx-auto mb-3 text-slate-300" size={40} />
          <h2 className="font-bold text-slate-900">No settlements yet</h2>
          <p className="mt-1 text-sm text-slate-500">Your settlement statements will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map((settlement: any) => (
            <Link
              key={settlement.id}
              to={`/driver/settlements/${settlement.id}`}
              className="block rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <CircleDollarSign size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-slate-900">Settlement {String(settlement.id).slice(0, 8)}</h2>
                    <p className="mt-1 text-sm text-slate-500">{date(settlement.period_start)} – {date(settlement.period_end)}</p>
                  </div>
                </div>
                <ChevronRight className="mt-1 shrink-0 text-slate-400" size={20} />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Net settlement</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{currency(settlement.net_amount ?? settlement.driver_pay)}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(settlement.status)}`}>{statusLabel(settlement.status)}</span>
                  {settlement.payment_date && <p className="mt-2 text-xs text-slate-500">Paid {date(settlement.payment_date)}</p>}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>{settlement.load_count || settlement.load_ids?.length || 0} loads</span>
                <span>Gross {currency(settlement.gross_amount)}</span>
                <span className="text-right">Deductions -{currency(settlement.deductions_amount)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverSettlementsPage;
