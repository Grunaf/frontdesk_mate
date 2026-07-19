export interface GuestStayRecord {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  bed_id: string;
  guest_name: string | null;
  check_in_at: string;
  check_out_at: string;
  /** Calendar stay night (source of truth for bed nights). */
  check_in_date: string;
  /** Last stay night exclusive end day for bed-night overlap. */
  check_out_date: string;
  activated_at: string | null;
  desk_checked_in_at: string | null;
  key_issued_at: string | null;
  passport_checked_at: string | null;
  tax_collected_at: string | null;
  revoked_at: string | null;
  created_at: string;
  tourism_contact_whatsapp?: string | null;
  stay_contact_whatsapp?: string | null;
  tourism_registration_completed_at?: string | null;
  tourism_exported_at?: string | null;
  booking_platform_id?: string | null;
  booking_external_id?: string | null;
  booking_amount_due_minor?: number | null;
  booking_amount_currency?: string | null;
  booking_paid_at?: string | null;
}

export interface GuestStayRecordWithLink extends GuestStayRecord {
  magicLinkUrl: string | null;
}

export interface GuestSessionPayload {
  stayId: string;
  tenantSlug: string;
  bedId: string;
  exp: number;
}

export interface ResolvedGuestSession extends GuestSessionPayload {
  checkInAt: string;
  checkOutAt: string;
  /** Calendar stay night — source of truth for guest/reception labels. */
  checkInDate: string;
  checkOutDate: string;
  guestName: string | null;
}

export type CreateGuestStayInput = {
  tenantSlug: string;
  bedId: string;
  guestName?: string;
  /** Calendar stay night from reception form — source of truth. */
  checkInDate: string;
  /** Checkout calendar day (exclusive end for bed-night overlap). */
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string | number;
};

export type CreateGuestStayResult =
  | { ok: true; stay: GuestStayRecord; accessToken: string; magicLinkUrl: string; guestPin: string }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'bed_not_found'
        | 'access_overlap'
        | 'db_unavailable'
        | 'invalid_booking_source'
        | 'invalid_booking_balance';
    };

export type ReissueGuestStayInput = {
  tenantSlug: string;
  stayId: string;
};

export type UpdateGuestReservationInput = {
  tenantSlug: string;
  stayId: string;
  bedId: string;
  guestName?: string;
  /** Calendar stay night from reception form — source of truth. */
  checkInDate: string;
  /** Checkout calendar day (exclusive end for bed-night overlap). */
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string | number;
};

export type UpdateGuestReservationResult =
  | { ok: true; stay: GuestStayRecord }
  | {
      ok: false;
      error:
        | 'not_found'
        | 'tenant_not_found'
        | 'bed_not_found'
        | 'access_overlap'
        | 'db_unavailable'
        | 'invalid_booking_source'
        | 'invalid_booking_balance';
    };

export type SetGuestReservationBookingPaidInput = {
  tenantSlug: string;
  stayId: string;
  paid: boolean;
};

export type SetGuestReservationBookingPaidResult =
  | { ok: true; stay: GuestStayRecord }
  | {
      ok: false;
      error:
        | 'not_found'
        | 'tenant_not_found'
        | 'no_balance_recorded'
        | 'db_unavailable';
    };

export type ReissueGuestStayResult =
  | { ok: true; stay: GuestStayRecord; accessToken: string; magicLinkUrl: string; guestPin: string }
  | {
      ok: false;
      error: 'not_found' | 'tenant_not_found' | 'bed_not_found' | 'access_overlap' | 'db_unavailable';
    };

export type ActivateGuestStayResult =
  | { ok: true; session: GuestSessionPayload }
  | {
      ok: false;
      error: 'invalid_token' | 'expired' | 'revoked' | 'wrong_hostel' | 'db_unavailable';
      correctTenantSlug?: string;
    };

export type CompleteDeskCheckInInput = {
  tenantSlug: string;
  stayId: string;
  keyIssued?: boolean;
};

export type CompleteDeskCheckInResult =
  | { ok: true; stay: GuestStayRecord }
  | {
      ok: false;
      error: 'not_found' | 'tenant_not_found' | 'already_revoked' | 'db_unavailable';
    };

/** Desk admits guest to settle in (`passport_checked_at`). Independent of desk arrival / eTurist export. */
export type SetPassportCheckedAtInput = {
  tenantSlug: string;
  stayId: string;
  /** `true` sets timestamp to now; `false` clears it (un-admit). */
  checked: boolean;
};

export type SetPassportCheckedAtResult =
  | { ok: true; stay: GuestStayRecord }
  | {
      ok: false;
      error: 'not_found' | 'tenant_not_found' | 'db_unavailable';
    };

export type ActivateGuestStayByPinResult =
  | { ok: true; session: GuestSessionPayload }
  | {
      ok: false;
      error: 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable';
    };

/** Grant lookup without writing session cookies or activated_at. */
export type GuestStayPreview = {
  stayId: string;
  tenantSlug: string;
  bedId: string;
};

export type PreviewGuestStayByTokenResult =
  | { ok: true; stay: GuestStayPreview }
  | {
      ok: false;
      error: 'invalid_token' | 'expired' | 'revoked' | 'wrong_hostel' | 'db_unavailable';
      correctTenantSlug?: string;
    };

export type PreviewGuestStayByPinResult =
  | { ok: true; stay: GuestStayPreview }
  | {
      ok: false;
      error: 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable';
    };
