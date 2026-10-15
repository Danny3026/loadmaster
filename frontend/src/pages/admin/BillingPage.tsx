import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, Plus, Download, X, Truck, MapPin, FileText } from 'lucide-react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { invoicesApi } from '../../api/invoices';
import { useInvoices, useCreateInvoice, useUpdateInvoice, useMarkInvoiceAsSent, useMarkInvoiceAsPaid } from '../../hooks/useInvoices';
import { useLoads } from '../../hooks/useLoads';
import { useToast } from '../../contexts/ToastContext';
import { useCompany } from '../../hooks/useCompany';

type AccessoryItem = {
  id: number;
  label: string;
  description: string;
  amount: string;
};

type DraftInvoice = {
  loadId: string;
  companyName: string;
  invoiceNumber: string;
  brokerName: string;
  brokerMc: string;
  driverName: string;
  loadNumber: string;
  commodity: string;
  pickupLocation: string;
  deliveryLocation: string;
  rate: string;
  miles: string;
  dateFactored: string;
  invoiceDate: string;
  invoiceSentDate: string;
  paymentReceivedDate: string;
  status: 'PENDING' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  accessorials: AccessoryItem[];
  notes: string;
};

const currency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const todayDateInputValue = () => toDateInputValue(new Date().toISOString()) || '';

const createEmptyDraft = (): DraftInvoice => ({
  loadId: '',
  companyName: '',
  invoiceNumber: '',
  brokerName: '',
  brokerMc: '',
  driverName: '',
  loadNumber: '',
  commodity: '',
  pickupLocation: '',
  deliveryLocation: '',
  rate: '',
  miles: '',
  dateFactored: new Date().toISOString().slice(0, 10),
  invoiceDate: new Date().toISOString().slice(0, 10),
  invoiceSentDate: '',
  paymentReceivedDate: '',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  accessorials: [],
  notes: '',
});

const invoiceFromRecord = (invoice: any): DraftInvoice => ({
  loadId: invoice.load_id || '',
  companyName: invoice.company_name || '',
  invoiceNumber: invoice.invoice_number || '',
  brokerName: invoice.broker_name || '',
  brokerMc: invoice.mc_number || invoice.broker_mc_number || '',
  driverName: invoice.driver_first_name && invoice.driver_last_name
    ? `${invoice.driver_first_name} ${invoice.driver_last_name}`
    : '',
  loadNumber: invoice.load_number || '',
  commodity: invoice.commodity || '',
  pickupLocation: invoice.pickup_location || '',
  deliveryLocation: invoice.delivery_location || '',
  rate: invoice.rate != null ? String(invoice.rate) : '',
  miles: invoice.miles != null ? String(invoice.miles) : '',
  dateFactored: toDateInputValue(invoice.date_factored),
  invoiceDate: toDateInputValue(invoice.invoice_date),
  invoiceSentDate: toDateInputValue(invoice.invoice_sent_date),
  paymentReceivedDate: toDateInputValue(invoice.payment_received_date),
  status: (invoice.status || 'PENDING') as DraftInvoice['status'],
  paymentStatus: (invoice.payment_status || 'UNPAID') as DraftInvoice['paymentStatus'],
  accessorials: Array.isArray(invoice.accessorials) && invoice.accessorials.length
    ? invoice.accessorials.map((item: any, index: number) => ({ id: index + 1, label: item.label || 'Other', description: item.description || '', amount: String(item.amount ?? 0) }))
    : [],
  notes: invoice.notes || '',
});

const BillingPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftInvoice>(createEmptyDraft());
  const { showError, showSuccess } = useToast();
  const createInvoiceMutation = useCreateInvoice();
  const updateInvoiceMutation = useUpdateInvoice();
  const markSentMutation = useMarkInvoiceAsSent();
  const markPaidMutation = useMarkInvoiceAsPaid();
  const { data: loadsResponse } = useLoads({ page: 1, limit: 100 });
  const loads = loadsResponse?.data || [];
  const { data: company } = useCompany();

  const { data: response, isLoading, error } = useInvoices({
    page,
    limit,
    search: search || undefined,
  });

  const invoices = (response as any)?.data || [];
  const total = (response as any)?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  const invoiceTotal = useMemo(() => {
    const rate = Number(draft.rate || 0);
    const extras = draft.accessorials.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return rate + extras;
  }, [draft.rate, draft.accessorials]);

  const isSaving = createInvoiceMutation.isPending || updateInvoiceMutation.isPending;
  const isStatusUpdating = markSentMutation.isPending || markPaidMutation.isPending;

  const selectLoad = (loadId: string) => {
    const load: any = loads.find((item: any) => item.id === loadId);
    if (!load) return;
    setDraft((previous) => ({
      ...previous,
      loadId,
      loadNumber: load.load_number || '',
      driverName: (load.driver_first_name || load.latest_driver_first_name)
        && (load.driver_last_name || load.latest_driver_last_name)
        ? `${load.driver_first_name || load.latest_driver_first_name} ${load.driver_last_name || load.latest_driver_last_name}`
        : '',
      brokerName: load.broker_name || '',
      commodity: load.commodity || '',
      rate: load.rate != null ? String(load.rate) : '',
      pickupLocation: load.origin || '',
      deliveryLocation: load.destination || '',
      miles: load.loaded_miles != null ? String(load.loaded_miles) : '',
    }));
  };

  const openSavedInvoice = async (invoice: any) => {
    const response = await invoicesApi.getInvoiceById(invoice.id);
    const fullInvoice = (response as any).data || response;
    setDraft(invoiceFromRecord(fullInvoice));
    setSelectedInvoiceId(invoice.id);
    setIsInvoiceModalOpen(true);
  };

  const updateDraft = <K extends keyof DraftInvoice>(key: K, value: DraftInvoice[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const addAccessoryCharge = () => {
    setDraft((prev) => ({
      ...prev,
      accessorials: [...prev.accessorials, { id: Date.now(), label: 'Detention', description: '', amount: '0.00' }],
    }));
  };

  const updateAccessory = (id: number, field: 'label' | 'description' | 'amount', value: string) => {
    setDraft((prev) => ({
      ...prev,
      accessorials: prev.accessorials.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeAccessory = (id: number) => {
    setDraft((prev) => ({
      ...prev,
      accessorials: prev.accessorials.filter((item) => item.id !== id),
    }));
  };

  const validateDraft = () => {
    if (!draft.invoiceNumber.trim()) return 'Invoice number is required.';
    if (!draft.brokerName.trim()) return 'Broker name is required.';
    if (!draft.loadNumber.trim()) return 'Load number is required.';
    if (!draft.rate || Number(draft.rate) <= 0) return 'Line haul rate must be greater than zero.';
    return '';
  };

  const handleSaveInvoice = async () => {
    const validationError = validateDraft();
    if (validationError) {
      showError(validationError);
      return;
    }

    const payload = {
      invoice_number: draft.invoiceNumber,
      load_id: draft.loadId,
      rate: Number(draft.rate),
      extras: draft.accessorials.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      total_amount: invoiceTotal,
      invoice_date: draft.invoiceDate || new Date().toISOString().slice(0, 10),
      date_factored: draft.dateFactored || draft.invoiceDate || new Date().toISOString().slice(0, 10),
      invoice_sent_date: draft.invoiceSentDate || null,
      payment_received_date: draft.paymentReceivedDate || null,
      status: draft.status,
      payment_status: draft.paymentStatus,
      notes: draft.notes,
      accessorials: draft.accessorials.map((item) => ({ label: item.label, description: item.description, amount: Number(item.amount || 0) })),
    };

    try {
      if (selectedInvoiceId) {
        await updateInvoiceMutation.mutateAsync({ id: String(selectedInvoiceId), data: payload });
      } else {
        await createInvoiceMutation.mutateAsync(payload);
      }
      showSuccess('Invoice saved successfully.');
      setIsInvoiceModalOpen(false);
    } catch (error: any) {
      const message = error?.response?.data?.error?.message || error?.message || 'Could not save invoice.';
      showError(message);
    }
  };

  const handleMarkSent = () => {
    if (!selectedInvoiceId || draft.status !== 'PENDING') return;
    const invoiceSentDate = draft.invoiceSentDate || todayDateInputValue();
    if (!window.confirm(`Mark this invoice as sent on ${invoiceSentDate}?`)) return;
    markSentMutation.mutate({ id: String(selectedInvoiceId), invoiceSentDate }, {
      onSuccess: (response: any) => {
        const saved = response?.data || response;
        setDraft((previous) => ({
          ...previous,
          status: saved.status || 'SENT',
          invoiceSentDate: toDateInputValue(saved.invoice_sent_date) || invoiceSentDate,
        }));
      },
    });
  };

  const handleMarkPaid = () => {
    if (!selectedInvoiceId || draft.status !== 'SENT') return;
    const paymentReceivedDate = draft.paymentReceivedDate || todayDateInputValue();
    if (!window.confirm(`Confirm payment received on ${paymentReceivedDate}?`)) return;
    markPaidMutation.mutate({ id: String(selectedInvoiceId), paymentReceivedDate }, {
      onSuccess: (response: any) => {
        const saved = response?.data || response;
        setDraft((previous) => ({
          ...previous,
          status: saved.status || 'PAID',
          paymentStatus: saved.payment_status || 'PAID',
          paymentReceivedDate: toDateInputValue(saved.payment_received_date) || paymentReceivedDate,
        }));
      },
    });
  };

  const handleDownloadPdf = async () => {
    if (!draft.invoiceNumber.trim() && !draft.brokerName.trim()) {
      showError('Generate an invoice before downloading the PDF.');
      return;
    }

    try {
      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595, 842]);
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const black = rgb(0.067, 0.094, 0.153);
      const blue = rgb(0.231, 0.51, 0.965);
      const draw = (text: string, x: number, y: number, size = 11, font = regular, color = black) => {
        page.drawText(text || '-', { x, y, size, font, color, maxWidth: 260 });
      };
      page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.969, 0.973, 0.98) });
      draw(`Invoice ${draft.invoiceNumber || 'Draft'}`, 40, 790, 22, bold);
      draw(`Status: ${draft.status}`, 430, 794, 10, bold);
      draw('Transportation Company', 40, 750, 11, bold); draw(draft.companyName || company?.name || '', 40, 732);
      draw('Broker', 40, 696, 11, bold); draw(draft.brokerName, 40, 678); draw(`MC# ${draft.brokerMc || '-'}`, 40, 660);
      draw('Load #', 220, 750, 11, bold); draw(draft.loadNumber, 220, 732); draw('Commodity', 220, 714, 11, bold); draw(draft.commodity, 220, 696);
      draw('Driver', 400, 750, 11, bold); draw(draft.driverName || 'Unassigned', 400, 732);
      draw('Pickup', 40, 620, 11, bold); draw(draft.pickupLocation, 40, 602); draw('Delivery', 300, 620, 11, bold); draw(draft.deliveryLocation, 300, 602);
      draw('Line Haul Rate', 40, 590, 11, bold); draw(currency(Number(draft.rate || 0)), 40, 572, 12, regular, blue);
      draw('Miles', 180, 590, 11, bold); draw(draft.miles || '-', 180, 572, 12, regular, blue);
      draw('Date Factored', 280, 590, 11, bold); draw(draft.dateFactored || '-', 280, 572, 12, regular, blue);
      draw('Invoice Total', 430, 590, 11, bold); draw(currency(invoiceTotal), 430, 572, 12, regular, blue);
      draw('Invoice Sent Date', 40, 520, 11, bold); draw(draft.invoiceSentDate || '-', 40, 502); draw('Payment Received Date', 220, 520, 11, bold); draw(draft.paymentReceivedDate || '-', 220, 502);
      draw('Accessorial Charges', 40, 450, 12, bold);
      let y = 426;
      draft.accessorials.forEach((item) => { draw(item.label || 'Accessorial', 40, y); draw(currency(Number(item.amount || 0)), 430, y, 11, regular, black); y -= 22; });
      const accessorialTotal = draft.accessorials.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      draw(`Accessorial Total: ${currency(accessorialTotal)}`, 350, Math.max(y - 10, 300), 12, bold);
      draw(`Invoice Total: ${currency(invoiceTotal)}`, 350, Math.max(y - 36, 274), 14, bold);
      const bytes = await pdf.save();
      const blobBytes = new Uint8Array(bytes);
      const blobUrl = URL.createObjectURL(new Blob([blobBytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Broker-Invoice-${(draft.invoiceNumber || 'Draft').replace(/[^a-zA-Z0-9-_]+/g, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      showError('PDF generation failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f4f6] p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111827] md:text-4xl">Invoices</h1>
            <p className="mt-2 text-sm text-[#4b5563] md:text-base">
              Click an invoice to view details and add accessorial charges
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <button
              type="button"
              onClick={() => {
                setDraft(createEmptyDraft());
                setSelectedInvoiceId(null);
                setIsInvoiceModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8]"
            >
              <Plus size={17} /> Broker Invoice
            </button>
            <div className="relative w-full max-w-[540px] md:min-w-[360px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search invoices..."
                className="h-12 w-full rounded-xl border border-[#d1d5db] bg-white pl-10 pr-4 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#9ca3af] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#d1d5db] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full text-left text-sm">
              <thead className="bg-[#f9fafb] text-[#4b5563]">
                <tr>
                  {[
                    'Invoice #',
                    'Load #',
                    'Broker',
                    'Driver',
                    'Route',
                    'Status',
                    'Rate',
                    'Extras',
                    'Invoice Total',
                    'Date Factored',
                    'Invoice Sent',
                    'Payment Received',
                  ].map((header) => (
                    <th key={header} className="border-b border-[#e5e7eb] px-4 py-3 font-semibold tracking-wide">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-[#6b7280]">
                      Loading invoices...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-[#b91c1c]">
                      Failed to load invoices.
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-sm text-[#6b7280]">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice: any) => {
                    const isSelected = selectedInvoiceId === invoice.id;
                    const paymentStatus = invoice.payment_status || 'UNPAID';
                    const status = invoice.status || 'PENDING';
                    const invoiceTotalAmount = Number(invoice.total_amount || 0);
                    const extras = Number(invoice.extras || 0);
                    const rate = Number(invoice.rate || 0);

                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => openSavedInvoice(invoice)}
                        className={[
                          'cursor-pointer transition-colors',
                          isSelected ? 'bg-blue-50' : 'hover:bg-[#f9fafb]',
                        ].join(' ')}
                      >
                        <td className="border-b border-[#e5e7eb] px-4 py-3 font-semibold text-[#2563eb]">
                          {invoice.invoice_number || '—'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 text-[#374151]">
                          {invoice.load_number || '—'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 text-[#111827]">
                          {invoice.broker_name || '—'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 text-[#111827]">
                          {invoice.driver_first_name && invoice.driver_last_name
                            ? `${invoice.driver_first_name} ${invoice.driver_last_name}`
                            : '—'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 text-[#374151]">
                          {invoice.route || '— → —'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3">
                          <span className="inline-flex rounded-full bg-[#f3f4f6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#374151]">
                            {status}
                          </span>
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 font-medium text-[#111827]">
                          ${rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 text-[#374151]">
                          {extras > 0
                            ? `$${extras.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 font-bold text-[#111827]">
                          ${invoiceTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 text-[#374151]">
                          {invoice.date_factored ? new Date(invoice.date_factored).toLocaleDateString() : '—'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3 text-[#374151]">
                          {invoice.invoice_sent_date ? new Date(invoice.invoice_sent_date).toLocaleDateString() : 'Not sent'}
                        </td>
                        <td className="border-b border-[#e5e7eb] px-4 py-3">
                          <span
                            className={[
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                              paymentStatus === 'PAID'
                                ? 'bg-green-100 text-green-700'
                                : paymentStatus === 'UNPAID'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700',
                            ].join(' ')}
                          >
                            {paymentStatus === 'PAID' ? 'Paid' : paymentStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-[#374151]">
              <span>Rows per page</span>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => {
                    const nextLimit = Number(e.target.value);
                    setLimit(nextLimit);
                    setPage(1);
                  }}
                  className="appearance-none rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 pr-8 text-sm text-[#374151] outline-none focus:border-[#9ca3af]"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-[#374151]">
              <span>
                {total === 0 ? '0' : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)}`} of {total}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm text-[#374151] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-[#d1d5db] bg-white px-3 py-1.5 text-sm text-[#374151] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 sm:items-center sm:px-4 sm:py-6">
          <div className="flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-[18px] border border-[#d9dde4] bg-[#f5f5f5] shadow-[0_28px_60px_rgba(15,23,42,0.18)] sm:max-w-[1200px] sm:rounded-[18px]">
            <div className="flex shrink-0 items-center justify-between border-b border-[#dfe3ea] px-5 py-4 sm:px-8 sm:py-5">
              <div className="flex items-center gap-4">
                <h2 className="text-[24px] font-extrabold tracking-[-0.03em] text-[#1f2937] sm:text-[40px]">
                  Invoice {draft.invoiceNumber || 'Draft'}
                </h2>
                <span className="inline-flex rounded-full bg-[#e5e7eb] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#475569]">
                  {draft.status}
                </span>
              </div>

              <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="rounded-full p-2 text-[#111827] hover:bg-white/60">
                <X size={22} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2563eb]">
                      <FileText size={18} />
                    </div>
                    <div className="text-[15px] font-medium text-[#374151]">Broker</div>
                  </div>

                  {!selectedInvoiceId && (
                    <div className="space-y-2">
                      <label className="block text-[13px] font-medium text-slate-600">Linked Load</label>
                      <select
                        value={draft.loadId}
                        onChange={(e) => selectLoad(e.target.value)}
                        className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                      >
                        <option value="">Select a load</option>
                        {loads.map((load: any) => <option key={load.id} value={load.id}>{load.load_number}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Transportation Company</label>
                    <input
                      value={draft.companyName || company?.name || ''}
                      readOnly
                      className="w-full rounded-xl border border-[#d1d5db] bg-slate-50 px-3 py-3 text-lg font-semibold text-[#111827] outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Broker Name</label>
                    <input
                      value={draft.brokerName}
                      readOnly
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-2xl font-semibold text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">MC#</label>
                    <input
                      value={draft.brokerMc}
                      readOnly
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2f5] text-[#64748b]">
                      <Truck size={18} />
                    </div>
                    <div>
                      <div className="text-[15px] font-medium text-[#64748b]">Driver</div>
                      <div className="mt-1 text-lg font-semibold text-[#111827]">{draft.driverName || 'Unassigned'}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Commodity</label>
                    <input
                      value={draft.commodity}
                      readOnly
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ecfeff] text-[#0f766e]">
                      <MapPin size={18} />
                    </div>
                    <div className="text-[15px] font-medium text-[#374151]">Pickup</div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Pickup Location</label>
                    <input
                      value={draft.pickupLocation}
                      readOnly
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff7ed] text-[#ea580c]">
                      <Truck size={18} />
                    </div>
                    <div className="text-[15px] font-medium text-[#374151]">Delivery</div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Delivery Location</label>
                    <input
                      value={draft.deliveryLocation}
                      readOnly
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-[#dfe3ea] pt-6">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Line Haul Rate</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.rate}
                      onChange={(e) => updateDraft('rate', e.target.value)}
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-semibold text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Miles</label>
                    <input
                      type="number"
                      min="0"
                      value={draft.miles}
                      onChange={(e) => updateDraft('miles', e.target.value)}
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-semibold text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Date Factored</label>
                    <input
                      type="date"
                      value={draft.dateFactored}
                      onChange={(e) => updateDraft('dateFactored', e.target.value)}
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-semibold text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-slate-600">Invoice Total</label>
                    <div className="flex h-[52px] items-center rounded-xl border border-[#3b82f6] bg-white px-3 py-3 text-lg font-bold text-[#2563eb]">
                      {currency(invoiceTotal)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-slate-600">Invoice Number</label>
                  <input
                    value={draft.invoiceNumber}
                    onChange={(e) => updateDraft('invoiceNumber', e.target.value)}
                    className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-slate-600">Load Number</label>
                  <input
                    value={draft.loadNumber}
                    readOnly
                    className="w-full rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-lg font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-slate-600">Invoice Sent Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={draft.invoiceSentDate}
                      onChange={(e) => updateDraft('invoiceSentDate', e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-base font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                    <button
                      type="button"
                      onClick={handleMarkSent}
                      disabled={!selectedInvoiceId || isStatusUpdating || draft.status !== 'PENDING'}
                      title={!selectedInvoiceId ? 'Save the invoice first' : undefined}
                      className="shrink-0 rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm font-semibold text-[#111827] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {markSentMutation.isPending ? 'Sending...' : 'Mark Sent'}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-slate-600">Payment Received Date</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={draft.paymentReceivedDate}
                      onChange={(e) => updateDraft('paymentReceivedDate', e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-[#d1d5db] bg-white px-3 py-3 text-base font-medium text-[#111827] outline-none focus:border-[#3b82f6]"
                    />
                    <button
                      type="button"
                      onClick={handleMarkPaid}
                      disabled={!selectedInvoiceId || isStatusUpdating || draft.status !== 'SENT'}
                      title={!selectedInvoiceId ? 'Save the invoice first' : undefined}
                      className="shrink-0 rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm font-semibold text-[#111827] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {markPaidMutation.isPending ? 'Saving...' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between">
                <h3 className="text-[28px] font-bold text-[#111827]">Accessorial Charges</h3>
                <button
                  type="button"
                  onClick={addAccessoryCharge}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-base font-semibold text-[#111827] hover:bg-[#f8fafc]"
                >
                  <Plus size={18} /> Add Charge
                </button>
              </div>

              {draft.accessorials.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-[#d1d5db] bg-white p-5 text-center text-lg text-[#6b7280]">
                  No accessorial charges. Click "Add Charge" to add detention, layover, lumper fees, etc.
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  {draft.accessorials.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-3 rounded-xl border border-[#d1d5db] bg-white p-3 sm:grid-cols-[1.2fr_1.5fr_1fr_auto]">
                      <select
                        value={item.label}
                        onChange={(e) => updateAccessory(item.id, 'label', e.target.value)}
                        className="rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#3b82f6]"
                      >
                        <option>Detention</option>
                        <option>Layover</option>
                        <option>Lumper Fee</option>
                        <option>Tarp</option>
                        <option>Other</option>
                      </select>
                      <input
                        value={item.description}
                        placeholder="Optional note"
                        onChange={(e) => updateAccessory(item.id, 'description', e.target.value)}
                        className="rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#3b82f6]"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateAccessory(item.id, 'amount', e.target.value)}
                        className="rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#3b82f6]"
                      />
                      <button type="button" onClick={() => removeAccessory(item.id)} className="rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#374151] hover:bg-[#f8fafc]">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex justify-end text-base font-semibold text-[#475569]">
                Accessorial Total: <span className="ml-2 text-[#111827]">{currency(draft.accessorials.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</span>
              </div>

              <div className="sticky bottom-0 z-10 -mx-5 mt-10 flex flex-wrap items-center justify-end gap-3 border-t border-[#dfe3ea] bg-[#f5f5f5]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d1d5db] bg-white px-6 py-4 text-lg font-semibold text-[#111827] hover:bg-[#f8fafc]"
                >
                  <Download size={18} /> Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="rounded-xl border border-[#d1d5db] bg-white px-6 py-4 text-lg font-semibold text-[#111827] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveInvoice}
                  disabled={isSaving || !draft.loadId}
                  className="rounded-xl bg-[#2563eb] px-6 py-4 text-lg font-bold text-white shadow-sm hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
