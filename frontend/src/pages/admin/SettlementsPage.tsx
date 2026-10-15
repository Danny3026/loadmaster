import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  Search,
  Plus,
  Download,
  X,
  Landmark,
  Loader2,
  CircleDollarSign,
  CalendarRange,
  Percent,
  CheckCircle2,
  ArrowRightLeft,
} from 'lucide-react';
import { useDrivers } from '../../hooks/useDrivers';
import { useLoads } from '../../hooks/useLoads';
import { useCompany } from '../../hooks/useCompany';
import { settlementsApi } from '../../api/settlements';
import { loadsApi } from '../../api/loads';
import { usersApi } from '../../api/users';
import { useToast } from '../../contexts/ToastContext';

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

type SettlementTab = 'driver' | 'dispatcher';

const SettlementsPage: React.FC = () => {
  const [tab, setTab] = useState<SettlementTab>('driver');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);
  const [recurringDescription, setRecurringDescription] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringDriverId, setRecurringDriverId] = useState('');
  const [recurringError, setRecurringError] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reconcileResult, setReconcileResult] = useState<any>(null);
  const [isFindingLoads, setIsFindingLoads] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [adjustmentSettlement, setAdjustmentSettlement] = useState<any>(null);
  const [adjustmentCategory, setAdjustmentCategory] = useState<'EARNING' | 'DEDUCTION'>('EARNING');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentError, setAdjustmentError] = useState('');
  const [downloadingSettlementId, setDownloadingSettlementId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: company } = useCompany();
  const { showError } = useToast();

  const { data: driversResponse, isLoading: driversLoading } = useDrivers({ limit: 200 });
  const { data: loadsResponse } = useLoads({ limit: 200, page: 1 });
  const { data: settlementsResponse } = useQuery({
    queryKey: ['settlements'],
    queryFn: () => settlementsApi.getSettlements({ search: searchTerm }),
  });
  const { data: recurringDeductionsResponse, isLoading: recurringDeductionsLoading, error: recurringDeductionsError } = useQuery({
    queryKey: ['recurring-deductions'],
    queryFn: () => settlementsApi.getRecurringDeductions(),
    enabled: isRecurringModalOpen,
  });

  const drivers = (driversResponse?.data ?? []).filter((driver: any) => driver && driver.id);
  const loads = loadsResponse?.data ?? [];
  const settlementRows = settlementsResponse?.data ?? [];
  const recurringDeductionRows = recurringDeductionsResponse?.data ?? [];

  const settlementList = useMemo(() => {
    const rows = Array.isArray(settlementRows) ? settlementRows : [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row: any) => (row.driver_name || '').toLowerCase().includes(term));
  }, [searchTerm, settlementRows]);

  const visibleRows = tab === 'driver' ? settlementList : [];

  const totalGross = settlementList.reduce((sum: number, row: any) => sum + Number(row.gross_amount || 0), 0);
  const totalPayout = settlementList.reduce((sum: number, row: any) => sum + Number(row.driver_pay || 0), 0);

  const selectedDriver = drivers.find((driver: any) => driver.id === selectedDriverId) ?? null;

  const createSettlementMutation = useMutation({
    mutationFn: (payload: any) => settlementsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      setIsModalOpen(false);
      setReconcileResult(null);
      setSelectedDriverId('');
      setStartDate('');
      setEndDate('');
      setErrorMessage('');
    },
    onError: (error: any) => {
      setErrorMessage(error?.response?.data?.error?.message || 'Unable to create this settlement.');
    },
  });

  const addAdjustmentMutation = useMutation({
    mutationFn: (payload: any) => settlementsApi.addAdjustment(adjustmentSettlement.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      setAdjustmentDescription('');
      setAdjustmentAmount('');
      setAdjustmentError('');
      setAdjustmentSettlement(null);
    },
    onError: (error: any) => {
      setAdjustmentError(error?.response?.data?.error?.message || 'Unable to save this adjustment.');
    },
  });

  const saveRecurringDeductionMutation = useMutation({
    mutationFn: (payload: any) => editingRecurringId
      ? settlementsApi.updateRecurringDeduction(editingRecurringId, payload)
      : settlementsApi.createRecurringDeduction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-deductions'] });
      setEditingRecurringId(null);
      setRecurringDescription('');
      setRecurringAmount('');
      setRecurringDriverId('');
      setRecurringError('');
    },
    onError: (error: any) => setRecurringError(error?.response?.data?.error?.message || 'Unable to save this recurring deduction.'),
  });

  const toggleRecurringDeductionMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => settlementsApi.updateRecurringDeduction(id, { is_active: isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-deductions'] }),
    onError: (error: any) => setRecurringError(error?.response?.data?.error?.message || 'Unable to update recurring deduction status.'),
  });

  const deleteRecurringDeductionMutation = useMutation({
    mutationFn: (id: string) => settlementsApi.deleteRecurringDeduction(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-deductions'] }),
    onError: (error: any) => setRecurringError(error?.response?.data?.error?.message || 'Unable to delete this recurring deduction.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ settlementId, status }: { settlementId: string; status: string }) => settlementsApi.updateStatus(settlementId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settlements'] }),
    onError: (error: any) => setErrorMessage(error?.response?.data?.error?.message || 'Unable to update settlement status.'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (settlementId: string) => settlementsApi.markPaid(settlementId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settlements'] }),
    onError: (error: any) => setErrorMessage(error?.response?.data?.error?.message || 'Unable to mark settlement as paid.'),
  });

  const openModal = () => {
    setIsModalOpen(true);
    setErrorMessage('');
    setReconcileResult(null);
  };

  const findDeliveredLoads = async () => {
    if (!selectedDriverId || !startDate || !endDate) {
      setErrorMessage('Please choose a driver and both dates.');
      return;
    }

    setIsFindingLoads(true);
    setErrorMessage('');

    try {
      const data = await settlementsApi.reconcile(selectedDriverId, startDate, endDate);
      const loadsArray = data?.data?.loads ?? [];
      setReconcileResult({
        ...data.data,
        loads: loadsArray,
      });
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.error?.message || 'No qualifying delivered loads were found for this driver and date range.');
    } finally {
      setIsFindingLoads(false);
    }
  };

  const handleGenerateSettlement = async () => {
    if (!reconcileResult || !selectedDriverId) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await createSettlementMutation.mutateAsync({
        driver_id: selectedDriverId,
        period_start: startDate,
        period_end: endDate,
        load_ids: (reconcileResult.loads || []).map((load: any) => load.id),
      });
    } catch {
      // handled in mutation onError
    } finally {
      setIsSubmitting(false);
    }
  };

  const canFindLoads = !!selectedDriverId && !!startDate && !!endDate;

  const openAdjustment = (settlement: any, category: 'EARNING' | 'DEDUCTION') => {
    setAdjustmentSettlement(settlement);
    setAdjustmentCategory(category);
    setAdjustmentDescription('');
    setAdjustmentAmount('');
    setAdjustmentError('');
  };

  const saveAdjustment = async () => {
    const amount = Number(adjustmentAmount);
    if (!adjustmentDescription.trim()) {
      setAdjustmentError('Description is required.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setAdjustmentError('Amount must be greater than zero.');
      return;
    }
    await addAdjustmentMutation.mutateAsync({
      category: adjustmentCategory,
      type: adjustmentCategory === 'EARNING' ? 'BONUS' : 'OTHER',
      description: adjustmentDescription.trim(),
      amount,
    });
  };

  const saveRecurringDeduction = () => {
    const amount = Number(recurringAmount);
    if (!recurringDescription.trim()) {
      setRecurringError('Description is required.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setRecurringError('Amount must be greater than zero.');
      return;
    }
    saveRecurringDeductionMutation.mutate({
      description: recurringDescription.trim(),
      amount,
      driver_id: recurringDriverId || null,
    });
  };

  const editRecurringDeduction = (template: any) => {
    setEditingRecurringId(template.id);
    setRecurringDescription(template.description);
    setRecurringAmount(String(template.amount));
    setRecurringDriverId(template.driver_id || '');
    setRecurringError('');
  };

  const handleDownloadSettlementPdf = async (settlement: any) => {
    setDownloadingSettlementId(settlement.id);
    try {
      const includedLoadIds = Array.isArray(settlement.load_ids) ? settlement.load_ids : [];
      const includedLoads = await Promise.all(includedLoadIds.map((loadId: string) => loadsApi.getLoadById(loadId)));
      const recurringSnapshot = Array.isArray(settlement.recurring_deductions_snapshot) ? settlement.recurring_deductions_snapshot : [];
      const recurringAmount = Number(settlement.recurring_deductions_amount || 0);
      const usersResponse = await usersApi.getUsers({ limit: 200, offset: 0 });
      const driver = drivers.find((candidate: any) => candidate.id === settlement.driver_id);
      const users = usersResponse?.data ?? [];
      const driverUser = users.find((user: any) => user.id === driver?.user_id);
      const payPercentage = driverUser?.payPercentage ?? driverUser?.pay_percentage;
      const pdf = await PDFDocument.create();
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const ink = rgb(0.067, 0.094, 0.153);
      const muted = rgb(0.31, 0.35, 0.41);
      const blue = rgb(0.12, 0.29, 0.64);
      const light = rgb(0.95, 0.96, 0.98);
      let page = pdf.addPage([595, 842]);
      let y = 792;

      const money = (value: any) => currency(Number(value || 0));
      const date = (value?: string) => value ? formatDate(value) : '—';
      const draw = (text: string, x: number, yPosition: number, size = 10, font = regular, color = ink) => {
        page.drawText(String(text || '—'), { x, y: yPosition, size, font, color, maxWidth: 250 });
      };
      const section = (title: string) => {
        if (y < 90) {
          page = pdf.addPage([595, 842]);
          y = 792;
        }
        page.drawRectangle({ x: 36, y: y - 8, width: 523, height: 22, color: light });
        draw(title, 44, y, 11, bold, blue);
        y -= 34;
      };
      const row = (label: string, value: string, x = 44) => {
        draw(label, x, y, 9, bold, muted);
        draw(value, x, y - 15, 10, regular, ink);
      };

      page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.99, 0.99, 1) });
      draw(company?.name || 'Company', 36, y, 22, bold, blue);
      draw(`Driver Settlement | ${String(settlement.status || 'DRAFT').toUpperCase()}`, 36, y - 28, 14, bold);
      draw(`Settlement ID: ${settlement.id}`, 36, y - 50, 9, regular, muted);
      y -= 86;

      section('Company and driver');
      row('Company', company?.name || '—');
      row('Driver', settlement.driver_name || '—', 310);
      y -= 34;
      row('Company address', [company?.addressLine1, company?.city, company?.state, company?.zipCode].filter(Boolean).join(', ') || '—');
      row('Pay percentage', payPercentage == null ? '—' : `${Number(payPercentage)}%`, 310);
      y -= 34;
      row('Settlement period', `${date(settlement.period_start)} – ${date(settlement.period_end)}`);
      row('Driver ID', settlement.driver_id || '—', 310);
      y -= 48;

      section('Included loads');
      draw('Load number', 44, y, 9, bold, muted);
      draw('Load date', 220, y, 9, bold, muted);
      draw('Load ID', 330, y, 9, bold, muted);
      y -= 18;
      includedLoads.forEach((load: any) => {
        if (y < 58) {
          page = pdf.addPage([595, 842]);
          y = 792;
          section('Included loads (continued)');
        }
        draw(load.load_number || load.loadNumber || '—', 44, y, 9);
        draw(date(load.updated_at || load.created_at || load.updatedAt || load.createdAt), 220, y, 9);
        draw(load.id || '—', 330, y, 8, regular, muted);
        y -= 18;
      });
      if (includedLoads.length === 0) {
        draw('No included loads recorded.', 44, y, 10, regular, muted);
        y -= 18;
      }
      y -= 24;

      section('Financial summary');
      row('Base earnings', money(settlement.base_driver_pay ?? settlement.driver_pay));
      row('Bonuses and other earnings', money(settlement.earnings_adjustments ?? settlement.bonus_amount));
      y -= 34;
      row('One-time deductions', `-${money(Math.max(0, Number(settlement.deductions_amount || 0) - recurringAmount))}`);
      row('Gross earnings', money(settlement.gross_amount), 310);
      y -= 34;
      row('Recurring deductions', `-${money(recurringAmount)}`);
      y -= 34;
      recurringSnapshot.forEach((deduction: any) => {
        if (y < 58) {
          page = pdf.addPage([595, 842]);
          y = 792;
          section('Financial summary (continued)');
        }
        draw(deduction.description || 'Recurring deduction', 44, y, 9, regular, muted);
        draw(`-${money(deduction.amount)}`, 450, y, 9, regular, ink);
        y -= 16;
      });
      if (recurringSnapshot.length > 0) y -= 18;
      row('Net settlement', money(settlement.net_amount ?? settlement.driver_pay));
      row('Paid amount', settlement.amount_paid == null ? '—' : money(settlement.amount_paid), 310);
      y -= 48;

      section('Approval and payment');
      row('Status', String(settlement.status || 'DRAFT').toUpperCase());
      row('Approved at', date(settlement.approved_at), 310);
      y -= 34;
      row('Approved by', settlement.approved_by || '—');
      row('Payment date', date(settlement.payment_date), 310);
      y -= 34;
      row('Paid by', settlement.paid_by || '—');
      y -= 30;
      draw('Generated from the persisted settlement record. Financial values are not recalculated in this document.', 44, y, 8, regular, muted);

      const bytes = await pdf.save();
      const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Driver-Settlement-${String(settlement.id).slice(0, 8)}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      showError('Settlement PDF generation failed. Please try again.');
    } finally {
      setDownloadingSettlementId(null);
    }
  };

  if (driversLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center gap-3 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading settlements…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] pb-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-700">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-[38px] font-bold tracking-[-0.04em] text-slate-900">Settlements</h1>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setIsRecurringModalOpen(true);
              setRecurringError('');
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Recurring Deduction Templates
          </button>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1f4aa4] px-4 py-3 text-[15px] font-medium text-white shadow-sm transition hover:bg-[#163a87]"
          >
            <Plus className="h-4 w-4" />
            Generate Settlement
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="text-[17px] leading-snug text-slate-600">
          Generate and manage driver &amp; dispatcher pay statements
        </div>
        <div className="relative w-full max-w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search settlements..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[15px] text-slate-700 outline-none transition focus:border-slate-400"
          />
        </div>
      </div>

      <div className="mb-6 inline-flex w-full max-w-[600px] rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('driver')}
          className={`flex-1 rounded-lg px-4 py-3 text-[15px] font-medium transition ${
            tab === 'driver' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Driver Settlements
        </button>
        <button
          type="button"
          onClick={() => setTab('dispatcher')}
          className={`flex-1 rounded-lg px-4 py-3 text-[15px] font-medium transition ${
            tab === 'dispatcher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
          }`}
        >
          Dispatcher Settlements
        </button>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
            <CircleDollarSign className="h-4 w-4" />
            Gross volume
          </div>
          <div className="text-[26px] font-semibold text-slate-900">{currency(totalGross)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
            <Percent className="h-4 w-4" />
            Driver pay
          </div>
          <div className="text-[26px] font-semibold text-slate-900">{currency(totalPayout)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-slate-500">
            <CalendarRange className="h-4 w-4" />
            Records
          </div>
          <div className="text-[26px] font-semibold text-slate-900">{settlementList.length}</div>
        </div>
      </div>

      {settlementList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
            <Landmark className="h-7 w-7 text-slate-300" />
          </div>
          <h2 className="text-[28px] font-semibold text-slate-600">No settlements yet.</h2>
          <p className="mt-2 text-[16px] text-slate-500">Generate one to create a driver pay statement.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {settlementList.map((row: any) => (
            <div key={row.id || row.driver_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[20px] font-semibold text-slate-900">{row.driver_name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-[14px] text-slate-500">
                      <span>{row.load_count || 0} loads</span>
                      <span>{row.period_start} – {row.period_end}</span>
                      <span>{String(row.status || 'UNPAID').toUpperCase() === 'UNPAID' ? 'DRAFT' : row.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-[12px] uppercase tracking-wide text-slate-500">Gross</div>
                    <div className="text-[22px] font-semibold text-slate-900">{currency(row.gross_amount)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] uppercase tracking-wide text-slate-500">Pay</div>
                    <div className="text-[22px] font-semibold text-slate-900">{currency(row.driver_pay)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {String(row.status || '').toUpperCase() === 'UNPAID' && (
                  <button type="button" onClick={() => statusMutation.mutate({ settlementId: row.id, status: 'PENDING' })} disabled={statusMutation.isPending} className="rounded-lg border border-blue-200 px-3 py-2 text-[13px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">Submit for Review</button>
                )}
                {['PENDING', 'REVIEW'].includes(String(row.status || '').toUpperCase()) && (
                  <button type="button" onClick={() => statusMutation.mutate({ settlementId: row.id, status: 'APPROVED' })} disabled={statusMutation.isPending} className="rounded-lg bg-emerald-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Approve Settlement</button>
                )}
                {String(row.status || '').toUpperCase() === 'APPROVED' && (
                  <button type="button" onClick={() => markPaidMutation.mutate(row.id)} disabled={markPaidMutation.isPending} className="rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">{markPaidMutation.isPending ? 'Marking Paid...' : 'Mark Paid'}</button>
                )}
                {['APPROVED', 'PAID'].includes(String(row.status || '').toUpperCase()) && (
                  <button type="button" onClick={() => handleDownloadSettlementPdf(row)} disabled={downloadingSettlementId === row.id} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    <Download className="h-4 w-4" />
                    {downloadingSettlementId === row.id ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                )}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">Settlement adjustments</div>
                  {!['APPROVED', 'PAID'].includes(String(row.status || '').toUpperCase()) && <div className="flex gap-2">
                    <button type="button" onClick={() => openAdjustment(row, 'EARNING')} className="rounded-lg border border-emerald-200 px-3 py-2 text-[13px] font-medium text-emerald-700 hover:bg-emerald-50">Add Bonus</button>
                    <button type="button" onClick={() => openAdjustment(row, 'DEDUCTION')} className="rounded-lg border border-amber-200 px-3 py-2 text-[13px] font-medium text-amber-700 hover:bg-amber-50">Add Deduction</button>
                  </div>}
                </div>
                {(row.adjustments || []).filter((adjustment: any) => !adjustment.recurring).length === 0 ? (
                  <div className="text-[14px] text-slate-500">No adjustments recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {(row.adjustments || []).filter((adjustment: any) => !adjustment.recurring).map((adjustment: any) => (
                      <div key={adjustment.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[14px]">
                        <span className="text-slate-700">{adjustment.description} <span className="ml-2 text-[12px] uppercase text-slate-400">{adjustment.category}</span></span>
                        <span className={adjustment.category === 'DEDUCTION' ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>
                          {adjustment.category === 'DEDUCTION' ? '-' : '+'}{currency(Number(adjustment.amount || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {(row.recurring_deductions_snapshot || []).length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                    <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-amber-800">Recurring deductions</div>
                    <div className="space-y-2">
                      {row.recurring_deductions_snapshot.map((deduction: any) => (
                        <div key={`${deduction.template_id}-${deduction.driver_id || 'all'}`} className="flex items-center justify-between text-[14px]">
                          <span className="text-slate-700">{deduction.description}</span>
                          <span className="font-semibold text-amber-700">-{currency(Number(deduction.amount || 0))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 grid gap-3 text-[14px] sm:grid-cols-4">
                  <div><span className="text-slate-500">Base earnings</span><div className="font-semibold text-slate-900">{currency(Number(row.base_driver_pay ?? row.driver_pay ?? 0))}</div></div>
                  <div><span className="text-slate-500">Gross earnings</span><div className="font-semibold text-slate-900">{currency(Number(row.gross_amount || 0))}</div></div>
                  <div><span className="text-slate-500">One-time deductions</span><div className="font-semibold text-amber-700">-{currency(Math.max(0, Number(row.deductions_amount || 0) - Number(row.recurring_deductions_amount || 0)))}</div></div>
                  <div><span className="text-slate-500">Recurring deductions</span><div className="font-semibold text-amber-700">-{currency(Number(row.recurring_deductions_amount || 0))}</div></div>
                  <div><span className="text-slate-500">Net settlement</span><div className="font-semibold text-slate-900">{currency(Number(row.net_amount ?? row.driver_pay ?? 0))}</div></div>
                  <div><span className="text-slate-500">Payment date</span><div className="font-semibold text-slate-900">{formatDate(row.payment_date)}</div></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#1f4aa4]">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <h2 className="text-[24px] font-semibold text-slate-900">Recurring Deduction Templates</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRecurringModalOpen(false);
                  setEditingRecurringId(null);
                  setRecurringError('');
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close recurring deduction templates"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <p className="text-[14px] leading-relaxed text-slate-600">
                Active templates are included only in new settlements for the selected driver. Existing settlements keep their saved deduction details and amounts.
              </p>
              {recurringError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{recurringError}</div>}
              {recurringDeductionsError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {(recurringDeductionsError as any)?.response?.data?.error?.message || 'Unable to load recurring deduction templates.'}
              </div>}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Applies To
                    <select
                      value={recurringDriverId}
                      onChange={(event) => setRecurringDriverId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                    >
                      <option value="">All Drivers</option>
                      {drivers.map((driver: any) => (
                        <option key={driver.id} value={driver.id}>{driver.first_name || ''} {driver.last_name || ''}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Amount
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={recurringAmount}
                      onChange={(event) => setRecurringAmount(event.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                    />
                  </label>
                </div>
                <label className="mt-4 block text-sm font-medium text-slate-700">
                  Description
                  <input
                    value={recurringDescription}
                    onChange={(event) => setRecurringDescription(event.target.value)}
                    placeholder="e.g. Truck Payment, Insurance, Fuel Card"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
                  />
                </label>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {editingRecurringId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecurringId(null);
                        setRecurringDescription('');
                        setRecurringAmount('');
                        setRecurringDriverId('');
                        setRecurringError('');
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={saveRecurringDeductionMutation.isPending}
                    onClick={saveRecurringDeduction}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1f4aa4] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163a87] disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {saveRecurringDeductionMutation.isPending ? 'Saving...' : editingRecurringId ? 'Save Changes' : 'Add Template'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Existing templates</h3>
                {recurringDeductionsLoading ? (
                  <div className="rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-500">Loading templates...</div>
                ) : recurringDeductionsError ? null : recurringDeductionRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No recurring deduction templates yet.</div>
                ) : (
                  <div className="space-y-3">
                    {recurringDeductionRows.map((template: any) => {
                      const driver = drivers.find((candidate: any) => candidate.id === template.driver_id);
                      const appliesTo = driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() : 'All Drivers';
                      return (
                        <div key={template.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{template.description}</div>
                            <div className="mt-1 text-sm text-slate-500">{appliesTo}</div>
                            <div className={`mt-1 text-sm font-medium ${template.is_active ? 'text-amber-700' : 'text-slate-400'}`}>-{currency(Number(template.amount))}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(template.is_active)}
                              aria-label={`${template.is_active ? 'Deactivate' : 'Activate'} ${template.description}`}
                              disabled={toggleRecurringDeductionMutation.isPending}
                              onClick={() => toggleRecurringDeductionMutation.mutate({ id: template.id, isActive: !template.is_active })}
                              className={`relative h-7 w-12 rounded-full transition ${template.is_active ? 'bg-blue-600' : 'bg-slate-300'} disabled:opacity-50`}
                            >
                              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${template.is_active ? 'left-6' : 'left-1'}`} />
                            </button>
                            <button type="button" onClick={() => editRecurringDeduction(template)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                            <button
                              type="button"
                              disabled={deleteRecurringDeductionMutation.isPending}
                              onClick={() => {
                                if (window.confirm(`Delete "${template.description}"? Existing settlements will not change.`)) {
                                  deleteRecurringDeductionMutation.mutate(template.id);
                                }
                              }}
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[760px] rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <CircleDollarSign className="h-5 w-5" />
                </div>
                <h2 className="text-[28px] font-semibold text-slate-900">Driver Pay Reconciliation</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setErrorMessage('');
                  setReconcileResult(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                aria-label="Close settlement reconciliation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="mb-4 grid gap-4 md:grid-cols-3">
                <label className="block text-[14px] font-medium text-slate-700">
                  <span className="mb-2 block">Driver</span>
                  <select
                    value={selectedDriverId}
                    onChange={(event) => setSelectedDriverId(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-[15px] text-slate-700 outline-none ring-0 transition focus:border-[#1f4aa4]"
                  >
                    <option value="">Select driver</option>
                    {drivers.map((driver: any) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name || ''} {driver.last_name || ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[14px] font-medium text-slate-700">
                  <span className="mb-2 block">Period Start</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-[15px] text-slate-700 outline-none transition focus:border-[#1f4aa4]"
                  />
                </label>

                <label className="block text-[14px] font-medium text-slate-700">
                  <span className="mb-2 block">Period End</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-[15px] text-slate-700 outline-none transition focus:border-[#1f4aa4]"
                  />
                </label>
              </div>

              {errorMessage && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[14px] text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="mb-5">
                <button
                  type="button"
                  disabled={!canFindLoads || isFindingLoads}
                  onClick={findDeliveredLoads}
                  className="w-full rounded-xl border border-[#1f4aa4] bg-[#1f4aa4] px-4 py-3 text-[17px] font-semibold text-white transition hover:bg-[#163a87] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                >
                  {isFindingLoads ? 'Finding delivered loads...' : 'Find Delivered Loads'}
                </button>
              </div>

              {reconcileResult && (
                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-[16px] font-semibold text-slate-900">{reconcileResult.total_loads} Delivered Loads</div>
                    <div className="text-[13px] uppercase tracking-wide text-slate-500">{formatDate(reconcileResult.period_start)} – {formatDate(reconcileResult.period_end)}</div>
                  </div>

                  <div className="space-y-3">
                    {(reconcileResult.loads || []).map((load: any) => (
                      <div key={load.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-700">
                        <span>#{load.load_number}</span>
                        <span>{formatShortDate(load.delivered_at)}</span>
                        <span>{currency(Number(load.gross_amount || 0))}</span>
                        <span>{currency(Number(load.driver_pay || 0))}</span>
                        <span className="font-medium text-emerald-700">Delivered</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-[12px] uppercase tracking-wide text-slate-500">Gross Volume</div>
                      <div className="mt-1 text-[22px] font-semibold text-slate-900">{currency(Number(reconcileResult.gross_amount || 0))}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-[12px] uppercase tracking-wide text-slate-500">Driver Pay</div>
                      <div className="mt-1 text-[22px] font-semibold text-slate-900">{currency(Number(reconcileResult.driver_pay || 0))}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  disabled={!reconcileResult || isSubmitting}
                  onClick={handleGenerateSettlement}
                  className="w-full rounded-xl bg-[#7aa5f7] px-4 py-3 text-[17px] font-semibold text-slate-900 transition hover:bg-[#6b97eb] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {isSubmitting ? 'Generating settlement...' : 'Generate Settlement'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrorMessage('');
                    setReconcileResult(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[17px] font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {adjustmentSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[22px] font-semibold text-slate-900">Add {adjustmentCategory === 'EARNING' ? 'Bonus' : 'Deduction'}</h2>
              <button type="button" onClick={() => setAdjustmentSettlement(null)} aria-label="Close adjustment dialog" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500"><X className="h-4 w-4" /></button>
            </div>
            {adjustmentError && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{adjustmentError}</div>}
            <label className="mb-3 block text-sm font-medium text-slate-700">Description<input value={adjustmentDescription} onChange={(event) => setAdjustmentDescription(event.target.value)} placeholder={adjustmentCategory === 'EARNING' ? 'Performance Bonus' : 'Equipment Damage'} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
            <label className="mb-5 block text-sm font-medium text-slate-700">Amount<input type="number" min="0.01" step="0.01" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
            <button type="button" disabled={addAdjustmentMutation.isPending} onClick={saveAdjustment} className="w-full rounded-lg bg-[#1f4aa4] px-4 py-3 font-semibold text-white disabled:bg-slate-300">{addAdjustmentMutation.isPending ? 'Saving...' : 'Save Adjustment'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementsPage;
