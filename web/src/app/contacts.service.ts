import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

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

interface ApiContact {
  id: string;
  firstName: string;
  surname: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  iban: { value: string };
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
  private readonly baseUrl = 'http://localhost:5187/api/contacts';

  list(): Observable<Contact[]> {
    return this.http.get<ApiContact[]>(this.baseUrl).pipe(map((contacts) => contacts.map(toContact)));
  }

  create(contact: NewContact): Observable<Contact> {
    return this.http.post<ApiContact>(this.baseUrl, contact).pipe(map(toContact));
  }
}
