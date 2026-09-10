import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Contact, ContactEdits, NewContact } from '../contacts.models';

export const ContactsActions = createActionGroup({
  source: 'Contacts',
  events: {
    'Load Contacts': emptyProps(),
    'Load Contacts Success': props<{ contacts: Contact[]; totalCount: number }>(),
    'Load Contacts Failure': props<{ message: string | null; unauthorized: boolean }>(),
    'Set Page': props<{ pageIndex: number; pageSize: number }>(),
    'Set Search': props<{ search: string }>(),
    'Create Contact': props<{ requestId: string; contact: NewContact }>(),
    'Create Contact Success': props<{ requestId: string; contact: Contact }>(),
    'Create Contact Failure': props<{ requestId: string; error: unknown }>(),
    'Update Contact': props<{ requestId: string; id: string; edits: ContactEdits }>(),
    'Update Contact Success': props<{ requestId: string; contact: Contact }>(),
    'Update Contact Failure': props<{ requestId: string; error: unknown }>(),
    'Delete Contact': props<{ requestId: string; id: string }>(),
    'Delete Contact Success': props<{ requestId: string; id: string }>(),
    'Delete Contact Failure': props<{ requestId: string; id: string; error: unknown }>(),
  },
});
