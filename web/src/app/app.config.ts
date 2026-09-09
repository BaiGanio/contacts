import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { contactsFeatureKey, contactsReducer } from './contacts.reducer';
import { ContactsEffects } from './contacts.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideStore({ [contactsFeatureKey]: contactsReducer }),
    provideEffects(ContactsEffects),
  ]
};
