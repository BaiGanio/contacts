import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, take } from 'rxjs';
import { isUnauthorized } from '../http-errors';
import { Contact, NewContact } from '../contacts.models';
import { ContactsActions } from '../state/contacts.actions';

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

export interface ContactFormDialogData {
  contact?: Contact;
}

@Component({
  selector: 'app-contact-form-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './contact-form-dialog.html',
  styleUrl: './contact-form-dialog.scss',
})
export class ContactFormDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ContactFormDialog, Contact>);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<ContactFormDialogData>(MAT_DIALOG_DATA);

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
    if (this.submitting()) {
      return;
    }
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

    const requestId = crypto.randomUUID();

    this.actions$
      .pipe(
        ofType(
          ContactsActions.createContactSuccess,
          ContactsActions.createContactFailure,
          ContactsActions.updateContactSuccess,
          ContactsActions.updateContactFailure,
        ),
        filter((action) => action.requestId === requestId),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        this.submitting.set(false);
        if ('error' in action) {
          if (!this.applyServerFieldErrors(action.error)) {
            this.submitError.set(readableSubmitError(action.error));
          }
          return;
        }
        this.dialogRef.close(action.contact);
      });

    if (this.data.contact) {
      this.store.dispatch(ContactsActions.updateContact({ requestId, id: this.data.contact.id, edits }));
    } else {
      this.store.dispatch(ContactsActions.createContact({ requestId, contact: edits as NewContact }));
    }
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
