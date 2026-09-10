import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, filter, map, mergeMap, of, switchMap, withLatestFrom } from 'rxjs';
import { isUnauthorized } from '../http-errors';
import { ContactsApiService } from '../contacts-api.service';
import { ContactsActions } from './contacts.actions';
import { selectListQuery, selectPageIndex, selectPageSize } from './contacts.selectors';

const LOAD_ERROR_MESSAGE = 'Could not load contacts. Check that the API is running, then try again.';

@Injectable()
export class ContactsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly contactsService = inject(ContactsApiService);

  loadContacts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ContactsActions.loadContacts, ContactsActions.setPage, ContactsActions.setSearch),
      withLatestFrom(this.store.select(selectListQuery)),
      switchMap(([, query]) =>
        this.contactsService.list(query).pipe(
          map((page) => ContactsActions.loadContactsSuccess({ contacts: page.contacts, totalCount: page.totalCount })),
          catchError((error) =>
            of(
              ContactsActions.loadContactsFailure({
                message: isUnauthorized(error) ? null : LOAD_ERROR_MESSAGE,
                unauthorized: isUnauthorized(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  createContact$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ContactsActions.createContact),
      mergeMap(({ requestId, contact }) =>
        this.contactsService.create(contact).pipe(
          map((created) => ContactsActions.createContactSuccess({ requestId, contact: created })),
          catchError((error) => of(ContactsActions.createContactFailure({ requestId, error }))),
        ),
      ),
    ),
  );

  updateContact$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ContactsActions.updateContact),
      mergeMap(({ requestId, id, edits }) =>
        this.contactsService.update(id, edits).pipe(
          map((updated) => ContactsActions.updateContactSuccess({ requestId, contact: updated })),
          catchError((error) => of(ContactsActions.updateContactFailure({ requestId, error }))),
        ),
      ),
    ),
  );

  deleteContact$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ContactsActions.deleteContact),
      mergeMap(({ requestId, id }) =>
        this.contactsService.delete(id).pipe(
          map(() => ContactsActions.deleteContactSuccess({ requestId, id })),
          catchError((error) => of(ContactsActions.deleteContactFailure({ requestId, id, error }))),
        ),
      ),
    ),
  );

  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ContactsActions.createContactSuccess,
        ContactsActions.updateContactSuccess,
        ContactsActions.deleteContactSuccess,
      ),
      map(() => ContactsActions.loadContacts()),
    ),
  );

  correctPageOverflow$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ContactsActions.loadContactsSuccess),
      withLatestFrom(this.store.select(selectPageIndex), this.store.select(selectPageSize)),
      filter(([{ contacts, totalCount }, pageIndex]) => contacts.length === 0 && totalCount > 0 && pageIndex > 0),
      map(([{ totalCount }, , pageSize]) =>
        ContactsActions.setPage({ pageIndex: Math.max(0, Math.ceil(totalCount / pageSize) - 1), pageSize }),
      ),
    ),
  );
}
