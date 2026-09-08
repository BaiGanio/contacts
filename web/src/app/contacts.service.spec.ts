import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Contact, ContactsService, NewContact } from './contacts.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContactsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('maps the API response, including its IBAN value object, to a flat contact', () => {
    let result: Contact[] | undefined;
    service.list().subscribe((contacts) => (result = contacts));

    const req = httpMock.expectOne('/api/contacts');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: '1',
        firstName: 'Ada',
        surname: 'Lovelace',
        dateOfBirth: '1815-12-10',
        address: '12 St James Square, London',
        phoneNumber: '+44 20 7946 0000',
        iban: { value: 'GB82WEST12345698765432' },
      },
    ]);

    expect(result).toEqual([
      {
        id: '1',
        firstName: 'Ada',
        surname: 'Lovelace',
        dateOfBirth: '1815-12-10',
        address: '12 St James Square, London',
        phoneNumber: '+44 20 7946 0000',
        iban: 'GB82WEST12345698765432',
      },
    ]);
  });

  it('sends a plain IBAN string when creating a contact and maps the created contact back', () => {
    const newContact: NewContact = {
      firstName: 'Grace',
      surname: 'Hopper',
      dateOfBirth: '1906-12-09',
      address: 'Arlington, Virginia',
      phoneNumber: '+1 703 555 0100',
      iban: 'GB82WEST12345698765432',
    };

    let result: Contact | undefined;
    service.create(newContact).subscribe((contact) => (result = contact));

    const req = httpMock.expectOne('/api/contacts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newContact);

    req.flush({ id: '2', ...newContact, iban: { value: newContact.iban } });

    expect(result).toEqual({ id: '2', ...newContact });
  });
});
