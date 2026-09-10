import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  Contact,
  ContactEdits,
  ContactsPage,
  ContactsQuery,
  FailedImportRows,
  ImportResult,
  NewContact,
} from './contacts.models';

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
export class ContactsApiService {
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

  getById(id: string): Observable<Contact> {
    return this.http
      .get<ApiContact>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() })
      .pipe(map(toContact));
  }

  update(id: string, edits: ContactEdits): Observable<Contact> {
    return this.http
      .put<ApiContact>(`${this.baseUrl}/${id}`, edits, { headers: this.authHeaders() })
      .pipe(map(toContact));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() });
  }

  import(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImportResult>(`${this.baseUrl}/import`, formData, { headers: this.authHeaders() });
  }

  getImportFailures(limit = 100): Observable<FailedImportRows> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<FailedImportRows>('http://localhost:5187/api/imports/failures', {
      params,
      headers: this.authHeaders(),
    });
  }
}
