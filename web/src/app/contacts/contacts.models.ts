export interface Contact {
  id: string;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  iban: string;
}

export type NewContact = Omit<Contact, 'id'>;
export type ContactEdits = Omit<Contact, 'id'>;

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  importedCount: number;
  errors: ImportRowError[];
}

export interface FailedImportRow {
  rowHash: string;
  rowNumber: number;
  rawRow: string;
  errorMessage: string;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  attempts: number;
}

export interface FailedImportRows {
  items: FailedImportRow[];
  totalCount: number;
}

export interface ContactsPage {
  contacts: Contact[];
  totalCount: number;
}

export interface ContactsQuery {
  page: number;
  pageSize: number;
  search: string;
}
