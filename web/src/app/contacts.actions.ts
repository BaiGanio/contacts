import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Contact } from './contacts.service';

export const ContactsActions = createActionGroup({
  source: 'Contacts',
  events: {
    'Load Contacts': emptyProps(),
    'Load Contacts Success': props<{ contacts: Contact[]; totalCount: number }>(),
    'Load Contacts Failure': props<{ message: string | null; unauthorized: boolean }>(),
    'Set Page': props<{ pageIndex: number; pageSize: number }>(),
    'Set Search': props<{ search: string }>(),
  },
});
