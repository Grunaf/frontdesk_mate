import type { TourismGuestListItem } from '../actions/listTourismGuestsForSessionAction';

type TourismGuestNameFields = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  entry_stamp_date: string | null;
  entry_stamp_page?: number | null;
};

/** Map DB tourism guest rows to the guest-app list DTO (SSR + client). */
export function mapTourismGuestListItems(
  guests: ReadonlyArray<TourismGuestNameFields>
): TourismGuestListItem[] {
  return guests.map((guest) => ({
    id: guest.id,
    firstName: guest.first_name,
    lastName: guest.last_name,
    dateOfBirth: guest.date_of_birth,
    entryStampDate: guest.entry_stamp_date,
    entryStampPage: guest.entry_stamp_page ?? null,
  }));
}
