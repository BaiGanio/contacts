import { Contact } from '../contacts.models';

export const DEFAULT_PAGE_SIZE = 20;

export interface ContactsState {
  contacts: Contact[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  unauthorized: boolean;
  pageIndex: number;
  pageSize: number;
  search: string;
}

export const initialContactsState: ContactsState = {
  contacts: [],
  totalCount: 0,
  loading: true,
  error: null,
  unauthorized: false,
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  search: '',
};
