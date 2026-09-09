import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'contacts.authToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
    this.token.set(token);
  }

  clearToken(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.token.set(null);
  }
}
