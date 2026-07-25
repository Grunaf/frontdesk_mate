export type GuestGender = 'male' | 'female';

export type GuestDocumentType = 'passport' | 'id_card';

/** Tenant-scoped reusable guest profile (table `guests`). */
export interface GuestProfile {
  id: string;
  tenant_id: string;
  display_name: string;
  contact_whatsapp: string | null;
  notes: string | null;
  first_name: string | null;
  last_name: string | null;
  citizenship: string | null;
  passport_number: string | null;
  date_of_birth: string | null;
  country_of_birth: string | null;
  place_of_birth: string | null;
  gender: GuestGender | null;
  document_type: GuestDocumentType | null;
  created_at: string;
  updated_at: string;
}

export type GuestIdentityFields = {
  firstName: string;
  lastName: string;
  citizenship: string;
  passportNumber: string;
  dateOfBirth: string;
  countryOfBirth: string;
  placeOfBirth: string;
  gender: GuestGender;
  documentType: GuestDocumentType;
};

export type CreateGuestProfileInput = {
  tenantId: string;
  displayName: string;
  contactWhatsapp?: string | null;
  notes?: string | null;
  identity?: Partial<GuestIdentityFields> | null;
};

export type CreateGuestProfileResult =
  | { ok: true; guest: GuestProfile }
  | { ok: false; error: 'invalid_input' | 'db_unavailable' };

export type UpdateGuestIdentityInput = {
  tenantId: string;
  guestId: string;
  identity: GuestIdentityFields;
  /** When set, also refreshes `display_name`. */
  displayName?: string;
};

export type UpdateGuestIdentityResult =
  | { ok: true; guest: GuestProfile }
  | { ok: false; error: 'not_found' | 'db_unavailable' };

export type SearchGuestsInput = {
  tenantId: string;
  query: string;
  limit?: number;
};

export type SearchGuestsResult =
  | { ok: true; items: GuestProfile[] }
  | { ok: false; error: 'db_unavailable' };
