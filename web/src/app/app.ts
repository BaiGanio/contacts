import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
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
    return 'Not authenticated. Log in at the top of the page, then try again.';
  }
  if (error instanceof ProgressEvent || (error as { status?: number })?.status === 0) {
    return 'Could not reach the server. Check that the API is running, then try again.';
  }
  return 'Could not save this contact. Check the values and try again.';
}

@Component({
  selector: 'app-contact-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Add a new contact</h2>
    <mat-dialog-content>
      <p>Enter the details below. Every field is required.</p>
      @if (submitError()) {
        <p class="form-error">{{ submitError() }}</p>
      }
      <form id="contact-form" class="contact-form" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline"><mat-label>First name</mat-label><input matInput formControlName="firstName" /><mat-error>Required</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Surname</mat-label><input matInput formControlName="surname" /><mat-error>Required</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Date of birth</mat-label><input matInput type="date" formControlName="dateOfBirth" /><mat-error>Required</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Address</mat-label><input matInput formControlName="address" /><mat-error>Required</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Phone number</mat-label><input matInput formControlName="phoneNumber" /><mat-error>Required</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>IBAN</mat-label><input matInput formControlName="iban" /><mat-error>Required</mat-error></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="submitting()">Cancel</button>
      <button mat-flat-button type="submit" form="contact-form" [disabled]="submitting()">
        {{ submitting() ? 'Saving...' : 'Add contact' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ContactDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContactDialog, Contact>);
  private readonly contactsService = inject(ContactsService);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    surname: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    address: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    iban: ['', Validators.required],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const newContact: NewContact = {
      ...value,
      firstName: value.firstName.trim(),
      surname: value.surname.trim(),
      address: value.address.trim(),
      phoneNumber: value.phoneNumber.trim(),
      iban: value.iban.replaceAll(' ', '').toUpperCase(),
    };

    this.submitting.set(true);
    this.submitError.set(null);
    this.contactsService.create(newContact).subscribe({
      next: (contact) => {
        this.submitting.set(false);
        this.dialogRef.close(contact);
      },
      error: (error) => {
        this.submitting.set(false);
        this.submitError.set(readableSubmitError(error));
      },
    });
  }
}

@Component({
  selector: 'app-root',
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTableModule,
    ReactiveFormsModule,
  ],
  templateUrl: './app.html',
})
export class App {
  private readonly contactsService = inject(ContactsService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(Store);

  protected readonly contacts = this.store.selectSignal(selectContacts);
  protected readonly totalCount = this.store.selectSignal(selectTotalCount);
  protected readonly loading = this.store.selectSignal(selectLoading);
  protected readonly loadError = this.store.selectSignal(selectLoadError);
  protected readonly empty = this.store.selectSignal(selectIsEmpty);
  protected readonly displayedColumns = ['contact', 'dateOfBirth', 'address', 'phoneNumber', 'iban'];

  protected readonly pageIndex = this.store.selectSignal(selectPageIndex);
  protected readonly pageSize = this.store.selectSignal(selectPageSize);
  protected readonly search = this.store.selectSignal(selectSearch);
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly importing = signal(false);
  protected readonly importMessage = signal<string | null>(null);
  protected readonly importError = signal<string | null>(null);

  protected readonly authToken = this.authService.token;
  protected readonly unauthorized = this.store.selectSignal(selectUnauthorized);
  protected readonly tokenControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.store.dispatch(ContactsActions.loadContacts());
    this.searchControl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((value) => {
      this.store.dispatch(ContactsActions.setSearch({ search: value }));
    });
  }

  protected loadContacts(): void {
    this.store.dispatch(ContactsActions.loadContacts());
  }

  protected logIn(): void {
    const token = this.tokenControl.value.trim();
    if (!token) {
      return;
    }
    this.authService.setToken(token);
    this.tokenControl.reset();
    this.loadContacts();
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
    this.importMessage.set(null);
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
        this.importMessage.set(`Imported ${result.importedCount} contact(s).`);
        this.store.dispatch(ContactsActions.setPage({ pageIndex: 0, pageSize: this.pageSize() }));
      },
      error: (error) => {
        this.importing.set(false);
        this.importError.set(error?.error?.error ?? 'Could not import the file. Check that the API is running, then try again.');
      },
    });
  }

  protected openCreateDialog(): void {
    this.dialog.open(ContactDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((contact) => {
        if (contact) {
          this.loadContacts();
        }
      });
  }
}
