import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Download, ChevronDown, Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../../api/invoices';
import { useCompany } from '../../hooks/useCompany';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';

const currency = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(value || 0);

const formatDateForDisplay = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
};

const formatPeriodLabel = (startDate: string, endDate: string) => {
  const start = startDate || '0000-00-00';
  const end = endDate || '0000-00-00';
  return `${start} → ${end}`;
};

const Years = [2024, 2025, 2026];
type TaxApiError = {
  error?: {
    message?: string;
    details?: { missing?: string[] };
  };
};

const toBase64 = (value: ArrayBuffer) => {
  const bytes = new Uint8Array(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const TaxesPage: React.FC = () => {
  const [taxYear, setTaxYear] = useState<number>(2025);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  const [include, setInclude] = useState<'PAID' | 'ALL'>('PAID');
  const { data: company, isLoading: companyLoading, error: companyError } = useCompany();
  const queryClient = useQueryClient();
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState<string | null>(null);

  useEffect(() => {
    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;
    setStartDate(yearStart);
    setEndDate(yearEnd);
  }, [taxYear]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['taxSummary', { startDate, endDate, include }],
    queryFn: () => invoicesApi.getTaxSummary({ startDate, endDate, include }),
  });
  const { data: preparationData } = useQuery({
    queryKey: ['taxPreparations', taxYear],
    queryFn: () => invoicesApi.getTaxPreparations(taxYear),
  });

  const rows = useMemo(() => data?.rows || [], [data]);
  const preparations = useMemo(
    () => (preparationData || []).filter((record: any) => !record.testOnly),
    [preparationData]
  );
  const summary = useMemo(() => data?.summary || { driverCount: 0, total: 0, startDate, endDate }, [data, startDate, endDate]);

  const handleExportCsv = () => {
    const header = ['Driver/Contractor Name', 'Contractor TIN/EIN', 'Mailing Address', 'City', 'State', 'ZIP', 'Tax Year', 'Start Date', 'End Date', 'Number of Paid Settlements', 'Total Paid Earnings'];
    const csvRows = rows.map((row: any) => [
      row.driverName || '',
      row.tin || '',
      row.mailingAddress || '',
      row.mailingCity || '',
      row.mailingState || '',
      row.mailingZip || '',
      String(taxYear),
      startDate,
      endDate,
      String(row.paidSettlementCount || 0),
      String((Number(row.totalPaid) || 0).toFixed(2)),
    ]);

    const csv = [header, ...csvRows]
      .map((line: Array<string | number>) => line.map((cell: string | number) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `taxes-${taxYear}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePdf = async (driver: any) => {
    setPdfError(null);
    setPdfSuccess(null);
    let preparation: any;
    try {
      preparation = await invoicesApi.validateTaxPreparation(driver.driverId, {
        taxYear,
        startDate,
        endDate,
      });
    } catch {
      setPdfError('Could not validate this 1099-NEC preparation. Please try again.');
      return;
    }
    if (!preparation?.ready) {
      setPdfError(`1099-NEC cannot be prepared yet. Missing: ${(preparation?.missing || []).join(', ')}.`);
      return;
    }

    const doc = new jsPDF();
    const recipient = preparation.driver;
    const payer = preparation.payer;
    const cleanName = String(recipient.driverName || 'Contractor')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    const payerCityStateZip = [[payer.city, payer.state].filter(Boolean).join(', '), payer.zipCode].filter(Boolean).join(' ');
    const recipientCityStateZip = [[recipient.mailingCity, recipient.mailingState].filter(Boolean).join(', '), recipient.mailingZip].filter(Boolean).join(' ');

    doc.setFontSize(18);
    doc.text('1099-NEC Preparation Summary', 14, 20);
    doc.setFontSize(10);
    doc.text('This document is an informational/preparation summary and does not by itself constitute filing with the IRS. No IRS submission has been performed.', 14, 32, { maxWidth: 180 });

    doc.setFontSize(11);
    let y = 45;
    doc.text(`Payer/Company: ${payer.name}`, 14, y); y += 9;
    doc.text(`Payer EIN/TIN: ${payer.tin}`, 14, y); y += 9;
    doc.text(`Payer address: ${payer.addressLine1}`, 14, y); y += 9;
    doc.text(`Payer city, state ZIP: ${payerCityStateZip}`, 14, y, { maxWidth: 180 }); y += 14;
    doc.text(`Contractor/Driver: ${recipient.driverName}`, 14, y); y += 9;
    doc.text(`Contractor TIN: ${recipient.tin}`, 14, y); y += 9;
    doc.text(`Mailing address: ${recipient.mailingAddress}`, 14, y); y += 9;
    doc.text(`City, State ZIP: ${recipientCityStateZip}`, 14, y, { maxWidth: 180 }); y += 14;
    doc.text(`Tax year: ${preparation.taxYear}`, 14, y); y += 9;
    doc.text(`Tax period: ${preparation.startDate} to ${preparation.endDate}`, 14, y); y += 9;
    doc.text(`Qualifying paid earnings: ${currency(Number(recipient.totalPaid || 0))}`, 14, y); y += 9;
    doc.text(`Paid settlements included: ${recipient.paidSettlementCount || 0}`, 14, y);

    let pdfBase64: string;
    try {
      pdfBase64 = toBase64(doc.output('arraybuffer'));
    } catch {
      setPdfError('Could not generate the preparation PDF. No preparation record was saved.');
      return;
    }

    let savedPreparation: any;
    try {
      savedPreparation = await invoicesApi.createTaxPreparation({
        driverId: preparation.driver.driverId,
        taxYear: preparation.taxYear,
        startDate: preparation.startDate,
        endDate: preparation.endDate,
        expectedSnapshot: {
          testOnly: false,
          taxYear: preparation.taxYear,
          startDate: preparation.startDate,
          endDate: preparation.endDate,
          payer: preparation.payer,
          contractor: preparation.driver,
          qualifyingPaidEarnings: Number(preparation.driver.totalPaid),
          paidSettlementCount: Number(preparation.driver.paidSettlementCount),
        },
        pdfBase64,
      });
    } catch (error) {
      const apiError = error as AxiosError<TaxApiError>;
      const missing = apiError.response?.data?.error?.details?.missing;
      setPdfError(missing?.length
        ? `1099-NEC cannot be prepared yet. Missing: ${missing.join(', ')}. The PDF was not downloaded.`
        : apiError.response?.data?.error?.message || 'Could not save the validated preparation record. The PDF was not downloaded.');
      return;
    }

    doc.save(`1099-NEC-${cleanName || 'contractor'}-${preparation.taxYear}-v${savedPreparation.version}.pdf`);
    setPdfSuccess(`Preparation version ${savedPreparation.version} saved for ${preparation.taxYear}. No IRS submission was performed.`);
    await queryClient.invalidateQueries({ queryKey: ['taxPreparations', taxYear] });
  };

  const totalLabel = `${summary.driverCount} drivers • period ${summary.startDate} → ${summary.endDate} • Total: ${currency(Number(summary.total || 0))}`;

  const hasData = rows.length > 0 && !error;

  return (
    <div className="max-w-[720px] mx-auto pb-12">
      <div className="mb-6 flex items-center gap-3">
        <FileSpreadsheet className="h-7 w-7 text-slate-700" />
        <h1 className="text-[42px] leading-none font-bold tracking-[-0.04em] text-slate-900">Taxes</h1>
      </div>

      <p className="mb-5 text-[20px] leading-[1.3] text-slate-600">Total contractor earnings per driver and export 1099-NEC forms.</p>

      <button
        type="button"
        onClick={handleExportCsv}
        className="mb-6 flex w-full max-w-[260px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-[17px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-200"
      >
        <Download className="h-5 w-5" />
        Export CSV
      </button>

      <section aria-label="Payer tax information" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Payer Tax Information</h2>
            <p className="mt-1 text-sm text-slate-600">{company?.name || 'Legal business name not configured'}</p>
            <p className="mt-1 text-sm text-slate-600">
              {[company?.addressLine1, company?.city, company?.state, company?.zipCode].filter(Boolean).join(', ') || 'Business mailing address not configured'}
            </p>
            <p className={`mt-2 text-sm font-semibold ${company?.tinConfigured ? 'text-emerald-700' : 'text-amber-700'}`}>
              {companyLoading
                ? 'Loading payer tax information…'
                : companyError
                  ? 'Unable to verify payer tax information.'
                  : company?.tinConfigured
                    ? `Payer EIN/TIN on file: ${company.tinMasked}`
                    : 'Payer EIN/TIN missing'}
            </p>
          </div>
          <Link to="/settings" className="shrink-0 text-sm font-semibold text-blue-700 underline hover:text-blue-800">
            Manage in Company Settings
          </Link>
        </div>
      </section>
      {pdfError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pdfError}</div>}
      {pdfSuccess && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{pdfSuccess}</div>}

      {preparations.length > 0 && (
        <section aria-label="Preparation history" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Preparation history — {taxYear}</h2>
          <p className="mt-1 text-sm text-slate-600">Each generation creates a new version. Previously prepared snapshots are retained.</p>
          <div className="mt-3 space-y-3">
            {preparations.map((record: any) => (
              <div key={record.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {record.driverName} · Version {record.version}
                      {record.testOnly && <span className="ml-2 text-xs font-bold text-red-700">TEST DATA</span>}
                    </p>
                    <p className="text-sm text-slate-600">
                      {record.mailingAddress}, {[record.mailingCity, record.mailingState].filter(Boolean).join(', ')} {record.mailingZip}
                    </p>
                    <p className="text-sm text-slate-600">
                      {record.paidSettlementCount} settlements · {currency(Number(record.qualifyingPaidEarnings || 0))} · {record.createdAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const pdf = await invoicesApi.downloadTaxPreparation(record.id);
                        const url = URL.createObjectURL(pdf);
                        const anchor = document.createElement('a');
                        anchor.href = url;
                        anchor.download = `1099-NEC-${record.testOnly ? 'TEST-' : ''}${String(record.driverName).replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-')}-${record.taxYear}-v${record.version}.pdf`;
                        anchor.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        setPdfError('Could not download this saved preparation document.');
                      }
                    }}
                    className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Download saved version
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-100/40 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4 md:gap-5">
          <label className="block text-[19px] font-medium text-slate-700">
            <span className="mb-2 block">Tax year</span>
            <div className="relative">
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(Number(e.target.value))}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 pr-10 text-[17px] text-slate-700 outline-none focus:border-blue-500"
              >
                {Years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
          </label>

          <label className="block text-[19px] font-medium text-slate-700">
            <span className="mb-2 block">Start date</span>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 pr-10 text-[17px] text-slate-700 outline-none focus:border-blue-500"
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 md:gap-5">
          <label className="block text-[19px] font-medium text-slate-700">
            <span className="mb-2 block">End date</span>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 pr-10 text-[17px] text-slate-700 outline-none focus:border-blue-500"
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
          </label>

          <label className="block text-[19px] font-medium text-slate-700">
            <span className="mb-2 block">Include</span>
            <div className="relative">
              <select
                value={include}
                onChange={(e) => setInclude(e.target.value as 'PAID' | 'ALL')}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 pr-10 text-[17px] text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="PAID">Paid settlements</option>
                <option value="ALL">All settlements</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            </div>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[17px] font-medium text-slate-700">
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tax data…
            </div>
          ) : error ? (
            <span className="text-red-600">Unable to load tax data.</span>
          ) : (
            totalLabel
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-[17px] text-red-700">
          Unable to load tax data. Please try again later.
        </div>
      ) : hasData ? (
        <div className="mt-6 space-y-3">
          {rows.map((row: any) => (
            <div key={row.driverId} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-4 text-[17px]">
                  <span className="min-w-[120px] font-medium text-slate-800">
                    {row.driverName || 'Unknown Driver'}
                    {(row.mailingAddress || row.mailingCity || row.mailingState || row.mailingZip) && (
                      <span className="mt-1 block text-[13px] font-normal text-slate-500">
                        {[row.mailingAddress, [row.mailingCity, row.mailingState].filter(Boolean).join(', '), row.mailingZip].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </span>
                  <span className="min-w-[120px] text-slate-500">{row.tin || '—'}</span>
                  <span className="min-w-[70px] text-slate-600">{row.paidSettlementCount || 0}</span>
                  <span className="font-semibold text-slate-800">{currency(Number(row.totalPaid || 0))}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleGeneratePdf(row)}
                  className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-[15px] font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  {preparations.some((record: any) => record.driverId === row.driverId && record.taxYear === taxYear)
                    ? 'Generate new version'
                    : 'Generate 1099-NEC'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-[30px] leading-tight text-slate-500">
          <div>No settlements found in this date range.</div>
        </div>
      )}

      <p className="mt-8 max-w-[700px] text-[18px] leading-[1.5] text-slate-600">
        Generated 1099-NEC PDFs are informational/preparation summaries. No IRS submission is performed by this workflow.
      </p>
    </div>
  );
};

export default TaxesPage;
