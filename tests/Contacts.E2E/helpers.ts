import { APIRequestContext, Locator } from '@playwright/test';

export const API_URL = 'http://localhost:5197';

export interface ContactFormValues {
  firstName: string;
  surname: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  iban: string;
}

export async function resetDatabase(request: APIRequestContext): Promise<void> {
  const response = await request.delete(`${API_URL}/api/contacts`);
  if (!response.ok()) {
    throw new Error(`Failed to reset the e2e database: ${response.status()} ${await response.text()}`);
  }
}

export async function fillContactForm(dialog: Locator, values: Partial<ContactFormValues>): Promise<void> {
  if (values.firstName !== undefined) {
    await dialog.getByLabel('First name').fill(values.firstName);
  }
  if (values.surname !== undefined) {
    await dialog.getByLabel('Surname', { exact: true }).fill(values.surname);
  }
  if (values.dateOfBirth !== undefined) {
    await dialog.getByLabel('Date of birth').fill(values.dateOfBirth);
  }
  if (values.address !== undefined) {
    await dialog.getByLabel('Address').fill(values.address);
  }
  if (values.phoneNumber !== undefined) {
    await dialog.getByLabel('Phone number').fill(values.phoneNumber);
  }
  if (values.iban !== undefined) {
    await dialog.getByLabel('IBAN').fill(values.iban);
  }
}
