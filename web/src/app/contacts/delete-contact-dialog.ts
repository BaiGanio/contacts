import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { filter, take } from 'rxjs';
import { isUnauthorized } from './http-errors';
import { Contact } from './contacts.models';
import { ContactsActions } from './state/contacts.actions';

export interface DeleteContactDialogData {
  contact: Contact;
}

@Component({
  selector: 'app-delete-contact-dialog',
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
export class DeleteContactDialog {
  private readonly dialogRef = inject(MatDialogRef<DeleteContactDialog, boolean>);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data = inject<DeleteContactDialogData>(MAT_DIALOG_DATA);

  protected readonly deleting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected confirmDelete(): void {
    if (this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.error.set(null);

    const requestId = crypto.randomUUID();

    this.actions$
      .pipe(
        ofType(ContactsActions.deleteContactSuccess, ContactsActions.deleteContactFailure),
        filter((action) => action.requestId === requestId),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        this.deleting.set(false);
        if ('error' in action) {
          this.error.set(
            isUnauthorized(action.error)
              ? 'Not authenticated. Use the login icon in the top bar, then try again.'
              : 'Could not delete this contact. Try again.',
          );
          return;
        }
        this.dialogRef.close(true);
      });

    this.store.dispatch(ContactsActions.deleteContact({ requestId, id: this.data.contact.id }));
  }
}
