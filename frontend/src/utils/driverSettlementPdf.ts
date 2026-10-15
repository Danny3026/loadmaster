import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const currency = (value: any) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
}).format(Number(value || 0));

const date = (value?: string) => value
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '—';

export async function downloadDriverSettlementPdf(settlement: any, loads: any[]) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.067, 0.094, 0.153);
  const muted = rgb(0.31, 0.35, 0.41);
  const blue = rgb(0.12, 0.29, 0.64);
  const light = rgb(0.95, 0.96, 0.98);
  let y = 792;
  const draw = (text: string, x: number, yPosition: number, size = 10, font = regular, color = ink) => {
    page.drawText(String(text || '—'), { x, y: yPosition, size, font, color, maxWidth: 250 });
  };
  const section = (title: string) => {
    page.drawRectangle({ x: 36, y: y - 8, width: 523, height: 22, color: light });
    draw(title, 44, y, 11, bold, blue);
    y -= 34;
  };
  const pair = (leftLabel: string, leftValue: string, rightLabel: string, rightValue: string) => {
    draw(leftLabel, 44, y, 9, bold, muted);
    draw(leftValue, 44, y - 15);
    draw(rightLabel, 310, y, 9, bold, muted);
    draw(rightValue, 310, y - 15);
    y -= 40;
  };

  draw(settlement.company_name || 'Driver Settlement', 36, y, 22, bold, blue);
  draw(`Driver Settlement | ${String(settlement.status || 'DRAFT').toUpperCase()}`, 36, y - 28, 14, bold);
  draw(`Settlement ID: ${settlement.id}`, 36, y - 50, 9, regular, muted);
  y -= 86;

  section('Driver and period');
  pair('Driver', settlement.driver_name, 'Loads', String(loads.length));
  draw('Settlement period', 44, y, 9, bold, muted);
  draw(`${date(settlement.period_start)} – ${date(settlement.period_end)}`, 44, y - 15);
  y -= 40;

  section('Included loads');
  loads.forEach((load: any) => {
    draw(load.load_number || '—', 44, y, 9);
    draw(date(load.updated_at || load.created_at), 220, y, 9);
    y -= 18;
  });
  y -= 24;

  section('Financial summary');
  pair('Base earnings', currency(settlement.base_driver_pay ?? settlement.driver_pay), 'Gross earnings', currency(settlement.gross_amount));
  const recurringDeductions = Array.isArray(settlement.recurring_deductions_snapshot) ? settlement.recurring_deductions_snapshot : [];
  const recurringAmount = recurringDeductions.reduce((total: number, item: any) => total + Number(item.amount || 0), 0);
  pair('Bonuses and other earnings', currency(settlement.earnings_adjustments ?? settlement.bonus_amount), 'One-time deductions', `-${currency(Math.max(0, Number(settlement.deductions_amount || 0) - recurringAmount))}`);
  draw('Recurring deductions', 44, y, 9, bold, muted);
  draw(`-${currency(recurringAmount)}`, 310, y, 9, regular, ink);
  y -= 24;
  recurringDeductions.forEach((item: any) => {
    draw(item.description || 'Recurring deduction', 44, y, 9, regular, muted);
    draw(`-${currency(item.amount)}`, 310, y, 9, regular, ink);
    y -= 18;
  });
  pair('Net settlement', currency(settlement.net_amount ?? settlement.driver_pay), 'Paid amount', settlement.amount_paid == null ? '—' : currency(settlement.amount_paid));

  section('Payment');
  pair('Status', String(settlement.status || 'DRAFT').toUpperCase(), 'Payment date', date(settlement.payment_date));
  draw('Generated from the persisted driver-owned settlement record.', 44, y, 8, regular, muted);

  const bytes = await pdf.save();
  const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `Driver-Settlement-${String(settlement.id).slice(0, 8)}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
