import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const email = 'e2e.admin@loadmaster.test';
const password = 'Password123!';
const settlementId = '8312eb45-a920-4dcb-ae37-8027af93f677';

async function getJson(page: Page, path: string) {
  const token = await page.evaluate(() => localStorage.getItem('loadmaster_token'));
  const response = await page.request.get(`http://localhost:3001${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function extractText(filePath: string) {
  const document = await getDocument({ data: new Uint8Array(await readFile(filePath)) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(' '));
  }
  return pages.join('\n');
}

async function downloadSettlement(page: Page, filename: string) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  const filePath = resolve('test-results', filename);
  await download.saveAs(filePath);
  return { filePath, suggestedFilename: download.suggestedFilename() };
}

test('downloads Daniely Gift settlement PDF with persisted values', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const settlements = await getJson(page, '/api/settlements');
  const settlement = settlements.data.find((row: any) => row.id === settlementId);
  expect(settlement).toMatchObject({
    driver_name: 'Daniely Gift',
    status: 'PAID',
    net_amount: 1057.5,
    amount_paid: 1057.5,
  });
  expect(settlement.payment_date).toBeTruthy();
  expect(settlement.load_ids).toHaveLength(3);
  const includedLoads = await Promise.all(settlement.load_ids.map((loadId: string) => getJson(page, `/api/loads/${loadId}`)));

  await page.goto('/settlements');
  await expect(page.getByText('Daniely Gift')).toBeVisible();
  await expect(page.getByText('$1,057.50').first()).toBeVisible();
  await expect(page.getByText('Sep 7, 2026')).toBeVisible();
  await expect(page.getByText('+$100.00')).toBeVisible();
  await expect(page.getByText('-$50.00').first()).toBeVisible();

  const first = await downloadSettlement(page, 'daniely-settlement.pdf');
  expect(first.suggestedFilename).toMatch(/^Driver-Settlement-8312eb45\.pdf$/);
  const firstBytes = await readFile(first.filePath);
  expect(firstBytes.subarray(0, 5).toString()).toBe('%PDF-');
  const firstText = await extractText(first.filePath);
  expect(firstText).toContain('Danny Logistics LLC');
  expect(firstText).toContain('Daniely Gift');
  expect(firstText).toContain('25%');
  expect(firstText).toContain('PAID');
  expect(firstText).toContain('$1,007.50');
  expect(firstText).toContain('$100.00');
  expect(firstText).toContain('$1,107.50');
  expect(firstText).toContain('$1,057.50');
  expect(firstText).toContain('Sep 7, 2026');
  for (const load of includedLoads) {
    expect(firstText).toContain(load.data.load_number);
  }
  expect(firstText).toContain(settlement.load_ids[0]);

  await page.reload();
  await expect(page.getByText('PAID')).toBeVisible();
  const second = await downloadSettlement(page, 'daniely-settlement-refresh.pdf');
  const secondText = await extractText(second.filePath);
  expect(secondText).toBe(firstText);
});