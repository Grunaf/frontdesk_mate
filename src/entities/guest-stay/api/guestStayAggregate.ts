import 'server-only';

import { buildGuestMagicLinkUrl } from '../lib/buildMagicLinkUrl';
import { decryptAccessToken } from '../lib/accessToken';
import {
  readBookingAmountCurrencyFromRow,
  readBookingAmountMinorFromRow,
} from '../lib/validateReservationBookingBalance';
import type { GuestStayRecord } from '../model/types';

export const GUEST_RESERVATION_COLUMNS =
  'id, tenant_id, guest_id, guest_name, bed_id, check_in_at, check_out_at, check_in_date, check_out_date, status, stay_kind, desk_checked_in_at, key_issued_at, passport_checked_at, tax_collected_at, tourism_contact_whatsapp, tourism_registration_completed_at, tourism_exported_at, stay_contact_whatsapp, booking_platform_id, booking_external_id, booking_amount_due_minor, booking_amount_currency, booking_paid_at, is_archived, archived_at, archived_by_reception_user_id, archive_kind, archive_reason, original_reservation_id, created_at, updated_at';

export const GUEST_ACCESS_GRANT_COLUMNS =
  'id, tenant_id, reservation_id, access_token_hash, access_token_encrypted, pin_hash, activated_at, revoked_at, created_at, updated_at';

export function mapReservationGrantToStayRecord(
  reservation: Record<string, unknown>,
  grant: Record<string, unknown> | null,
  tenantSlug: string
): GuestStayRecord | null {
  const status = reservation.status ? String(reservation.status) : 'planned';
  const grantRevoked = grant?.revoked_at ? String(grant.revoked_at) : null;
  const revokedAt =
    grantRevoked ?? (status === 'cancelled' ? String(reservation.updated_at ?? '') : null);

  return {
    id: String(reservation.id),
    tenant_id: String(reservation.tenant_id),
    tenant_slug: tenantSlug,
    bed_id: String(reservation.bed_id),
    guest_name: reservation.guest_name ? String(reservation.guest_name) : null,
    check_in_at: String(reservation.check_in_at),
    check_out_at: String(reservation.check_out_at),
    check_in_date: reservation.check_in_date
      ? String(reservation.check_in_date).slice(0, 10)
      : String(reservation.check_in_at).slice(0, 10),
    check_out_date: reservation.check_out_date
      ? String(reservation.check_out_date).slice(0, 10)
      : String(reservation.check_out_at).slice(0, 10),
    activated_at: grant?.activated_at ? String(grant.activated_at) : null,
    desk_checked_in_at: reservation.desk_checked_in_at
      ? String(reservation.desk_checked_in_at)
      : null,
    key_issued_at: reservation.key_issued_at ? String(reservation.key_issued_at) : null,
    passport_checked_at: reservation.passport_checked_at
      ? String(reservation.passport_checked_at)
      : null,
    tax_collected_at: reservation.tax_collected_at ? String(reservation.tax_collected_at) : null,
    revoked_at: revokedAt,
    created_at: String(reservation.created_at),
    stay_kind: reservation.stay_kind === 'volunteer' ? 'volunteer' : 'guest',
    tourism_contact_whatsapp: reservation.tourism_contact_whatsapp
      ? String(reservation.tourism_contact_whatsapp)
      : null,
    stay_contact_whatsapp: reservation.stay_contact_whatsapp
      ? String(reservation.stay_contact_whatsapp)
      : null,
    tourism_registration_completed_at: reservation.tourism_registration_completed_at
      ? String(reservation.tourism_registration_completed_at)
      : null,
    tourism_exported_at: reservation.tourism_exported_at
      ? String(reservation.tourism_exported_at)
      : null,
    booking_platform_id: reservation.booking_platform_id
      ? String(reservation.booking_platform_id)
      : null,
    booking_external_id: reservation.booking_external_id
      ? String(reservation.booking_external_id)
      : null,
    booking_amount_due_minor: readBookingAmountMinorFromRow(reservation.booking_amount_due_minor),
    booking_amount_currency: readBookingAmountCurrencyFromRow(
      reservation.booking_amount_currency
    ),
    booking_paid_at: reservation.booking_paid_at ? String(reservation.booking_paid_at) : null,
    is_archived: Boolean(reservation.is_archived),
    archived_at: reservation.archived_at ? String(reservation.archived_at) : null,
    archived_by_reception_user_id: reservation.archived_by_reception_user_id
      ? String(reservation.archived_by_reception_user_id)
      : null,
    archive_kind:
      reservation.archive_kind === 'full' || reservation.archive_kind === 'remainder'
        ? reservation.archive_kind
        : null,
    original_reservation_id: reservation.original_reservation_id
      ? String(reservation.original_reservation_id)
      : null,
  };
}

export function buildMagicLinkFromGrantRow(
  grant: Record<string, unknown>,
  tenantSlug: string,
  locale: string
): string | null {
  const token = decryptAccessToken(
    grant.access_token_encrypted ? String(grant.access_token_encrypted) : null
  );
  if (!token) return null;
  return buildGuestMagicLinkUrl(tenantSlug, locale, token);
}
