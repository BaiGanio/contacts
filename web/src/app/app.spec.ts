import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

const API_CONTACTS = [
  { id: '1', firstName: 'Ahmed', surname: 'Ivanov', dateOfBirth: '1965-10-19', address: 'Kirkkokatu 36, 85532 Espoo, FI', phoneNumber: '+358001338908', iban: { value: 'FI2816525808631930' } },
  { id: '2', firstName: 'Günter', surname: 'Fürst', dateOfBirth: '1969-03-14', address: 'Löwenplatz 12, 59615 Hamburg, DE', phoneNumber: '+49184959310', iban: { value: 'DE59679883481367606524' } },
  { id: '3', firstName: 'Renée', surname: 'Röder', dateOfBirth: '1978-07-20', address: 'Brühlstraße 84, 14207 München, DE', phoneNumber: '+49564139537', iban: { value: 'DE73394225258329500167' } },
  { id: '4', firstName: 'Marco', surname: 'Marchetti', dateOfBirth: '1959-01-12', address: 'Lindenallee 65, 99166 Würzburg, DE', phoneNumber: '+49184514627', iban: { value: 'DE61077975168513199954' } },
  { id: '5', firstName: 'Röschen', surname: 'Röder', dateOfBirth: '1965-01-24', address: 'Hauptstraße 62, 21226 Lübeck, DE', phoneNumber: '+49718227824', iban: { value: 'DE12569976736384200550' } },
];

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows a loading state while contacts are being fetched', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Loading contacts');
    httpMock.expectOne('/api/contacts').flush([]);
  });

  it('renders the contacts loaded from the API', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpMock.expectOne('/api/contacts').flush(API_CONTACTS);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Contacts');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('shows an empty state when the API returns no contacts', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpMock.expectOne('/api/contacts').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No contacts yet');
  });

  it('shows a readable error state when loading contacts fails', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpMock.expectOne('/api/contacts').flush('failure', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Could not load contacts');
  });
});
