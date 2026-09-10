import { expect, test } from '@playwright/test';
import { fillContactForm, resetDatabase } from './helpers';

test.beforeEach(async ({ request }) => {
  await resetDatabase(request);
});

test('reject invalid input and let the user correct it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add contact', exact: true }).click();
  const dialog = page.getByRole('dialog');

  await test.step('reject an empty form', async () => {
    await dialog.getByRole('button', { name: 'Add contact', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Required').first()).toBeVisible();
    await expect(page.getByText('0 contacts')).toBeVisible();
  });

  await test.step('reject an invalid IBAN', async () => {
    await fillContactForm(dialog, {
      firstName: 'Grace',
      surname: 'Hopper',
      dateOfBirth: '1960-01-01',
      address: '1 Navy Yard, Arlington',
      phoneNumber: '+17035550100',
      iban: 'DE00370400440532013000',
    });
    await dialog.getByRole('button', { name: 'Add contact', exact: true }).click();
    await expect(dialog.getByText('The IBAN is invalid.')).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.getByText('0 contacts')).toBeVisible();
  });

  await test.step('correct the IBAN and resubmit', async () => {
    await fillContactForm(dialog, { iban: 'GB29NWBK60161331926819' });
    await dialog.getByRole('button', { name: 'Add contact', exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(page.getByText('1 contact', { exact: true })).toBeVisible();
    await expect(page.getByRole('row', { name: /Grace Hopper/ })).toBeVisible();
  });
});
