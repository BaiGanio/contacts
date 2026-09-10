import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { isUnauthorized } from '../http-errors';
import { ContactsApiService } from '../contacts-api.service';
import { ImportRowError } from '../contacts.models';
import { ContactsActions } from '../state/contacts.actions';
import { selectPageSize } from '../state/contacts.selectors';
import { ImportFailuresDialog, ImportFailuresDialogData } from './import-failures-dialog';

/**
 * Owns the CSV upload trigger, progress, result, and timer cleanup end to
 * end. The toolbar button lives in the parent template and calls into this
 * component through a template reference variable (`#importer="appContactImport"`)
 * so this component can render its own status text in place, below the
 * toolbar, without the parent needing to track any of its state.
 */
@Component({
  selector: 'app-contact-import',
  exportAs: 'appContactImport',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './contact-import.html',
})
export class ContactImport {
  private readonly contactsService = inject(ContactsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly store = inject(Store);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('csvInput');
  private readonly pageSize = this.store.selectSignal(selectPageSize);

  readonly importing = signal(false);
  protected readonly importError = signal<string | null>(null);
  protected readonly importFailedCount = signal(0);
  protected readonly importElapsedLabel = signal('0s');
  private importTimer: ReturnType<typeof setInterval> | null = null;
  private currentImportErrors: ImportRowError[] = [];
  private currentImportTotalErrorCount = 0;

  openPicker(): void {
    this.fileInput().nativeElement.click();
  }

  protected openImportFailuresDialog(): void {
    this.dialog.open<ImportFailuresDialog, ImportFailuresDialogData>(ImportFailuresDialog, {
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
      data: {
        currentImportErrors: this.currentImportErrors,
        totalErrorCount: this.currentImportTotalErrorCount,
      },
    });
  }

  private startImportTimer(): void {
    const startedAt = Date.now();
    this.importElapsedLabel.set('0s');
    this.importTimer = setInterval(() => {
      const totalSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      this.importElapsedLabel.set(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
    }, 1000);
  }

  private stopImportTimer(): void {
    if (this.importTimer !== null) {
      clearInterval(this.importTimer);
      this.importTimer = null;
    }
  }

  protected handleFileChange(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    this.importing.set(true);
    this.importError.set(null);
    this.importFailedCount.set(0);
    this.currentImportErrors = [];
    this.currentImportTotalErrorCount = 0;
    this.startImportTimer();
    this.contactsService.import(file).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.stopImportTimer();
        if (result.importedCount > 0) {
          this.store.dispatch(ContactsActions.setPage({ pageIndex: 0, pageSize: this.pageSize() }));
        }
        if (result.totalErrorCount > 0) {
          this.currentImportErrors = result.errors;
          this.currentImportTotalErrorCount = result.totalErrorCount;
          this.importFailedCount.set(result.totalErrorCount);
          this.importError.set(
            `Imported ${result.importedCount} contact(s). ${result.totalErrorCount} row(s) failed to import.`,
          );
          return;
        }
        this.notify(`Imported ${result.importedCount} contact(s).`);
      },
      error: (error) => {
        this.importing.set(false);
        this.stopImportTimer();
        this.importError.set(
          isUnauthorized(error)
            ? 'Not authenticated. Use the login icon in the top bar, then try again.'
            : (error?.error?.error ?? 'Could not import the file. Check that the API is running, then try again.'),
        );
      },
    });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000, panelClass: 'snackbar-add' });
  }
}
