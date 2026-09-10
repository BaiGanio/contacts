import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { ContactsApiService } from '../contacts-api.service';
import { FailedImportRow } from '../contacts.models';

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
        @if (totalCount() > rows().length) {
          <p class="table-status">
            Showing the {{ rows().length }} most recently seen of {{ totalCount() }} distinct failing rows.
          </p>
        }
        <ul class="import-failures-list">
          @for (row of rows(); track row.rowHash) {
            <li class="import-failures-item">
              <p class="import-failures-error">{{ row.errorMessage }}</p>
              <p class="import-failures-raw">{{ row.rawRow }}</p>
              <p class="import-failures-meta">
                Seen {{ row.attempts }}x, last on {{ row.lastSeenAtUtc | date: 'short' }}
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

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly rows = signal<FailedImportRow[]>([]);
  protected readonly totalCount = signal(0);

  constructor() {
    this.contactsService.getImportFailures().subscribe({
      next: (result) => {
        this.loading.set(false);
        this.rows.set(result.items);
        this.totalCount.set(result.totalCount);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load failed import rows.');
      },
    });
  }
}
