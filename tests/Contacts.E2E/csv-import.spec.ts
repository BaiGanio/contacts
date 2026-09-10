import path from 'node:path';
import { expect, test } from '@playwright/test';
import { resetDatabase } from './helpers';

const fixture5 = path.join(__dirname, '../../seed-data/contacts-01-initial-5.csv');
const fixture300 = path.join(__dirname, '../../seed-data/contacts-02-poc-300.csv');

test.beforeEach(async ({ request }) => {
  await resetDatabase(request);
});

test('import CSV fixtures and browse the saved results', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const fileInput = page.locator('input[type="file"]');
  const searchBox = page.getByPlaceholder('Search by first name or surname');

  await test.step('import the 5-row fixture', async () => {
    const [importResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/contacts/import')),
      fileInput.setInputFiles(fixture5),
    ]);
    expect(importResponse.ok()).toBeTruthy();

    await expect(page.getByText('Imported 5 contact(s).')).toBeVisible();
    await expect(page.getByText('5 contacts')).toBeVisible();

    await searchBox.fill('Fürst');
    const row = page.getByRole('row', { name: /Günter Fürst/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('14 Mar 1969');
    await expect(row).toContainText('Löwenplatz 12, 59615 Hamburg, DE');
    await expect(row).toContainText('DE59679883481367606524');
    await searchBox.fill('');
  });

  await test.step('import the 300-row fixture into a freshly reset database', async () => {
    await resetDatabase(page.request);
    await page.reload();

    const [importResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/contacts/import')),
      fileInput.setInputFiles(fixture300),
    ]);
    expect(importResponse.ok()).toBeTruthy();

    await expect(page.getByText('Imported 300 contact(s).')).toBeVisible();
    await expect(page.getByText('300 contacts')).toBeVisible();

    const firstPageFirstRow = await page.locator('table tbody tr').first().innerText();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.locator('table tbody tr').first()).not.toHaveText(firstPageFirstRow);

    await searchBox.fill('Löwe');
    const row = page.getByRole('row', { name: /Günter Löwe/ });
    await expect(row).toBeVisible();

    await page.reload();
    await searchBox.fill('Löwe');
    await expect(page.getByRole('row', { name: /Günter Löwe/ })).toBeVisible();
    await searchBox.fill('');
  });

  await test.step('reject re-importing the same 300-row file as duplicates', async () => {
    const [importResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/contacts/import')),
      fileInput.setInputFiles(fixture300),
    ]);
    expect(importResponse.ok()).toBeTruthy();

    await expect(page.getByText('Imported 0 contact(s). 300 row(s) failed to import.')).toBeVisible();
    await expect(page.getByText('300 contacts')).toBeVisible();

    await page.getByRole('button', { name: 'View failed rows' }).click();
    const failuresDialog = page.getByRole('dialog');
    await expect(failuresDialog.getByText('already exists').first()).toBeVisible();
  });
});
