import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { ContactsActions } from './contacts.actions';
import { selectListQuery } from './contacts.selectors';
import { ContactsService } from './contacts.service';

const LOAD_ERROR_MESSAGE = 'Could not load contacts. Check that the API is running, then try again.';

function isUnauthorized(error: unknown): boolean {
  return (error as { status?: number })?.status === 401;
}

@Injectable()
export class ContactsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly contactsService = inject(ContactsService);

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
}
