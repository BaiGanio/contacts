import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

interface TokenResponse {
  token: string;
}

@Component({
  selector: 'app-auth-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Log in</h2>
    <mat-dialog-content>
      <form id="auth-form" class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" />
        </mat-form-field>
      </form>
      @if (error()) {
        <p class="auth-dialog-error">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close [disabled]="loading()">Cancel</button>
      <button mat-flat-button type="submit" form="auth-form" [disabled]="form.invalid || loading()">
        @if (loading()) {
          <mat-spinner diameter="18" />
        } @else {
          Log in
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .auth-form {
      display: grid;
      gap: 16px;
      padding-top: 8px;
    }

    .auth-dialog-error {
      color: var(--mat-sys-error);
      margin: 0;
    }
  `,
})
export class AuthDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AuthDialog, string>);
  private readonly http = inject(HttpClient);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected submit(): void {
    if (this.loading()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();

    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<TokenResponse>(`${environment.apiBaseUrl}/api/auth/token`, { username, password })
      .pipe(
        catchError(() => {
          this.error.set('Wrong username or password.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.dialogRef.close(response.token);
        }
      });
  }
}
