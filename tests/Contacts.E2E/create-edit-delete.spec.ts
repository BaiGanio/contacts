import { expect, test } from '@playwright/test';
import { fillContactForm, resetDatabase } from './helpers';

test.beforeEach(async ({ request }) => {
  await resetDatabase(request);
});

test('create, edit, and delete a persisted contact', async ({ page }) => {
  await page.goto('/');
  const searchBox = page.getByPlaceholder('Search by first name or surname');

  await test.step('create a contact', async () => {
    await page.getByRole('button', { name: 'Add contact', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await fillContactForm(dialog, {
      firstName: 'Ada',
      surname: 'Lovelace',
      dateOfBirth: '1975-06-15',
      address: '12 Mill Street, London',
      phoneNumber: '+441234567890',
      iban: 'GB29NWBK60161331926819',
    });
    await dialog.getByRole('button', { name: 'Add contact', exact: true }).click();
    await expect(dialog).toBeHidden();

    await searchBox.fill('Lovelace');
    const row = page.getByRole('row', { name: /Ada Lovelace/ });
    await expect(row).toBeVisible();
    await expect(row).toContainText('15 Jun 1975');
    await expect(row).toContainText('12 Mill Street, London');
    await expect(row).toContainText('+441234567890');
    await expect(row).toContainText('GB29NWBK60161331926819');

    await page.reload();
    await searchBox.fill('Lovelace');
    await expect(page.getByRole('row', { name: /Ada Lovelace/ })).toBeVisible();
  });

  await test.step('edit the contact', async () => {
    const row = page.getByRole('row', { name: /Ada Lovelace/ });
    await row.getByRole('button', { name: 'Edit Ada Lovelace' }).click();
    const dialog = page.getByRole('dialog');
    await fillContactForm(dialog, {
      surname: 'Lovelace-Byron',
      address: '5 Regent Street, Manchester',
      phoneNumber: '+441234500000',
    });
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await searchBox.fill('Lovelace');
    const updatedRow = page.getByRole('row', { name: /Ada Lovelace-Byron/ });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText('5 Regent Street, Manchester');
    await expect(updatedRow).toContainText('+441234500000');
  });

  await test.step('delete the contact', async () => {
    const row = page.getByRole('row', { name: /Ada Lovelace-Byron/ });
    await row.getByRole('button', { name: 'Delete Ada Lovelace-Byron' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await searchBox.fill('Lovelace');
    await expect(page.getByText('No contacts match "Lovelace".')).toBeVisible();
  });
});
