import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { debounceTime } from 'rxjs';
import { AuthService } from './auth.service';
import { ContactsActions } from './contacts.actions';
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
} from './contacts.selectors';
import { Contact, ContactsService, NewContact } from './contacts.service';

function isUnauthorized(error: unknown): boolean {
  return (error as { status?: number })?.status === 401;
}

function readableSubmitError(error: unknown): string {
  if (isUnauthorized(error)) {
    return 'Not authenticated. Use the login icon in the top bar, then try again.';
  }
  if (error instanceof ProgressEvent || (error as { status?: number })?.status === 0) {
    return 'Could not reach the server. Check that the API is running, then try again.';
  }
  return 'Could not save this contact. Check the values and try again.';
}

const SERVER_FIELD_NAMES: Record<string, string> = {
  FirstName: 'firstName',
  Surname: 'surname',
  DateOfBirth: 'dateOfBirth',
  Address: 'address',
  PhoneNumber: 'phoneNumber',
  Iban: 'iban',
};

export interface ContactDialogData {
  contact?: Contact;
}

@Component({
  selector: 'app-contact-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ data.contact ? 'Edit contact' : 'Add a new contact' }}</h2>
    <mat-dialog-content>
      <p>Enter the details below. Every field is required.</p>
      @if (submitError()) {
        <p class="form-error">{{ submitError() }}</p>
      }
      <form id="contact-form" class="contact-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline">
          <mat-label>First name</mat-label>
          <input matInput formControlName="firstName" />
          <mat-error>{{ form.get('firstName')?.getError('server') ?? 'Required' }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Surname</mat-label>
          <input matInput formControlName="surname" />
          <mat-error>{{ form.get('surname')?.getError('server') ?? 'Required' }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Date of birth</mat-label>
          <input matInput type="date" formControlName="dateOfBirth" />
          <mat-error>{{ form.get('dateOfBirth')?.getError('server') ?? 'Required' }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Address</mat-label>
          <input matInput formControlName="address" />
          <mat-error>{{ form.get('address')?.getError('server') ?? 'Required' }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phone number</mat-label>
          <input matInput formControlName="phoneNumber" />
          <mat-error>{{ form.get('phoneNumber')?.getError('server') ?? 'Required' }}</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>IBAN</mat-label>
          <input matInput formControlName="iban" />
          <mat-error>{{ form.get('iban')?.getError('server') ?? 'Required' }}</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="submitting()">Cancel</button>
      <button mat-flat-button type="submit" form="contact-form" [disabled]="submitting()">
        {{ submitting() ? 'Saving...' : data.contact ? 'Save changes' : 'Add contact' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ContactDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContactDialog, Contact>);
  private readonly contactsService = inject(ContactsService);
  protected readonly data = inject<ContactDialogData>(MAT_DIALOG_DATA);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: [this.data.contact?.firstName ?? '', Validators.required],
    surname: [this.data.contact?.surname ?? '', Validators.required],
    dateOfBirth: [this.data.contact?.dateOfBirth ?? '', Validators.required],
    address: [this.data.contact?.address ?? '', Validators.required],
    phoneNumber: [this.data.contact?.phoneNumber ?? '', Validators.required],
    iban: [this.data.contact?.iban ?? '', Validators.required],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const edits = {
      ...value,
      firstName: value.firstName.trim(),
      surname: value.surname.trim(),
      address: value.address.trim(),
      phoneNumber: value.phoneNumber.trim(),
      iban: value.iban.replaceAll(' ', '').toUpperCase(),
    };

    this.submitting.set(true);
    this.submitError.set(null);
    const request = this.data.contact
      ? this.contactsService.update(this.data.contact.id, edits)
      : this.contactsService.create(edits as NewContact);

    request.subscribe({
      next: (contact) => {
        this.submitting.set(false);
        this.dialogRef.close(contact);
      },
      error: (error) => {
        this.submitting.set(false);
        if (!this.applyServerFieldErrors(error)) {
          this.submitError.set(readableSubmitError(error));
        }
      },
    });
  }

  private applyServerFieldErrors(error: unknown): boolean {
    const fieldErrors = (error as { error?: { errors?: Record<string, string[]> } })?.error?.errors;
    if (!fieldErrors) {
      return false;
    }

    let applied = false;
    for (const [field, messages] of Object.entries(fieldErrors)) {
      const controlName = SERVER_FIELD_NAMES[field];
      const control = controlName ? this.form.get(controlName) : null;
      if (control && messages.length > 0) {
        control.setErrors({ server: messages[0] });
        applied = true;
      }
    }
    return applied;
  }
}

export interface DeleteConfirmDialogData {
  contact: Contact;
}

@Component({
  selector: 'app-delete-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Delete contact</h2>
    <mat-dialog-content>
      <p>Delete {{ data.contact.firstName }} {{ data.contact.surname }}? This cannot be undone.</p>
      @if (error()) {
        <p class="form-error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="deleting()">Cancel</button>
      <button mat-flat-button type="button" (click)="confirmDelete()" [disabled]="deleting()">
        {{ deleting() ? 'Deleting...' : 'Delete' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class DeleteConfirmDialog {
  private readonly dialogRef = inject(MatDialogRef<DeleteConfirmDialog, boolean>);
  private readonly contactsService = inject(ContactsService);
  protected readonly data = inject<DeleteConfirmDialogData>(MAT_DIALOG_DATA);

  protected readonly deleting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected confirmDelete(): void {
    this.deleting.set(true);
    this.error.set(null);
    this.contactsService.delete(this.data.contact.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.deleting.set(false);
        this.error.set(
          isUnauthorized(error)
            ? 'Not authenticated. Use the login icon in the top bar, then try again.'
            : 'Could not delete this contact. Try again.',
        );
      },
    });
  }
}

@Component({
  selector: 'app-auth-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Log in</h2>
    <mat-dialog-content>
      <p>Paste a token from <code>/api/auth/token</code>.</p>
      <mat-form-field appearance="outline" class="auth-dialog-field">
        <mat-label>Auth token</mat-label>
        <input matInput [formControl]="tokenControl" (keyup.enter)="submit()" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" [disabled]="!tokenControl.value.trim()" (click)="submit()">
        Log in
      </button>
    </mat-dialog-actions>
  `,
})
export class AuthDialog {
  private readonly dialogRef = inject(MatDialogRef<AuthDialog, string>);
  protected readonly tokenControl = new FormControl('', { nonNullable: true });

  protected submit(): void {
    const token = this.tokenControl.value.trim();
    if (!token) {
      return;
    }
    this.dialogRef.close(token);
  }
}

@Component({
  selector: 'app-root',
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
    MatToolbarModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './app.html',
})
export class App {
  private readonly contactsService = inject(ContactsService);
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

  protected readonly importing = signal(false);
  protected readonly importError = signal<string | null>(null);

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

  protected importFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.importing.set(true);
    this.importError.set(null);
    this.contactsService.import(file).subscribe({
      next: (result) => {
        this.importing.set(false);
        if (result.errors.length > 0) {
          this.importError.set(
            `Import failed: ${result.errors.map((rowError) => `row ${rowError.row}: ${rowError.message}`).join('; ')}`,
          );
          return;
        }
        this.notify(`Imported ${result.importedCount} contact(s).`, 'add');
        this.store.dispatch(ContactsActions.setPage({ pageIndex: 0, pageSize: this.pageSize() }));
      },
      error: (error) => {
        this.importing.set(false);
        this.importError.set(error?.error?.error ?? 'Could not import the file. Check that the API is running, then try again.');
      },
    });
  }

  protected openCreateDialog(): void {
    this.dialog.open(ContactDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)', data: {} })
      .afterClosed()
      .subscribe((contact) => {
        if (contact) {
          this.notify(`Added ${contact.firstName} ${contact.surname}.`, 'add');
          this.loadContacts();
        }
      });
  }

  protected openEditDialog(contact: Contact): void {
    this.dialog.open(ContactDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)', data: { contact } })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.notify(`Saved changes for ${updated.firstName} ${updated.surname}.`, 'update');
          this.loadContacts();
        }
      });
  }

  protected openDeleteDialog(contact: Contact): void {
    this.dialog.open(DeleteConfirmDialog, { width: '420px', maxWidth: 'calc(100vw - 32px)', data: { contact } })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          this.notify(`Deleted ${contact.firstName} ${contact.surname}.`, 'delete');
          this.loadContacts();
        }
      });
  }

  private notify(message: string, kind: 'add' | 'update' | 'delete' = 'add'): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000, panelClass: `snackbar-${kind}` });
  }
}
