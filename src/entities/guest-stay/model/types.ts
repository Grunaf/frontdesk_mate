export interface GuestStayRecord {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  bed_id: string;
  guest_name: string | null;
  check_in_at: string;
  check_out_at: string;
  activated_at: string | null;
  revoked_at: string | null;
  created_at: string;
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
  | { ok: false; error: 'tenant_not_found' | 'bed_not_found' | 'bed_occupied' | 'db_unavailable' };

export type ActivateGuestStayResult =
  | { ok: true; session: GuestSessionPayload }
  | {
      ok: false;
      error: 'invalid_token' | 'expired' | 'revoked' | 'wrong_hostel' | 'db_unavailable';
      correctTenantSlug?: string;
    };

export type ActivateGuestStayByPinResult =
  | { ok: true; session: GuestSessionPayload }
  | {
      ok: false;
      error: 'invalid_pin' | 'expired' | 'revoked' | 'db_unavailable';
    };
