/** Occupancy kind on guest_reservations — volunteer stays skip price/source/Cash. */
export type GuestStayKind = 'guest' | 'volunteer';

export interface GuestStayRecord {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  bed_id: string;
  /** Linked reusable guest profile (`guests.id`), when present. */
  guest_id?: string | null;
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
  /** Defaults to guest when column missing (pre-migration rows). */
  stay_kind?: GuestStayKind;
  tourism_contact_whatsapp?: string | null;
  stay_contact_whatsapp?: string | null;
  tourism_registration_completed_at?: string | null;
  tourism_exported_at?: string | null;
  booking_platform_id?: string | null;
  booking_external_id?: string | null;
  booking_amount_due_minor?: number | null;
  booking_amount_currency?: string | null;
  booking_paid_at?: string | null;
  /**
   * Shared id for multi-guest party; null = singleton.
   * Group balance (`booking_amount_*`) lives on the lead row only.
   */
  booking_group_id?: string | null;
  /** Desk-only comment; not shown in guest app. */
  reception_note?: string | null;
  /** Soft-archive. Operational lists / overlap exclude these. */
  is_archived?: boolean;
  archived_at?: string | null;
  archived_by_reception_user_id?: string | null;
  /** `full` = whole booking archived; `remainder` = unlived tail linked to original. */
  archive_kind?: 'full' | 'remainder' | null;
  /** Why the booking left operational inventory (`cancelled` | `checked_out`). */
  archive_reason?: GuestReservationArchiveReason | null;
  /** For remainder rows: lived/shortened original reservation. */
  original_reservation_id?: string | null;
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
  /** Existing `guests.id` for this tenant; creates a new profile when omitted. */
  guestId?: string;
  /** Calendar stay night from reception form — source of truth. */
  checkInDate: string;
  /** Checkout calendar day (exclusive end for bed-night overlap). */
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  bookingAmountDue?: string | number;
  /**
   * `volunteer` — no booking source/price; used by owner portal Volunteers.
   * Defaults to `guest`.
   */
  stayKind?: GuestStayKind;
  /** When set, stay joins a party; balance should be on lead only. */
  bookingGroupId?: string | null;
  /** When false, skip booking_amount_* (sibling party rows). Defaults to true. */
  recordBookingBalance?: boolean;
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
        | 'invalid_booking_balance'
        | 'guest_not_found';
    };

/** One guest slot in a multi-bed party booking. */
export type CreateGuestStayPartyGuest = {
  bedId: string;
  guestName?: string;
  guestId?: string;
};

export type CreateGuestStayPartyInput = {
  tenantSlug: string;
  guests: CreateGuestStayPartyGuest[];
  checkInDate: string;
  checkOutDate: string;
  bookingPlatformId?: string;
  bookingExternalId?: string;
  /** Group total — stored on lead (first guest) only. */
  bookingAmountDue?: string | number;
  stayKind?: GuestStayKind;
};

export type CreateGuestStayPartyResult =
  | {
      ok: true;
      bookingGroupId: string;
      stays: Array<{
        stay: GuestStayRecord;
        accessToken: string;
        magicLinkUrl: string;
        guestPin: string;
      }>;
    }
  | {
      ok: false;
      error:
        | 'tenant_not_found'
        | 'bed_not_found'
        | 'access_overlap'
        | 'db_unavailable'
        | 'invalid_booking_source'
        | 'invalid_booking_balance'
        | 'guest_not_found'
        | 'duplicate_bed'
        | 'empty_party';
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
  /** Existing `guests.id` for this tenant; creates/keeps profile when omitted. */
  guestId?: string;
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
        | 'invalid_booking_balance'
        | 'guest_not_found';
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

export type SetGuestReservationReceptionNoteInput = {
  tenantSlug: string;
  stayId: string;
  note: string | null;
};

export type SetGuestReservationReceptionNoteResult =
  | { ok: true; stay: GuestStayRecord }
  | {
      ok: false;
      error: 'not_found' | 'tenant_not_found' | 'invalid_note' | 'db_unavailable';
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

/**
 * Desk admits guest to settle in.
 * `checked: true` dual-writes `passport_checked_at` + `desk_checked_in_at` (optional `key_issued_at`).
 */
export type SetPassportCheckedAtInput = {
  tenantSlug: string;
  stayId: string;
  /** `true` sets timestamps to now; `false` clears admit timestamps (un-admit). */
  checked: boolean;
  /** When admitting, optionally record room key handoff. */
  keyIssued?: boolean;
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

/** Reservation mutation status for cancel / checkout / archive restore / purge. */
export type GuestReservationLifecycleStatus =
  | 'ok'
  | 'not_found'
  | 'db_unavailable'
  | 'already_archived'
  | 'not_archived'
  | 'original_missing'
  | 'access_overlap'
  | 'invalid_operational_day';

export type GuestReservationArchiveKind = 'full' | 'remainder';

/** Why the booking left operational inventory. */
export type GuestReservationArchiveReason = 'cancelled' | 'checked_out';

export type GuestReservationArchiveListItem = {
  id: string;
  tenant_id: string;
  bed_id: string;
  guest_name: string | null;
  check_in_date: string;
  check_out_date: string;
  status: string;
  archive_kind: GuestReservationArchiveKind;
  archive_reason: GuestReservationArchiveReason | null;
  original_reservation_id: string | null;
  /** False when original was purged (Open original disabled). */
  original_exists: boolean;
  archived_at: string;
  archived_by_reception_user_id: string | null;
  archived_by_display_name: string | null;
};

/** @deprecated Prefer GuestReservationArchiveListItem */
export type GuestReservationTrashListItem = GuestReservationArchiveListItem;

export type CancelOrCheckoutGuestReservationInput = {
  tenantSlug: string;
  stayId: string;
  /** Operational calendar day at action time (exclusive end for lived portion). */
  operationalDate: string;
  archivedByReceptionUserId: string;
  /**
   * `cancel` — not admitted / full archive when nothing lived.
   * `checkout` — after admit; shorten original + archive remainder when nights remain.
   */
  intent: 'cancel' | 'checkout';
};

export type CancelOrCheckoutGuestReservationResult =
  | {
      ok: true;
      kind: 'full_archived' | 'remainder_archived' | 'checkout_no_remainder';
      originalStayId: string;
      archiveStayId: string | null;
    }
  | {
      ok: false;
      error: GuestReservationLifecycleStatus;
    };
