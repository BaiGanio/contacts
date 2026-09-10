import { createFeatureSelector, createSelector } from '@ngrx/store';
import { contactsFeatureKey } from './contacts.reducer';
import { ContactsState } from './contacts.state';
import { ContactsQuery } from '../contacts.models';

export const selectContactsState = createFeatureSelector<ContactsState>(contactsFeatureKey);

export const selectContacts = createSelector(selectContactsState, (state) => state.contacts);
export const selectTotalCount = createSelector(selectContactsState, (state) => state.totalCount);
export const selectLoading = createSelector(selectContactsState, (state) => state.loading);
export const selectLoadError = createSelector(selectContactsState, (state) => state.error);
export const selectUnauthorized = createSelector(selectContactsState, (state) => state.unauthorized);
export const selectPageIndex = createSelector(selectContactsState, (state) => state.pageIndex);
export const selectPageSize = createSelector(selectContactsState, (state) => state.pageSize);
export const selectSearch = createSelector(selectContactsState, (state) => state.search);

export const selectIsEmpty = createSelector(
  selectContactsState,
  (state) => !state.loading && !state.error && !state.unauthorized && state.contacts.length === 0,
);

export const selectListQuery = createSelector(
  selectContactsState,
  (state): ContactsQuery => ({ page: state.pageIndex + 1, pageSize: state.pageSize, search: state.search }),
);
