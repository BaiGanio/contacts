import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';

export interface Contact {
  id: string;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  iban: string;
}

export type NewContact = Omit<Contact, 'id'>;

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  importedCount: number;
  errors: ImportRowError[];
}

interface ApiContact {
  id: string;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  iban: { value: string };
}

interface ApiPagedContacts {
  items: ApiContact[];
  totalCount: number;
}

export interface ContactsPage {
  contacts: Contact[];
  totalCount: number;
}

export interface ContactsQuery {
  page: number;
  pageSize: number;
  search: string;
}

function toContact(apiContact: ApiContact): Contact {
  return {
    id: apiContact.id,
    firstName: apiContact.firstName,
    surname: apiContact.surname,
    dateOfBirth: apiContact.dateOfBirth,
    address: apiContact.address,
    phoneNumber: apiContact.phoneNumber,
    iban: apiContact.iban.value,
  };
}

/**
 * Talks to the current GET/POST /api/contacts endpoints and unwraps the
 * API's raw response shape (including its `{ value: string }` IBAN
 * representation) so the rest of the app can use one flat Contact model.
 */
@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = 'http://localhost:5187/api/contacts';

  private authHeaders(): HttpHeaders {
    const token = this.auth.token();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  list(query: ContactsQuery): Observable<ContactsPage> {
    let params = new HttpParams().set('page', query.page).set('pageSize', query.pageSize);
    if (query.search.trim()) {
      params = params.set('search', query.search.trim());
    }

    return this.http.get<ApiPagedContacts>(this.baseUrl, { params, headers: this.authHeaders() }).pipe(
      map((page) => ({
        contacts: page.items.map(toContact),
        totalCount: page.totalCount,
      })),
    );
  }

  create(contact: NewContact): Observable<Contact> {
    return this.http
      .post<ApiContact>(this.baseUrl, contact, { headers: this.authHeaders() })
      .pipe(map(toContact));
  }

  import(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImportResult>(`${this.baseUrl}/import`, formData, { headers: this.authHeaders() });
  }
}
