import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CircleDollarSign, Download, Package } from 'lucide-react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { settlementsApi } from '../../api/settlements';
import { loadsApi } from '../../api/loads';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../hooks/useCompany';
import { downloadDriverSettlementPdf } from '../../utils/driverSettlementPdf';

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

const DriverSettlementDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: company } = useCompany();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['driver-settlement', id],
    queryFn: () => settlementsApi.getSettlementById(id),
    enabled: !!id,
  });
  const settlement = data?.data;
  const loadIds = settlement?.load_ids ?? [];
  const loadQueries = useQueries({
    queries: loadIds.map((loadId: string) => ({
      queryKey: ['driver-settlement-load', loadId],
      queryFn: () => loadsApi.getLoadById(loadId),
    })) as any,
  });

  if (isLoading) return <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-sm">Loading settlement...</div>;
  if (error || !settlement) return <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-red-700">Settlement not found or unavailable.</div>;

  const adjustments = settlement.adjustments ?? [];
  const bonus = adjustments.filter((item: any) => item.category === 'EARNING');
  const deductions = adjustments.filter((item: any) => item.category === 'DEDUCTION' && !item.recurring);
  const recurringDeductions = settlement.recurring_deductions_snapshot ?? [];
  const includedLoads = loadQueries.map((query: any) => query.data).filter(Boolean);
  const downloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadDriverSettlementPdf({
        ...settlement,
        company_name: company?.name,
        pay_percentage: user?.payPercentage,
      }, includedLoads);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      <Link to="/driver/settlements" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
        <ArrowLeft size={18} /> My Settlements
      </Link>

      <header className="rounded-3xl bg-blue-600 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-blue-100">Settlement {String(settlement.id).slice(0, 8)}</p>
            <h1 className="mt-1 text-2xl font-bold">{settlement.driver_name}</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(settlement.status)}`}>{statusLabel(settlement.status)}</span>
            <button type="button" onClick={downloadPdf} disabled={isDownloading || includedLoads.length !== loadIds.length} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50">
              <Download size={15} /> {isDownloading ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-blue-100">Period</p><p className="mt-1 font-semibold">{date(settlement.period_start)} – {date(settlement.period_end)}</p></div>
          <div><p className="text-blue-100">Loads</p><p className="mt-1 font-semibold">{settlement.load_count || loadIds.length}</p></div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><CircleDollarSign className="text-blue-600" size={20} /><h2 className="font-bold text-slate-900">Financial breakdown</h2></div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-500">Base earnings</span><strong>{currency(settlement.base_driver_pay ?? settlement.driver_pay)}</strong></div>
          <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-slate-500">Bonuses and other earnings</p>{bonus.length ? bonus.map((item: any) => <div key={item.id} className="flex justify-between gap-4 text-emerald-700"><span>{item.description}</span><strong>+{currency(item.amount)}</strong></div>) : <span className="text-slate-400">None recorded</span>}</div>
          <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-slate-500">One-time deductions</p>{deductions.length ? deductions.map((item: any) => <div key={item.id} className="flex justify-between gap-4 text-amber-700"><span>{item.description}</span><strong>-{currency(item.amount)}</strong></div>) : <span className="text-slate-400">None recorded</span>}</div>
          <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-slate-500">Recurring deductions</p>{recurringDeductions.length ? recurringDeductions.map((item: any) => <div key={item.template_id} className="flex justify-between gap-4 text-amber-700"><span>{item.description}</span><strong>-{currency(item.amount)}</strong></div>) : <span className="text-slate-400">None recorded</span>}</div>
          <div className="flex justify-between gap-4 border-t border-slate-100 pt-3"><span className="text-slate-500">Gross earnings</span><strong>{currency(settlement.gross_amount)}</strong></div>
          <div className="flex justify-between gap-4 border-t border-slate-100 pt-3 text-lg"><span className="font-bold text-slate-900">Net settlement</span><strong className="text-blue-700">{currency(settlement.net_amount ?? settlement.driver_pay)}</strong></div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><CalendarDays className="text-blue-600" size={20} /><h2 className="font-bold text-slate-900">Payment</h2></div>
        <div className="flex justify-between gap-4 text-sm"><span className="text-slate-500">Payment status</span><strong>{statusLabel(settlement.status) === 'PAID' ? 'PAID' : 'Not paid'}</strong></div>
        {statusLabel(settlement.status) === 'PAID' && <><div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-slate-500">Payment date</span><strong>{date(settlement.payment_date)}</strong></div><div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-slate-500">Net paid</span><strong>{currency(settlement.amount_paid ?? settlement.net_amount)}</strong></div></>}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><Package className="text-blue-600" size={20} /><h2 className="font-bold text-slate-900">Included loads</h2></div>
        <div className="space-y-2">{loadQueries.map((query: any, index) => <div key={loadIds[index]} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm"><span className="font-semibold text-slate-800">#{query.data?.load_number || loadIds[index]}</span><span className="text-slate-500">{date(query.data?.updated_at || query.data?.created_at)}</span></div>)}</div>
      </section>
    </div>
  );
};

export default DriverSettlementDetailPage;
