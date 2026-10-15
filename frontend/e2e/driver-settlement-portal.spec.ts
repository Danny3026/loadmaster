import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const email = 'daniel.portal@loadmaster.test';
const password = '123456';

async function getJson(page: Page, path: string) {
  const token = await page.evaluate(() => localStorage.getItem('loadmaster_token'));
  const response = await page.request.get(`http://localhost:3001${path}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function extractText(filePath: string) {
  const document = await getDocument({ data: new Uint8Array(await readFile(filePath)) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const pdfPage = await document.getPage(pageNumber);
    const content = await pdfPage.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(' '));
  }
  return pages.join('\n');
}

test('Daniely can view only her settlement in the driver portal', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/driver$/);

  const mine = await getJson(page, '/api/settlements/mine');
  expect(mine.data).toHaveLength(1);
  const settlement = mine.data[0];
  expect(settlement.driver_name).toBe('Daniely Gift');
  expect(settlement.status).toBe('PAID');
  expect(settlement.net_amount).toBe(1057.5);
  expect(settlement.amount_paid).toBe(1057.5);
  expect(settlement.adjustments).toEqual(expect.arrayContaining([
    expect.objectContaining({ category: 'EARNING', amount: '100.00' }),
    expect.objectContaining({ category: 'DEDUCTION', amount: '50.00' }),
  ]));

  await page.goto('/driver/settlements');
  await expect(page.getByText('My Settlements')).toBeVisible();
  await expect(page.getByText('$1,057.50')).toBeVisible();
  await expect(page.locator('span.rounded-full').filter({ hasText: /^PAID$/ })).toBeVisible();
  await expect(page.getByText('Paid Sep 7, 2026')).toBeVisible();

  await page.goto(`/driver/settlements/${settlement.id}`);
  await expect(page.getByRole('heading', { name: 'Daniely Gift' })).toBeVisible();
  await expect(page.getByText('$1,007.50')).toBeVisible();
  await expect(page.getByText('+$100.00')).toBeVisible();
  await expect(page.getByText('-$50.00')).toBeVisible();
  await expect(page.getByText('$1,057.50').last()).toBeVisible();
  await expect(page.getByText('Sep 7, 2026')).toBeVisible();
  await expect(page.getByText('#37813147')).toBeVisible();
  await expect(page.getByText('#130987096')).toBeVisible();
  await expect(page.getByText('#2111033')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  const filePath = resolve('test-results', 'daniely-driver-portal-settlement.pdf');
  await download.saveAs(filePath);
  expect(download.suggestedFilename()).toMatch(/^Driver-Settlement-/);
  const bytes = await readFile(filePath);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const pdfText = await extractText(filePath);
  expect(pdfText).toContain('Daniely Gift');
  expect(pdfText).toContain('PAID');
  expect(pdfText).toContain('$1,057.50');

  await page.reload();
  await expect(page.locator('span.rounded-full').filter({ hasText: /^PAID$/ })).toBeVisible();
  await expect(page.getByText('$1,057.50').last()).toBeVisible();

  const denied = await page.evaluate(async (id) => {
    const token = localStorage.getItem('loadmaster_token');
    const response = await fetch(`/api/settlements/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    return { status: response.status, body: await response.json() };
  }, '00000000-0000-0000-0000-000000000000');
  expect(denied.status).toBe(404);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/driver/settlements');
  await expect(page.getByText('My Settlements')).toBeVisible();
  await expect(page.getByText('$1,057.50')).toBeVisible();
  await page.goto(`/driver/settlements/${settlement.id}`);
  await expect(page.getByText('Financial breakdown')).toBeVisible();
  await expect(page.getByText('Payment date')).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/driver$/);
  await page.goto(`/driver/settlements/${settlement.id}`);
  await expect(page.locator('span.rounded-full').filter({ hasText: /^PAID$/ })).toBeVisible();
  await expect(page.getByText('Sep 7, 2026')).toBeVisible();
  await expect(page.getByText('$1,057.50').last()).toBeVisible();
});
