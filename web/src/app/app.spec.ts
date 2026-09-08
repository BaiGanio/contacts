import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('renders the contacts page', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Your contacts');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('adds a contact to the in-memory table', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[mat-flat-button]').click();
    fixture.detectChanges();

    TestBed.inject(MatDialog).openDialogs[0].close({
      firstName: 'Ada',
      surname: 'Lovelace',
      dateOfBirth: '1815-12-10',
      address: 'London',
      phoneNumber: '+442079460000',
      iban: 'GB82WEST12345698765432',
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(6);
    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
  });
});
