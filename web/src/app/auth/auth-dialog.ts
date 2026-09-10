import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

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
