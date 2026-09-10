import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Contact, ContactEdits, NewContact } from './contacts.service';

export const ContactsActions = createActionGroup({
  source: 'Contacts',
  events: {
    'Load Contacts': emptyProps(),
    'Load Contacts Success': props<{ contacts: Contact[]; totalCount: number }>(),
    'Load Contacts Failure': props<{ message: string | null; unauthorized: boolean }>(),
    'Set Page': props<{ pageIndex: number; pageSize: number }>(),
    'Set Search': props<{ search: string }>(),
    'Create Contact': props<{ contact: NewContact }>(),
    'Create Contact Success': props<{ contact: Contact }>(),
    'Create Contact Failure': props<{ error: unknown }>(),
    'Update Contact': props<{ id: string; edits: ContactEdits }>(),
    'Update Contact Success': props<{ contact: Contact }>(),
    'Update Contact Failure': props<{ error: unknown }>(),
    'Delete Contact': props<{ id: string }>(),
    'Delete Contact Success': props<{ id: string }>(),
    'Delete Contact Failure': props<{ id: string; error: unknown }>(),
  },
});
