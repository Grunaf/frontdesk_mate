import type { GuestProfile } from '@/entities/guest';
import { guestProfileToIdentityPrefill } from '@/entities/guest';
import type { TourismGuestDocumentType, TourismGuestGender } from './validateTourismGuestIdentity';

export type TourismFormIdentityPrefill = {
  guestId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  countryOfBirth: string;
  placeOfBirth: string;
  gender?: TourismGuestGender;
  citizenship: string;
  documentType: TourismGuestDocumentType;
  passportNumber: string;
};

/** Prefill tourism identity fields from a guest profile (complete or partial). */
export function guestProfileToTourismFormValues(guest: GuestProfile): TourismFormIdentityPrefill {
  const complete = guestProfileToIdentityPrefill(guest);
  if (complete) {
    return {
      guestId: guest.id,
      firstName: complete.firstName,
      lastName: complete.lastName,
      dateOfBirth: complete.dateOfBirth,
      countryOfBirth: complete.countryOfBirth,
      placeOfBirth: complete.placeOfBirth,
      gender: complete.gender,
      citizenship: complete.citizenship,
      documentType: complete.documentType,
      passportNumber: complete.passportNumber,
    };
  }

  const fromDisplay = guest.display_name.trim().split(/\s+/).filter(Boolean);
  return {
    guestId: guest.id,
    firstName: guest.first_name?.trim() || fromDisplay[0] || '',
    lastName: guest.last_name?.trim() || fromDisplay.slice(1).join(' ') || '',
    dateOfBirth: guest.date_of_birth?.trim() || '',
    countryOfBirth: guest.country_of_birth?.trim() || guest.citizenship?.trim() || 'ME',
    placeOfBirth: guest.place_of_birth?.trim() || '',
    gender: guest.gender ?? undefined,
    citizenship: guest.citizenship?.trim() || 'ME',
    documentType: guest.document_type ?? 'passport',
    passportNumber: guest.passport_number?.trim() || '',
  };
}
