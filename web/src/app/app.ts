import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Contact, ContactsService, NewContact } from './contacts.service';

const LOAD_ERROR_MESSAGE = 'Could not load contacts. Check that the API is running, then try again.';

function readableSubmitError(error: unknown): string {
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
  imports: [DatePipe, MatButtonModule, MatTableModule],
  templateUrl: './app.html',
})
export class App {
  private readonly contactsService = inject(ContactsService);
  private readonly dialog = inject(MatDialog);

  protected readonly contacts = signal<Contact[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly contactCount = computed(() => this.contacts().length);
  protected readonly empty = computed(() => !this.loading() && !this.loadError() && this.contacts().length === 0);
  protected readonly displayedColumns = ['contact', 'dateOfBirth', 'address', 'phoneNumber', 'iban'];

  protected readonly importing = signal(false);
  protected readonly importMessage = signal<string | null>(null);
  protected readonly importError = signal<string | null>(null);

  constructor() {
    this.loadContacts();
  }

  protected loadContacts(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.contactsService.list().subscribe({
      next: (contacts) => {
        this.contacts.set(contacts);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(LOAD_ERROR_MESSAGE);
        this.loading.set(false);
      },
    });
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
        this.loadContacts();
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
          this.contacts.update((contacts) => [...contacts, contact]);
        }
      });
  }
}
