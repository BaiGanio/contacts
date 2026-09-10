import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ContactsApiService } from '../contacts-api.service';
import { FailedImportRow, ImportRowError } from '../contacts.models';

export interface ImportFailuresDialogData {
  currentImportErrors: ImportRowError[];
}

@Component({
  selector: 'app-import-failures-dialog',
  imports: [DatePipe, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Failed import rows</h2>
    <mat-dialog-content class="import-failures-content">
      @if (loading()) {
        <p class="table-status">Loading...</p>
      } @else if (error()) {
        <p class="form-error">{{ error() }}</p>
      } @else if (rows().length === 0) {
        <p class="table-status">No failed rows recorded.</p>
      } @else {
        <ul class="import-failures-list">
          @for (row of rows(); track row.rowHash) {
            <li class="import-failures-item">
              <p class="import-failures-error">{{ row.errorMessage }}</p>
              <p class="import-failures-raw">{{ row.rawRow }}</p>
              <p class="import-failures-meta">
                Row {{ row.rowNumber }}, last seen {{ row.lastSeenAtUtc | date: 'short' }}
              </p>
            </li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styleUrl: './import-failures-dialog.scss',
})
export class ImportFailuresDialog {
  private readonly contactsService = inject(ContactsApiService);
  private readonly data = inject<ImportFailuresDialogData>(MAT_DIALOG_DATA);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<FailedImportRow[]>([]);

  constructor() {
    const currentErrorKeys = new Set(
      this.data.currentImportErrors.map((currentError) => `${currentError.row} ${currentError.message}`),
    );
    const fetchLimit = Math.max(100, currentErrorKeys.size);

    this.contactsService.getImportFailures(fetchLimit).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.rows.set(
          result.items.filter((row) => currentErrorKeys.has(`${row.rowNumber} ${row.errorMessage}`)),
        );
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load failed import rows.');
      },
    });
  }
}
