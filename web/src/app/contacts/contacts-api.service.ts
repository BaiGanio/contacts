import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
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

interface ApiPagedContacts {
  items: Contact[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class ContactsApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/contacts`;
  private readonly importFailuresUrl = `${environment.apiBaseUrl}/api/imports/failures`;

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
        contacts: page.items,
        totalCount: page.totalCount,
      })),
    );
  }

  create(contact: NewContact): Observable<Contact> {
    return this.http.post<Contact>(this.baseUrl, contact, { headers: this.authHeaders() });
  }

  getById(id: string): Observable<Contact> {
    return this.http.get<Contact>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() });
  }

  update(id: string, edits: ContactEdits): Observable<Contact> {
    return this.http.put<Contact>(`${this.baseUrl}/${id}`, edits, { headers: this.authHeaders() });
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
    return this.http.get<FailedImportRows>(this.importFailuresUrl, {
      params,
      headers: this.authHeaders(),
    });
  }
}
