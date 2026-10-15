import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { goldenRateConfirmationPath } from './golden-fixture-path.mjs';

const email = 'e2e.admin@loadmaster.test';
const password = 'Password123!';
const loadNumber = `E2E-PLAYWRIGHT-${Date.now()}`;
const fixture = goldenRateConfirmationPath;

async function token(page: Page) {
  return page.evaluate(() => localStorage.getItem('loadmaster_token'));
}

async function getJson(page: Page, path: string) {
  const auth = await token(page);
  const response = await page.request.get(`http://localhost:3001${path}`, {
    headers: { Authorization: `Bearer ${auth}` },
  });
  expect(response.ok(), `${path} should be reachable`).toBeTruthy();
  return response.json();
}

async function updateStatus(page: Page, id: string, status: string) {
  await page.goto(`/loads/${id}`);
  await page.locator('select[name="status"]').selectOption(status);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page).toHaveURL(/\/loads$/);
  const load = await getJson(page, `/api/loads/${id}`);
  expect(load.data.status).toBe(status);
}

async function captureStage(page: Page, name: string) {
  await page.screenshot({ path: `test-results/audit-${name}.png`, fullPage: true });
}

test('complete labelled transportation workflow through the real UI', async ({ page }) => {
  test.setTimeout(120000);
  page.on('requestfailed', (failedRequest) => {
    console.log(`Browser request failed: ${failedRequest.url()} ${failedRequest.failure()?.errorText || ''}`);
  });
  page.on('response', (response) => {
    if (response.url().includes('/api/auth/login')) {
      void response.text().then((body) => console.log(`Browser login response: ${response.status()} ${body.slice(0, 80)}`));
    }
  });

  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('E2E TEST - DO NOT USE IN PRODUCTION').first()).toBeVisible();
  await captureStage(page, '01-login-dashboard');

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Company Settings' })).toBeVisible();
  const settingsTin = page.getByRole('textbox', { name: 'Taxpayer TIN' });
  await settingsTin.fill(`E2E-${Date.now()}`);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(settingsTin).toHaveValue(/E2E-/);
  await page.reload();
  await expect(settingsTin).toHaveValue(/E2E-/);
  await captureStage(page, '02-settings');

  const driverFirstName = `E2E-${Date.now()}`;
  const driverEmail = `${driverFirstName.toLowerCase()}@e2e.test`;
  await page.goto('/team');
  await page.getByRole('button', { name: 'Add Team Member' }).click();
  const teamForm = page.locator('form').last();
  await teamForm.getByPlaceholder('First Name').fill(driverFirstName);
  await teamForm.getByPlaceholder('Last Name').fill('Test Driver');
  await teamForm.getByPlaceholder('email@example.com').fill(driverEmail);
  await teamForm.getByPlaceholder('Min 6 characters').fill('Password123!');
  await teamForm.locator('select[name="role"]').selectOption('DRIVER');
  await teamForm.locator('input[name="payPercentage"]').fill('25');
  await teamForm.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByText(`${driverFirstName} Test Driver`)).toBeVisible();
  const teamUsers = await getJson(page, '/api/users');
  const portalUser = teamUsers.data.find((user: any) => user.email === driverEmail);
  expect(portalUser).toBeTruthy();
  expect(Number(portalUser.payPercentage ?? portalUser.pay_percentage)).toBe(25);

  await page.goto('/drivers');
  await page.locator('#add-driver-btn').click();
  const driverModal = page.locator('form').last();
  await driverModal.locator('input[placeholder="John"]').first().fill(driverFirstName);
  await driverModal.locator('input[placeholder="Doe"]').fill('Test Driver');
  await driverModal.locator('input[placeholder="CDL-12345"]').fill(`${driverFirstName}-CDL`);
  await driverModal.locator('input[placeholder="TX"]').fill('TX');
  await driverModal.locator('input[placeholder="(555) 123-4567"]').fill('(555) 555-2026');
  await driverModal.locator('input[placeholder="john.doe@example.com"]').fill(driverEmail);
  await driverModal.getByRole('button', { name: 'Add Driver', exact: true }).click();
  await expect(page.getByText(`${driverFirstName} Test Driver`)).toBeVisible();
  await page.goto('/team');
  await expect(page.getByRole('heading', { name: /Team/i })).toBeVisible();
  await captureStage(page, '03-team-drivers');

  await page.goto('/trucks');
  await page.getByRole('button', { name: /Add Truck/i }).click();
  const truckNumber = `E2E-${Date.now()}`;
  const truckForm = page.locator('form').last();
  await truckForm.locator('input[placeholder="TRK-001"]').fill(truckNumber);
  await truckForm.locator('input[placeholder="Volvo"]').fill('Freightliner');
  await truckForm.locator('input[placeholder="VNL 860"]').fill('Cascadia');
  await truckForm.locator('input[placeholder="2023"]').fill('2024');
  await truckForm.locator('input[placeholder="1FUJGFDF3N..."]').fill(`1E2E${Date.now()}`);
  await truckForm.getByRole('button', { name: 'Register Truck', exact: true }).click();
  await expect(page.getByText(truckNumber)).toBeVisible();
  await captureStage(page, '04-fleet');

  await page.goto('/loads/new');
  const extraction = page.waitForResponse((response) => response.url().includes('/api/loads/extract-pdf'));
  await page.locator('input[type="file"]').setInputFiles(fixture);
  expect((await extraction).status()).toBe(200);
  await expect(page.locator('input[name="loadNumber"]')).toHaveValue('E2E-PLAYWRIGHT-20260828');
  await expect(page.locator('input[name="brokerName"]')).toHaveValue('E2E TEST BROKER LLC');
  await expect(page.locator('input[name="brokerMC"]')).toHaveValue('E2E-MC-2026');
  await expect(page.locator('input[name="rate"]')).toHaveValue('2500');
  await expect(page.locator('input[name="miles"]')).toHaveValue('780');
  await captureStage(page, '05-rate-confirmation');

  await page.locator('input[name="loadNumber"]').fill(loadNumber);
  await page.getByRole('button', { name: 'Create Load' }).click();
  await expect(page).toHaveURL(/\/loads$/);
  await page.getByPlaceholder('Search loads...').fill(loadNumber);
  const row = page.getByRole('row', { name: new RegExp(loadNumber) });
  await expect(row).toContainText('E2E TEST BROKER LLC');
  await expect(row).toContainText('780.00');
  const created = await getJson(page, '/api/loads?search=' + encodeURIComponent(loadNumber));
  const load = created.data[0];
  const drivers = await getJson(page, '/api/drivers?limit=100&offset=0');
  const freshDriver = drivers.data.find((driver: any) => `${driver.first_name} ${driver.last_name}` === `${driverFirstName} Test Driver`);
  expect(freshDriver).toBeTruthy();
  expect(load.load_number).toBe(loadNumber);
  expect(load.broker_name).toBe('E2E TEST BROKER LLC');
  expect(Number(load.loaded_miles)).toBe(780);
  await captureStage(page, '06-load-board');

  await row.getByRole('button', { name: 'Dispatch', exact: true }).click();
  const dispatchDialog = page.getByRole('dialog');
  await dispatchDialog.locator('select#dispatch-driver').selectOption({ label: `${driverFirstName} Test Driver` });
  const dispatchResponse = page.waitForResponse((response) => response.url().includes('/api/dispatch/loads/') && response.request().method() === 'POST');
  await dispatchDialog.getByRole('button', { name: 'Dispatch', exact: true }).click();
  expect((await dispatchResponse).status()).toBe(200);
  await page.reload();
  await page.getByPlaceholder('Search loads...').fill(loadNumber);
  await expect(page.getByRole('row', { name: new RegExp(loadNumber) })).toContainText(`${driverFirstName} Test Driver`);
  const assigned = await getJson(page, `/api/loads/${load.id}`);
  expect(assigned.data.assignment.driver_id).toBe(freshDriver.id);
  await captureStage(page, '07-dispatch');

  await updateStatus(page, load.id, 'dispatched');
  await updateStatus(page, load.id, 'in_transit');
  await updateStatus(page, load.id, 'delivered');

  await page.goto(`/loads/${load.id}`);
  const podUpload = page.waitForResponse((response) => response.url().includes(`/api/loads/${load.id}/documents`) && response.request().method() === 'POST');
  await page.locator('input[type="file"]').nth(1).setInputFiles(resolve('../POD-2111033-E2E.pdf'));
  expect((await podUpload).status()).toBe(201);
  await expect(page.getByText('POD-2111033-E2E.pdf')).toBeVisible();
  const documents = await getJson(page, `/api/loads/${load.id}/documents`);
  expect(documents.data.some((document: any) => document.document_type === 'POD')).toBeTruthy();
  await captureStage(page, '08-pod');

  await page.goto('/billing');
  await page.getByRole('button', { name: 'Broker Invoice', exact: true }).click();
  const invoiceModal = page.getByText('Linked Load').locator('..').locator('..').locator('..').locator('..');
  await invoiceModal.locator('select').first().selectOption(load.id);
  const invoiceNumber = `${loadNumber}-INV`;
  const invoiceNumberInput = invoiceModal.locator('label').filter({ hasText: 'Invoice Number' }).locator('..').locator('input');
  await invoiceNumberInput.fill(invoiceNumber);
  await invoiceModal.getByRole('button', { name: 'Add Charge', exact: true }).click();
  const charge = invoiceModal.locator('input[type="number"]').last();
  await charge.fill('125');
  await invoiceModal.getByRole('button', { name: 'Save Invoice', exact: true }).click();
  await expect(page.getByRole('row', { name: new RegExp(invoiceNumber) })).toBeVisible();
  await page.getByRole('row', { name: new RegExp(invoiceNumber) }).click();
  await expect(page.getByText('$2,625.00', { exact: true }).last()).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(download.suggestedFilename()).toMatch(/E2E-PLAYWRIGHT-.*-INV\.pdf/);
  expect(downloadPath).toBeTruthy();
  expect((await readFile(downloadPath!)).subarray(0, 5).toString()).toBe('%PDF-');
  await captureStage(page, '09-invoice-pdf');
  await expect.poll(async () => page.locator('body').innerText()).toContain('Invoice');

  const markSentResponse = page.waitForResponse((response) => response.url().includes('/mark-sent'));
  await page.getByRole('button', { name: 'Mark Sent' }).click();
  expect((await markSentResponse).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Mark Paid' })).toBeVisible();
  const invoiceList = await getJson(page, `/api/invoices?search=${encodeURIComponent(invoiceNumber)}`);
  const invoice = invoiceList.data[0];
  expect(invoice.load_id).toBe(load.id);
  expect(invoice.driver_id).toBe(freshDriver.id);
  expect(invoice.broker_id).toBe(load.broker_id);
  const sent = await getJson(page, `/api/invoices/${invoice.id}`);
  expect(sent.data.status).toBe('SENT');
  expect(sent.data.invoice_sent_date).toBeTruthy();

  const markPaidResponse = page.waitForResponse((response) => response.url().includes('/mark-paid'));
  await page.getByRole('button', { name: 'Mark Paid' }).click();
  expect((await markPaidResponse).status()).toBe(200);
  await expect(page.getByText('PAID', { exact: true }).first()).toBeVisible();
  const paid = await getJson(page, `/api/invoices/${invoice.id}`);
  expect(paid.data.status).toBe('PAID');
  expect(paid.data.payment_received_date).toBeTruthy();
  await page.reload();
  await expect(page.getByText('PAID', { exact: true }).first()).toBeVisible();
  await captureStage(page, '10-paid-invoice');

  await page.goto('/settlements');
  await page.getByRole('button', { name: 'Generate Settlement' }).click();
  const settlementModal = page.locator('div.fixed.inset-0').last();
  await settlementModal.locator('select').selectOption(freshDriver.id);
  await expect(settlementModal.locator('select')).toHaveValue(freshDriver.id);
  const settlementDates = settlementModal.locator('input[type="date"]');
  await settlementDates.nth(0).fill('2026-01-01');
  await settlementDates.nth(1).fill('2027-01-01');
  await settlementModal.getByRole('button', { name: 'Find Delivered Loads' }).click();
  await expect(settlementModal.getByText(/\d+ Delivered Loads/)).toBeVisible();
  await settlementModal.getByRole('button', { name: 'Generate Settlement' }).click();
  await expect(page.getByText(`${driverFirstName} Test Driver`)).toBeVisible();
  const settlements = await getJson(page, '/api/settlements');
  expect(settlements.data.some((row: any) => row.driver_id === freshDriver.id && row.load_ids.includes(load.id))).toBeTruthy();
  const settlement = settlements.data.find((row: any) => row.driver_id === freshDriver.id && row.load_ids.includes(load.id));
  expect(Number(settlement.gross_amount)).toBe(2500);
  expect(Number(settlement.driver_pay)).toBeGreaterThan(0);
  await captureStage(page, '11-settlement');

  await page.goto('/dashboard');
  await expect(page.getByText('Revenue Distribution')).toBeVisible();
  await expect(page.getByText('Driver Performance')).toBeVisible();
  const dashboard = await getJson(page, '/api/dashboard');
  expect(Number(dashboard.data.totalMiles)).toBeGreaterThanOrEqual(780);
  expect(dashboard.data.driverPerformance.some((driver: any) => driver.name === `${driverFirstName} Test Driver`)).toBeTruthy();
  await captureStage(page, '12-dashboard');

  await page.goto('/taxes');
  await expect(page.getByRole('heading', { name: 'Taxes' })).toBeVisible();
  await page.locator('select').first().selectOption('2026');
  await expect(page.getByRole('textbox', { name: 'Payer TIN / EIN' })).toHaveValue(/E2E-/);
  await expect(page.getByText(`${driverFirstName} Test Driver`)).toBeVisible();
  await captureStage(page, '13-taxes');

  await page.goto('/loads');
  await page.getByPlaceholder('Search loads...').fill(loadNumber);
  await page.getByRole('button', { name: 'Delivered', exact: true }).click();
  await expect(page.getByRole('row', { name: new RegExp(loadNumber) })).toBeVisible();
  await page.getByRole('button', { name: 'Dry Van', exact: true }).first().click();
  await expect(page.getByRole('row', { name: new RegExp(loadNumber) })).toBeVisible();

  await page.goto(`/loads/${load.id}`);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Archive Load' }).click();
  await page.waitForTimeout(500);
  await page.goto('/archive');
  await expect(page.getByRole('row', { name: new RegExp(loadNumber) })).toBeVisible();
  await page.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByRole('row', { name: new RegExp(loadNumber) })).toHaveCount(0);
  await page.goto('/loads');
  await page.getByPlaceholder('Search loads...').fill(loadNumber);
  await expect(page.getByRole('row', { name: new RegExp(loadNumber) })).toBeVisible();
  const restored = await getJson(page, `/api/loads/${load.id}`);
  expect(restored.data.status).toBe('delivered');
  await captureStage(page, '14-archive-restore');

  for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await page.goto('/loads');
    await expect(page.getByRole('heading', { name: 'Load Board' })).toBeVisible();
    await page.goto('/billing');
    await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();
    await captureStage(page, `15-responsive-${viewport.width}`);
  }

  await page.goto('/settings');
  const persistedTin = await page.getByRole('textbox', { name: 'Taxpayer TIN' }).inputValue();
  await page.locator('button[aria-label="Logout"]').dispatchEvent('click');
  await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/settings');
  await expect(page.getByRole('textbox', { name: 'Taxpayer TIN' })).toHaveValue(persistedTin);
  await page.goto('/loads');
  await page.getByPlaceholder('Search loads...').fill(loadNumber);
  await expect(page.getByRole('row', { name: new RegExp(loadNumber) })).toBeVisible();
  await page.goto('/billing');
  await page.getByPlaceholder('Search invoices...').fill(invoiceNumber);
  await expect(page.getByRole('row', { name: new RegExp(invoiceNumber) })).toContainText('PAID');
  await captureStage(page, '16-relogin-persistence');

});
