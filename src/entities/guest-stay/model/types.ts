export interface GuestStayRecord {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  bed_id: string;
  guest_name: string | null;
  check_in_at: string;
  check_out_at: string;
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
  guestName: string | null;
}

export type CreateGuestStayInput = {
  tenantSlug: string;
  bedId: string;
  guestName?: string;
  checkInAt: string;
  checkOutAt: string;
};

export type CreateGuestStayResult =
  | { ok: true; stay: GuestStayRecord; accessToken: string; magicLinkUrl: string; guestPin: string }
  | { ok: false; error: 'tenant_not_found' | 'bed_not_found' | 'access_overlap' | 'db_unavailable' };

export type ReissueGuestStayInput = {
  tenantSlug: string;
  stayId: string;
};

export type UpdateGuestReservationInput = {
  tenantSlug: string;
  stayId: string;
  bedId: string;
  guestName?: string;
  checkInAt: string;
  checkOutAt: string;
};

export type UpdateGuestReservationResult =
  | { ok: true; stay: GuestStayRecord }
  | {
      ok: false;
      error: 'not_found' | 'tenant_not_found' | 'bed_not_found' | 'access_overlap' | 'db_unavailable';
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

export type ActivateGuestStayByPinResult =
  | { ok: true; session: GuestSessionPayload }
  | {
      ok: false;
      error: 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable';
    };
