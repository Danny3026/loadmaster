import { PDFDocument, StandardFonts } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const output = resolve('e2e/fixtures/E2E-TEST-DATA-rate-confirmation.pdf');
const lines = [
  'E2E TEST DATA - DO NOT USE IN PRODUCTION',
  'Rate Confirmation',
  'Load #: E2E-PLAYWRIGHT-20260828',
  'Bill To: E2E TEST BROKER LLC',
  'MC# E2E-MC-2026',
  'Commodity:',
  'ELECTRONIC EQUIPMENT',
  'Case/Size: Full Truckload',
  'Equipment: DRY VAN',
  'Weight (lbs): 42000',
  'Miles: 780',
  'Rate: $2500.00 =',
  'NOTES TO CARRIER:',
  'E2E TEST DATA - DO NOT USE IN PRODUCTION',
  'Pick Ups',
  'E2E TEST SHIPPER',
  '100 TEST WAY',
  'DALLAS, TX 75201',
  '08/28/2026 (08:00)',
  '(555) 111-2222',
  'Deliveries',
  'E2E TEST RECEIVER',
  '200 TEST ROAD',
  'ATLANTA, GA 30301',
  '09/01/2026 (14:00)',
  '(555) 333-4444',
];

const pdf = await PDFDocument.create();
const page = pdf.addPage([612, 792]);
const font = await pdf.embedFont(StandardFonts.Helvetica);
let y = 750;
for (const line of lines) {
  page.drawText(line, { x: 48, y, size: 11, font });
  y -= 27;
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, await pdf.save());
console.log(output);
