import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { debounceTime } from 'rxjs';
import { AuthDialog } from '../auth/auth-dialog';
import { AuthService } from '../auth/auth.service';
import { Contact } from './contacts.models';
import { ContactFormDialog } from './contact-form-dialog/contact-form-dialog';
import { ContactImport } from './import/contact-import';
import { DeleteContactDialog } from './delete-contact-dialog';
import { ContactsActions } from './state/contacts.actions';
import {
  selectContacts,
  selectIsEmpty,
  selectLoadError,
  selectLoading,
  selectPageIndex,
  selectPageSize,
  selectSearch,
  selectTotalCount,
  selectUnauthorized,
} from './state/contacts.selectors';

@Component({
  selector: 'app-contacts-page',
  imports: [
    DatePipe,
    ContactImport,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './contacts-page.html',
  styleUrl: './contacts-page.scss',
})
export class ContactsPage {
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly store = inject(Store);

  protected readonly contacts = this.store.selectSignal(selectContacts);
  protected readonly totalCount = this.store.selectSignal(selectTotalCount);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly empty = this.store.selectSignal(selectIsEmpty);
  protected readonly displayedColumns = ['contact', 'dateOfBirth', 'address', 'phoneNumber', 'iban', 'actions'];

  protected readonly pageIndex = this.store.selectSignal(selectPageIndex);
  protected readonly pageSize = this.store.selectSignal(selectPageSize);
  protected readonly search = this.store.selectSignal(selectSearch);
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly authToken = this.authService.token;
  protected readonly unauthorized = this.store.selectSignal(selectUnauthorized);

  constructor() {
    this.store.dispatch(ContactsActions.loadContacts());
    this.searchControl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((value) => {
      this.store.dispatch(ContactsActions.setSearch({ search: value }));
    });
  }

  protected loadContacts(): void {
    this.store.dispatch(ContactsActions.loadContacts());
  }

  protected openAuthDialog(): void {
    this.dialog.open(AuthDialog, { width: '420px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((token) => {
        if (token) {
          this.authService.setToken(token);
          this.loadContacts();
        }
      });
  }

  protected logOut(): void {
    this.authService.clearToken();
    this.loadContacts();
  }

  protected onPage(event: PageEvent): void {
    this.store.dispatch(ContactsActions.setPage({ pageIndex: event.pageIndex, pageSize: event.pageSize }));
  }

  protected openCreateDialog(): void {
    this.dialog.open(ContactFormDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)', data: {} })
      .afterClosed()
      .subscribe((contact) => {
        if (contact) {
          this.notify(`Added ${contact.firstName} ${contact.surname}.`, 'add');
        }
      });
  }

  protected openEditDialog(contact: Contact): void {
    this.dialog.open(ContactFormDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)', data: { contact } })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.notify(`Saved changes for ${updated.firstName} ${updated.surname}.`, 'update');
        }
      });
  }

  protected openDeleteDialog(contact: Contact): void {
    this.dialog.open(DeleteContactDialog, { width: '420px', maxWidth: 'calc(100vw - 32px)', data: { contact } })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          this.notify(`Deleted ${contact.firstName} ${contact.surname}.`, 'delete');
        }
      });
  }

  private notify(message: string, kind: 'add' | 'update' | 'delete' | 'warn' = 'add'): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000, panelClass: `snackbar-${kind}` });
  }
}
