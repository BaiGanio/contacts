import { createReducer, on } from '@ngrx/store';
import { ContactsActions } from './contacts.actions';
import { ContactsState, initialContactsState } from './contacts.state';

export const contactsFeatureKey = 'contacts';

export const contactsReducer = createReducer(
  initialContactsState,
  on(ContactsActions.loadContacts, (state): ContactsState => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(ContactsActions.setPage, (state, { pageIndex, pageSize }): ContactsState => ({
    ...state,
    pageIndex,
    pageSize,
  })),
  on(ContactsActions.setSearch, (state, { search }): ContactsState => ({
    ...state,
    search,
    pageIndex: 0,
  })),
  on(ContactsActions.loadContactsSuccess, (state, { contacts, totalCount }): ContactsState => ({
    ...state,
    contacts,
    totalCount,
    loading: false,
    error: null,
    unauthorized: false,
  })),
  on(ContactsActions.loadContactsFailure, (state, { message, unauthorized }): ContactsState => ({
    ...state,
    loading: false,
    error: message,
    unauthorized,
  })),
);
