import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';

interface Contact {
  id: string;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  iban: string;
}

type ContactFormValue = Omit<Contact, 'id'>;

const SAMPLE_CONTACTS: Contact[] = [
  { id: '1', firstName: 'Ahmed', surname: 'Ivanov', dateOfBirth: '1965-10-19', address: 'Kirkkokatu 36, 85532 Espoo, FI', phoneNumber: '+358001338908', iban: 'FI2816525808631930' },
  { id: '2', firstName: 'Günter', surname: 'Fürst', dateOfBirth: '1969-03-14', address: 'Löwenplatz 12, 59615 Hamburg, DE', phoneNumber: '+49184959310', iban: 'DE59679883481367606524' },
  { id: '3', firstName: 'Renée', surname: 'Röder', dateOfBirth: '1978-07-20', address: 'Brühlstraße 84, 14207 München, DE', phoneNumber: '+49564139537', iban: 'DE73394225258329500167' },
  { id: '4', firstName: 'Marco', surname: 'Marchetti', dateOfBirth: '1959-01-12', address: 'Lindenallee 65, 99166 Würzburg, DE', phoneNumber: '+49184514627', iban: 'DE61077975168513199954' },
  { id: '5', firstName: 'Röschen', surname: 'Röder', dateOfBirth: '1965-01-24', address: 'Hauptstraße 62, 21226 Lübeck, DE', phoneNumber: '+49718227824', iban: 'DE12569976736384200550' },
];

@Component({
  selector: 'app-contact-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Add a new contact</h2>
    <mat-dialog-content>
      <p>Enter the details below. Every field is required.</p>
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
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="submit" form="contact-form">Add contact</button>
    </mat-dialog-actions>
  `,
})
export class ContactDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContactDialog, ContactFormValue>);

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
    this.dialogRef.close({
      ...value,
      firstName: value.firstName.trim(),
      surname: value.surname.trim(),
      address: value.address.trim(),
      phoneNumber: value.phoneNumber.trim(),
      iban: value.iban.replaceAll(' ', '').toUpperCase(),
    });
  }
}

@Component({
  selector: 'app-root',
  imports: [DatePipe, MatButtonModule, MatTableModule],
  templateUrl: './app.html',
})
export class App {
  private readonly dialog = inject(MatDialog);

  protected readonly contacts = signal<Contact[]>(SAMPLE_CONTACTS);
  protected readonly contactCount = computed(() => this.contacts().length);
  protected readonly displayedColumns = ['contact', 'dateOfBirth', 'address', 'phoneNumber', 'iban'];

  protected openCreateDialog(): void {
    this.dialog.open(ContactDialog, { width: '640px', maxWidth: 'calc(100vw - 32px)' })
      .afterClosed()
      .subscribe((contact) => {
        if (contact) {
          this.contacts.update((contacts) => [...contacts, { id: crypto.randomUUID(), ...contact }]);
        }
      });
  }
}
