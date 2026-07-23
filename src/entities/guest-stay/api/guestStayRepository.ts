import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { getTenantRecord } from '@/entities/tenant/server';
import type { TenantSettings } from '@/entities/tenant';
import {
  encryptAccessToken,
  generateAccessToken,
  hashAccessToken,
} from '../lib/accessToken';
import { generateGuestPin, hashGuestPin, isGuestPinFormatValid, verifyGuestPin } from '../lib/guestPin';
import { resolveArchiveSplitPlan } from '../lib/resolveArchiveSplitPlan';
import { resolveGuestPinActivationError } from '../lib/resolveGuestPinActivationError';
import { buildGuestMagicLinkUrl } from '../lib/buildMagicLinkUrl';
import { buildGuestSessionPayload, readGuestSessionFromCookies } from '../lib/guestSession';
import { guestAccessBedNightsOverlap } from '../lib/guestAccessIntervals';
import {
  resolveReservationStayPeriod,
  stayRecordCheckInDate,
  stayRecordCheckOutDate,
} from '../lib/resolveReservationStayPeriod';
import { bedExistsInGuestStay } from '../lib/validateBedForTenant';
import { validateReservationBookingSource } from '../lib/validateReservationBookingSource';
import { resolveReservationBookingBalance } from '../lib/validateReservationBookingBalance';
import {
  buildMagicLinkFromGrantRow,
  GUEST_ACCESS_GRANT_COLUMNS,
  GUEST_RESERVATION_COLUMNS,
  mapReservationGrantToStayRecord,
} from './guestStayAggregate';
import type {
  ActivateGuestStayByPinResult,
  ActivateGuestStayResult,
  CancelOrCheckoutGuestReservationInput,
  CancelOrCheckoutGuestReservationResult,
  CompleteDeskCheckInInput,
  CompleteDeskCheckInResult,
  CreateGuestStayInput,
  CreateGuestStayResult,
  SetPassportCheckedAtInput,
  SetPassportCheckedAtResult,
  GuestSessionPayload,
  GuestStayPreview,
  GuestStayRecord,
  GuestStayRecordWithLink,
  GuestReservationArchiveListItem,
  GuestReservationArchiveReason,
  GuestReservationLifecycleStatus,
  PreviewGuestStayByPinResult,
  PreviewGuestStayByTokenResult,
  ReissueGuestStayInput,
  ReissueGuestStayResult,
  ResolvedGuestSession,
  UpdateGuestReservationInput,
  UpdateGuestReservationResult,
  SetGuestReservationBookingPaidInput,
  SetGuestReservationBookingPaidResult,
} from '../model/types';

const OPERATIONAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidOperationalDate(value: string): boolean {
  return OPERATIONAL_DATE_RE.test(value);
}
function isStayActive(row: Pick<GuestStayRecord, 'revoked_at' | 'check_out_at'>): boolean {
  if (row.revoked_at) return false;
  return new Date(row.check_out_at).getTime() > Date.now();
}

function isAccessOverlapDbError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23P01';
}

async function findOverlappingReservationOnBed(
  tenantId: string,
  bedId: string,
  checkInDate: string,
  checkOutDate: string,
  excludeReservationId?: string
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data, error } = await admin
    .from('guest_reservations')
    .select('id, check_in_at, check_out_at, check_in_date, check_out_date')
    .eq('tenant_id', tenantId)
    .eq('bed_id', bedId)
    .eq('status', 'planned')
    .eq('is_archived', false);

  if (error) {
    console.error('findOverlappingReservationOnBed:', error.message);
    return false;
  }

  return (data ?? []).some((row) => {
    if (excludeReservationId && String(row.id) === excludeReservationId) {
      return false;
    }
    const rowIn = row.check_in_date
      ? String(row.check_in_date).slice(0, 10)
      : String(row.check_in_at).slice(0, 10);
    const rowOut = row.check_out_date
      ? String(row.check_out_date).slice(0, 10)
      : String(row.check_out_at).slice(0, 10);
    return guestAccessBedNightsOverlap(rowIn, rowOut, checkInDate, checkOutDate);
  });
}

async function loadActiveGrantForReservation(
  tenantId: string,
  reservationId: string
): Promise<Record<string, unknown> | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('guest_access_grants')
    .select(GUEST_ACCESS_GRANT_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('reservation_id', reservationId)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('loadActiveGrantForReservation:', error.message);
    return null;
  }

  return data as Record<string, unknown> | null;
}

async function loadReservationStayAggregate(
  tenantSlug: string,
  reservationId: string
): Promise<GuestStayRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return null;

  const { data: reservation, error } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', reservationId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (error || !reservation) {
    if (error) console.error('loadReservationStayAggregate:', error.message);
    return null;
  }

  const grant = await loadActiveGrantForReservation(tenant.id, reservationId);
  return mapReservationGrantToStayRecord(
    reservation as Record<string, unknown>,
    grant,
    tenant.slug
  );
}

async function insertAccessGrant(input: {
  tenantId: string;
  reservationId: string;
  tenantSlug: string;
}): Promise<
  | { ok: true; grant: Record<string, unknown>; accessToken: string; guestPin: string }
  | { ok: false; error: 'db_unavailable' }
> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const accessToken = generateAccessToken();
  const guestPin = generateGuestPin();
  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from('guest_access_grants')
    .insert({
      tenant_id: input.tenantId,
      reservation_id: input.reservationId,
      access_token_hash: hashAccessToken(accessToken),
      access_token_encrypted: encryptAccessToken(accessToken),
      pin_hash: hashGuestPin(input.tenantSlug, guestPin),
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(GUEST_ACCESS_GRANT_COLUMNS)
    .single();

  if (error || !data) {
    console.error('insertAccessGrant:', error?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return {
    ok: true,
    grant: data as Record<string, unknown>,
    accessToken,
    guestPin,
  };
}

/**
 * Ensure the reservation has a non-revoked grant so it appears in Plan/Desk.
 * Does not un-revoke old grants — inserts a new one when none is active.
 */
async function ensureActiveAccessGrant(input: {
  tenantId: string;
  reservationId: string;
  tenantSlug: string;
}): Promise<'ok' | 'db_unavailable'> {
  const active = await loadActiveGrantForReservation(input.tenantId, input.reservationId);
  if (active) return 'ok';

  const grantResult = await insertAccessGrant({
    tenantId: input.tenantId,
    reservationId: input.reservationId,
    tenantSlug: input.tenantSlug,
  });
  return grantResult.ok ? 'ok' : 'db_unavailable';
}

function validateReservationDates(checkInAt: Date, checkOutAt: Date): boolean {
  return (
    Number.isFinite(checkInAt.getTime()) &&
    Number.isFinite(checkOutAt.getTime()) &&
    checkOutAt.getTime() >= checkInAt.getTime()
  );
}

function resolveBookingSourceFields(
  settings: TenantSettings,
  bookingPlatformId?: string,
  bookingExternalId?: string
): { ok: true; platformId: string | null; externalId: string | null } | { ok: false } {
  const validation = validateReservationBookingSource({
    settings,
    bookingPlatformId,
    bookingExternalId,
  });
  if (validation) {
    return { ok: false };
  }

  const platformId = bookingPlatformId?.trim() || null;
  const externalId = bookingExternalId?.trim() || null;
  return { ok: true, platformId, externalId };
}

function resolveBookingBalanceFields(
  settings: TenantSettings,
  bookingAmountDue?: string | number
):
  | { ok: true; amountMinor: number | null; currency: string | null; paidAt: string | null | undefined }
  | { ok: false } {
  const resolved = resolveReservationBookingBalance({ settings, bookingAmountDue });
  if (!resolved.ok) {
    return { ok: false };
  }

  if (resolved.amountMinor == null) {
    return { ok: true, amountMinor: null, currency: null, paidAt: null };
  }

  return {
    ok: true,
    amountMinor: resolved.amountMinor,
    currency: resolved.currency,
    paidAt: undefined,
  };
}

export async function createGuestStay(
  input: CreateGuestStayInput,
  locale = 'en'
): Promise<CreateGuestStayResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const bedId = input.bedId.trim();
  if (!bedExistsInGuestStay(tenant.settings, bedId)) {
    return { ok: false, error: 'bed_not_found' };
  }

  const period = resolveReservationStayPeriod({
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    checkInTime: tenant.settings.checkInTime,
    propertyTimeZone: tenant.settings.propertyTimeZone,
  });
  if (!period) {
    return { ok: false, error: 'bed_not_found' };
  }

  if (
    await findOverlappingReservationOnBed(
      tenant.id,
      bedId,
      period.checkInDate,
      period.checkOutDate
    )
  ) {
    return { ok: false, error: 'access_overlap' };
  }

  const bookingFields = resolveBookingSourceFields(
    tenant.settings,
    input.bookingPlatformId,
    input.bookingExternalId
  );
  if (!bookingFields.ok) {
    return { ok: false, error: 'invalid_booking_source' };
  }

  const balanceFields = resolveBookingBalanceFields(tenant.settings, input.bookingAmountDue);
  if (!balanceFields.ok) {
    return { ok: false, error: 'invalid_booking_balance' };
  }

  const nowIso = new Date().toISOString();
  const { data: reservation, error: reservationError } = await admin
    .from('guest_reservations')
    .insert({
      tenant_id: tenant.id,
      guest_name: input.guestName?.trim() || null,
      bed_id: bedId,
      check_in_date: period.checkInDate,
      check_out_date: period.checkOutDate,
      check_in_at: period.checkInAt,
      check_out_at: period.checkOutAt,
      booking_platform_id: bookingFields.platformId,
      booking_external_id: bookingFields.externalId,
      booking_amount_due_minor: balanceFields.amountMinor,
      booking_amount_currency: balanceFields.currency,
      booking_paid_at: null,
      status: 'planned',
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(GUEST_RESERVATION_COLUMNS)
    .single();

  if (reservationError || !reservation) {
    if (isAccessOverlapDbError(reservationError)) {
      return { ok: false, error: 'access_overlap' };
    }
    console.error('createGuestStay reservation:', reservationError?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const reservationId = String(reservation.id);
  const grantResult = await insertAccessGrant({
    tenantId: tenant.id,
    reservationId,
    tenantSlug: tenant.slug,
  });

  if (!grantResult.ok) {
    await admin.from('guest_reservations').delete().eq('id', reservationId);
    return { ok: false, error: 'db_unavailable' };
  }

  const stay = mapReservationGrantToStayRecord(
    reservation as Record<string, unknown>,
    grantResult.grant,
    tenant.slug
  );
  if (!stay) {
    return { ok: false, error: 'db_unavailable' };
  }

  const magicLinkUrl = buildGuestMagicLinkUrl(tenant.slug, locale, grantResult.accessToken);

  const stayKind = bookingFields.platformId ? 'reservation' : 'walk-in';
  void import('@/entities/reception-push/lib/receptionPushMessages').then(({ buildGuestStayPushPayload }) =>
    import('@/entities/reception-push/server').then(({ notifyReceptionDesk }) =>
      notifyReceptionDesk({
        tenantSlug: tenant.slug,
        payload: buildGuestStayPushPayload({
          guestName: input.guestName?.trim() || stay.guest_name,
          kind: stayKind,
        }),
      })
    )
  );

  return { ok: true, stay, accessToken: grantResult.accessToken, magicLinkUrl, guestPin: grantResult.guestPin };
}

export async function updateGuestReservation(
  input: UpdateGuestReservationInput
): Promise<UpdateGuestReservationResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const bedId = input.bedId.trim();
  if (!bedExistsInGuestStay(tenant.settings, bedId)) {
    return { ok: false, error: 'bed_not_found' };
  }

  const period = resolveReservationStayPeriod({
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    checkInTime: tenant.settings.checkInTime,
    propertyTimeZone: tenant.settings.propertyTimeZone,
  });
  if (!period) {
    return { ok: false, error: 'bed_not_found' };
  }

  const { data: existing, error: loadError } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .eq('is_archived', false)
    .maybeSingle();

  if (loadError) {
    console.error('updateGuestReservation load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const grant = await loadActiveGrantForReservation(tenant.id, input.stayId);
  if (!grant) {
    return { ok: false, error: 'not_found' };
  }

  if (
    await findOverlappingReservationOnBed(
      tenant.id,
      bedId,
      period.checkInDate,
      period.checkOutDate,
      input.stayId
    )
  ) {
    return { ok: false, error: 'access_overlap' };
  }

  const bookingFields = resolveBookingSourceFields(
    tenant.settings,
    input.bookingPlatformId,
    input.bookingExternalId
  );
  if (!bookingFields.ok) {
    return { ok: false, error: 'invalid_booking_source' };
  }

  const balanceFields = resolveBookingBalanceFields(tenant.settings, input.bookingAmountDue);
  if (!balanceFields.ok) {
    return { ok: false, error: 'invalid_booking_balance' };
  }

  const bookingPaidAt =
    balanceFields.paidAt === undefined
      ? balanceFields.amountMinor == null
        ? null
        : (existing as Record<string, unknown>).booking_paid_at
          ? String((existing as Record<string, unknown>).booking_paid_at)
          : null
      : balanceFields.paidAt;

  const { data: updated, error: updateError } = await admin
    .from('guest_reservations')
    .update({
      bed_id: bedId,
      guest_name: input.guestName?.trim() || null,
      check_in_date: period.checkInDate,
      check_out_date: period.checkOutDate,
      check_in_at: period.checkInAt,
      check_out_at: period.checkOutAt,
      booking_platform_id: bookingFields.platformId,
      booking_external_id: bookingFields.externalId,
      booking_amount_due_minor: balanceFields.amountMinor,
      booking_amount_currency: balanceFields.currency,
      booking_paid_at: bookingPaidAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .select(GUEST_RESERVATION_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    if (isAccessOverlapDbError(updateError)) {
      return { ok: false, error: 'access_overlap' };
    }
    console.error('updateGuestReservation update:', updateError?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const stay = mapReservationGrantToStayRecord(
    updated as Record<string, unknown>,
    grant,
    tenant.slug
  );
  if (!stay) {
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, stay };
}

export async function setGuestReservationBookingPaid(
  input: SetGuestReservationBookingPaidInput
): Promise<SetGuestReservationBookingPaidResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const { data: existing, error: loadError } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .maybeSingle();

  if (loadError) {
    console.error('setGuestReservationBookingPaid load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const existingRow = existing as Record<string, unknown>;
  const amountMinor = existingRow.booking_amount_due_minor;
  if (amountMinor == null || amountMinor === '') {
    return { ok: false, error: 'no_balance_recorded' };
  }

  const grant = await loadActiveGrantForReservation(tenant.id, input.stayId);
  if (!grant) {
    return { ok: false, error: 'not_found' };
  }

  const paidAt = input.paid ? new Date().toISOString() : null;

  const { data: updated, error: updateError } = await admin
    .from('guest_reservations')
    .update({
      booking_paid_at: paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .select(GUEST_RESERVATION_COLUMNS)
    .maybeSingle();

  if (updateError || !updated) {
    console.error('setGuestReservationBookingPaid update:', updateError?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const stay = mapReservationGrantToStayRecord(
    updated as Record<string, unknown>,
    grant,
    tenant.slug
  );
  if (!stay) {
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, stay };
}

export async function reissueGuestStay(
  input: ReissueGuestStayInput,
  locale = 'en'
): Promise<ReissueGuestStayResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const { data: reservation, error: loadError } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .maybeSingle();

  if (loadError) {
    console.error('reissueGuestStay load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!reservation) {
    return { ok: false, error: 'not_found' };
  }

  const activeGrant = await loadActiveGrantForReservation(tenant.id, input.stayId);
  if (!activeGrant) {
    return { ok: false, error: 'not_found' };
  }

  const nowIso = new Date().toISOString();
  const { error: revokeError } = await admin
    .from('guest_access_grants')
    .update({ revoked_at: nowIso, updated_at: nowIso })
    .eq('id', String(activeGrant.id))
    .is('revoked_at', null);

  if (revokeError) {
    console.error('reissueGuestStay revoke grant:', revokeError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const grantResult = await insertAccessGrant({
    tenantId: tenant.id,
    reservationId: input.stayId,
    tenantSlug: tenant.slug,
  });

  if (!grantResult.ok) {
    return { ok: false, error: 'db_unavailable' };
  }

  const stay = mapReservationGrantToStayRecord(
    reservation as Record<string, unknown>,
    grantResult.grant,
    tenant.slug
  );
  if (!stay) {
    return { ok: false, error: 'db_unavailable' };
  }

  const magicLinkUrl = buildGuestMagicLinkUrl(tenant.slug, locale, grantResult.accessToken);
  return {
    ok: true,
    stay,
    accessToken: grantResult.accessToken,
    magicLinkUrl,
    guestPin: grantResult.guestPin,
  };
}

export async function activateGuestStay(input: {
  token: string;
  tenantSlug: string;
}): Promise<ActivateGuestStayResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const token = input.token.trim();
  if (!token) {
    return { ok: false, error: 'invalid_token' };
  }

  const tokenHash = hashAccessToken(token);
  const { data, error } = await admin
    .from('guest_access_grants')
    .select(
      `${GUEST_ACCESS_GRANT_COLUMNS}, guest_reservations!inner (${GUEST_RESERVATION_COLUMNS}, tenants!inner(slug))`
    )
    .eq('access_token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('activateGuestStay:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'invalid_token' };
  }

  const row = data as Record<string, unknown>;
  const reservationRaw = row.guest_reservations;
  const reservation = (
    Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw
  ) as Record<string, unknown> & {
    tenants?: { slug: string } | { slug: string }[];
  };
  if (!reservation) {
    return { ok: false, error: 'invalid_token' };
  }

  const tenants = reservation.tenants;
  const tenantSlug = Array.isArray(tenants) ? tenants[0]?.slug : tenants?.slug;

  if (!tenantSlug) {
    return { ok: false, error: 'invalid_token' };
  }

  if (tenantSlug !== input.tenantSlug) {
    return { ok: false, error: 'wrong_hostel', correctTenantSlug: tenantSlug };
  }

  const stay = mapReservationGrantToStayRecord(reservation, row, tenantSlug);
  if (!stay) {
    return { ok: false, error: 'invalid_token' };
  }

  if (stay.revoked_at) {
    return { ok: false, error: 'revoked' };
  }

  if (stay.is_archived) {
    return { ok: false, error: 'revoked' };
  }

  if (!isStayActive(stay)) {
    return { ok: false, error: 'expired' };
  }

  if (!stay.activated_at) {
    const { error: updateError } = await admin
      .from('guest_access_grants')
      .update({ activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', String(row.id));

    if (updateError) {
      console.error('activateGuestStay update:', updateError.message);
      return { ok: false, error: 'db_unavailable' };
    }
  }

  return {
    ok: true,
    session: buildGuestSessionPayload({
      stayId: stay.id,
      tenantSlug,
      bedId: stay.bed_id,
      checkOutAt: stay.check_out_at,
    }),
  };
}

export async function activateGuestStayByPin(input: {
  pin: string;
  tenantSlug: string;
}): Promise<ActivateGuestStayByPinResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  if (!isGuestPinFormatValid(input.pin)) {
    return { ok: false, error: 'invalid_pin' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'invalid_pin' };
  }

  const pinHash = hashGuestPin(input.tenantSlug, input.pin);

  const { data, error } = await admin
    .from('guest_access_grants')
    .select(`${GUEST_ACCESS_GRANT_COLUMNS}, guest_reservations!inner (${GUEST_RESERVATION_COLUMNS})`)
    .eq('tenant_id', tenant.id)
    .eq('pin_hash', pinHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('activateGuestStayByPin:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'invalid_pin' };
  }

  const row = data as Record<string, unknown>;
  const storedHash = row.pin_hash ? String(row.pin_hash) : '';
  if (!verifyGuestPin(input.tenantSlug, input.pin, storedHash)) {
    return { ok: false, error: 'invalid_pin' };
  }

  const reservationRaw = row.guest_reservations;
  const reservation = (
    Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw
  ) as Record<string, unknown>;
  const stay = mapReservationGrantToStayRecord(reservation, row, tenant.slug);
  const activationError = resolveGuestPinActivationError(stay);
  if (activationError) {
    return { ok: false, error: activationError };
  }

  if (!stay?.activated_at) {
    const { error: updateError } = await admin
      .from('guest_access_grants')
      .update({ activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', String(row.id));

    if (updateError) {
      console.error('activateGuestStayByPin update:', updateError.message);
      return { ok: false, error: 'db_unavailable' };
    }
  }

  if (!stay) {
    return { ok: false, error: 'invalid_pin' };
  }

  return {
    ok: true,
    session: buildGuestSessionPayload({
      stayId: stay.id,
      tenantSlug: tenant.slug,
      bedId: stay.bed_id,
      checkOutAt: stay.check_out_at,
    }),
  };
}

function toGuestStayPreview(stay: GuestStayRecord, tenantSlug: string): GuestStayPreview {
  return {
    stayId: stay.id,
    tenantSlug,
    bedId: stay.bed_id,
  };
}

/** Resolve magic-link token to stay identity without activating or setting cookies. */
export async function previewGuestStayByToken(input: {
  token: string;
  tenantSlug: string;
}): Promise<PreviewGuestStayByTokenResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const token = input.token.trim();
  if (!token) {
    return { ok: false, error: 'invalid_token' };
  }

  const tokenHash = hashAccessToken(token);
  const { data, error } = await admin
    .from('guest_access_grants')
    .select(
      `${GUEST_ACCESS_GRANT_COLUMNS}, guest_reservations!inner (${GUEST_RESERVATION_COLUMNS}, tenants!inner(slug))`
    )
    .eq('access_token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('previewGuestStayByToken:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'invalid_token' };
  }

  const row = data as Record<string, unknown>;
  const reservationRaw = row.guest_reservations;
  const reservation = (
    Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw
  ) as Record<string, unknown> & {
    tenants?: { slug: string } | { slug: string }[];
  };
  if (!reservation) {
    return { ok: false, error: 'invalid_token' };
  }

  const tenants = reservation.tenants;
  const tenantSlug = Array.isArray(tenants) ? tenants[0]?.slug : tenants?.slug;

  if (!tenantSlug) {
    return { ok: false, error: 'invalid_token' };
  }

  if (tenantSlug !== input.tenantSlug) {
    return { ok: false, error: 'wrong_hostel', correctTenantSlug: tenantSlug };
  }

  const stay = mapReservationGrantToStayRecord(reservation, row, tenantSlug);
  if (!stay) {
    return { ok: false, error: 'invalid_token' };
  }

  if (stay.revoked_at) {
    return { ok: false, error: 'revoked' };
  }

  if (stay.is_archived) {
    return { ok: false, error: 'revoked' };
  }

  if (!isStayActive(stay)) {
    return { ok: false, error: 'expired' };
  }

  return { ok: true, stay: toGuestStayPreview(stay, tenantSlug) };
}

/** Resolve PIN to stay identity without activating or setting cookies. */
export async function previewGuestStayByPin(input: {
  pin: string;
  tenantSlug: string;
}): Promise<PreviewGuestStayByPinResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  if (!isGuestPinFormatValid(input.pin)) {
    return { ok: false, error: 'invalid_pin' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'invalid_pin' };
  }

  const pinHash = hashGuestPin(input.tenantSlug, input.pin);

  const { data, error } = await admin
    .from('guest_access_grants')
    .select(`${GUEST_ACCESS_GRANT_COLUMNS}, guest_reservations!inner (${GUEST_RESERVATION_COLUMNS})`)
    .eq('tenant_id', tenant.id)
    .eq('pin_hash', pinHash)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    console.error('previewGuestStayByPin:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'invalid_pin' };
  }

  const row = data as Record<string, unknown>;
  const storedHash = row.pin_hash ? String(row.pin_hash) : '';
  if (!verifyGuestPin(input.tenantSlug, input.pin, storedHash)) {
    return { ok: false, error: 'invalid_pin' };
  }

  const reservationRaw = row.guest_reservations;
  const reservation = (
    Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw
  ) as Record<string, unknown>;
  const stay = mapReservationGrantToStayRecord(reservation, row, tenant.slug);
  const activationError = resolveGuestPinActivationError(stay);
  if (activationError) {
    return { ok: false, error: activationError };
  }

  if (!stay) {
    return { ok: false, error: 'invalid_pin' };
  }

  return { ok: true, stay: toGuestStayPreview(stay, tenant.slug) };
}

async function loadStayForSessionValidation(
  payload: GuestSessionPayload
): Promise<GuestStayRecord | null> {
  const stay = await loadReservationStayAggregate(payload.tenantSlug, payload.stayId);
  if (!stay || stay.is_archived || !isStayActive(stay)) return null;
  if (stay.bed_id !== payload.bedId) {
    // Bed changed on reservation — session cookie stale until re-activate.
    return null;
  }
  return stay;
}

export async function resolveGuestSessionFromCookies(
  tenantSlug: string | null
): Promise<ResolvedGuestSession | null> {
  const raw = await readGuestSessionFromCookies();
  if (!raw || !tenantSlug || raw.tenantSlug !== tenantSlug) {
    return null;
  }

  const stay = await loadStayForSessionValidation(raw);
  if (!stay) {
    return null;
  }

  return {
    stayId: stay.id,
    tenantSlug,
    bedId: stay.bed_id,
    exp: raw.exp,
    checkInAt: stay.check_in_at,
    checkOutAt: stay.check_out_at,
    checkInDate: stayRecordCheckInDate(stay),
    checkOutDate: stayRecordCheckOutDate(stay),
    guestName: stay.guest_name,
  };
}

export async function listActiveGuestStays(
  tenantSlug: string,
  locale = 'en'
): Promise<GuestStayRecordWithLink[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from('guest_access_grants')
    .select(`${GUEST_ACCESS_GRANT_COLUMNS}, guest_reservations!inner (${GUEST_RESERVATION_COLUMNS})`)
    .eq('tenant_id', tenant.id)
    .is('revoked_at', null)
    .eq('guest_reservations.status', 'planned')
    .eq('guest_reservations.is_archived', false)
    .gt('guest_reservations.check_out_at', nowIso)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listActiveGuestStays:', error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const grantRow = row as Record<string, unknown>;
      const reservationRaw = grantRow.guest_reservations;
      const reservation = (
        Array.isArray(reservationRaw) ? reservationRaw[0] : reservationRaw
      ) as Record<string, unknown>;
      const record = mapReservationGrantToStayRecord(reservation, grantRow, tenant.slug);
      if (!record) return null;
      return {
        ...record,
        magicLinkUrl: buildMagicLinkFromGrantRow(grantRow, tenant.slug, locale),
      };
    })
    .filter((entry): entry is GuestStayRecordWithLink => entry !== null);
}

/**
 * Plan / inventory occupancy: planned + not archived bookings.
 * Does not require an active access grant (lived shortened stays after checkout still appear).
 */
export async function listPlanGuestReservations(
  tenantSlug: string,
  locale = 'en'
): Promise<GuestStayRecordWithLink[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  const { data: reservations, error } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .eq('is_archived', false)
    .order('check_in_date', { ascending: true });

  if (error) {
    console.error('listPlanGuestReservations:', error.message);
    return [];
  }

  const rows = reservations ?? [];
  if (rows.length === 0) return [];

  const reservationIds = rows.map((row) => String(row.id));
  const { data: grants, error: grantsError } = await admin
    .from('guest_access_grants')
    .select(GUEST_ACCESS_GRANT_COLUMNS)
    .eq('tenant_id', tenant.id)
    .in('reservation_id', reservationIds)
    .order('created_at', { ascending: false });

  if (grantsError) {
    console.error('listPlanGuestReservations grants:', grantsError.message);
  }

  const latestGrantByReservation = new Map<string, Record<string, unknown>>();
  for (const grant of grants ?? []) {
    const reservationId = String(grant.reservation_id);
    if (!latestGrantByReservation.has(reservationId)) {
      latestGrantByReservation.set(reservationId, grant as Record<string, unknown>);
    }
  }

  return rows
    .map((reservation) => {
      const reservationId = String(reservation.id);
      const grant = latestGrantByReservation.get(reservationId) ?? null;
      const record = mapReservationGrantToStayRecord(
        reservation as Record<string, unknown>,
        grant,
        tenant.slug
      );
      if (!record) return null;
      return {
        ...record,
        magicLinkUrl:
          grant && !grant.revoked_at
            ? buildMagicLinkFromGrantRow(grant, tenant.slug, locale)
            : null,
      };
    })
    .filter((entry): entry is GuestStayRecordWithLink => entry !== null);
}

export async function revokeGuestStay(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<'ok' | 'not_found' | 'db_unavailable'> {
  // Legacy alias: full cancel → Archive (no remainder split; no operational day).
  const result = await cancelOrCheckoutGuestReservation({
    tenantSlug: input.tenantSlug,
    stayId: input.stayId,
    operationalDate: new Date().toISOString().slice(0, 10),
    archivedByReceptionUserId: '',
    intent: 'cancel',
  });
  if (result.ok) return 'ok';
  if (result.error === 'not_found' || result.error === 'db_unavailable') {
    return result.error;
  }
  return 'not_found';
}

/**
 * @deprecated Prefer cancelOrCheckoutGuestReservation — kept for callers that only soft-cancel.
 */
export async function archiveGuestReservation(input: {
  tenantSlug: string;
  stayId: string;
  archivedByReceptionUserId?: string;
}): Promise<GuestReservationLifecycleStatus> {
  const result = await cancelOrCheckoutGuestReservation({
    tenantSlug: input.tenantSlug,
    stayId: input.stayId,
    operationalDate: new Date().toISOString().slice(0, 10),
    archivedByReceptionUserId: input.archivedByReceptionUserId ?? '',
    intent: 'cancel',
  });
  if (result.ok) return 'ok';
  return result.error;
}

async function revokeActiveGrantForReservation(
  tenantId: string,
  reservationId: string,
  nowIso: string
): Promise<'ok' | 'db_unavailable'> {
  const admin = getSupabaseAdmin();
  if (!admin) return 'db_unavailable';

  const grant = await loadActiveGrantForReservation(tenantId, reservationId);
  if (!grant) return 'ok';

  const { error: grantError } = await admin
    .from('guest_access_grants')
    .update({ revoked_at: nowIso, updated_at: nowIso })
    .eq('id', String(grant.id))
    .is('revoked_at', null);

  if (grantError) {
    console.error('revokeActiveGrantForReservation:', grantError.message);
    return 'db_unavailable';
  }
  return 'ok';
}

async function markReservationFullyArchived(input: {
  tenantId: string;
  stayId: string;
  nowIso: string;
  archivedByReceptionUserId: string | null;
  archiveReason: GuestReservationArchiveReason;
}): Promise<GuestReservationLifecycleStatus> {
  const admin = getSupabaseAdmin();
  if (!admin) return 'db_unavailable';

  const { data, error } = await admin
    .from('guest_reservations')
    .update({
      status: 'cancelled',
      is_archived: true,
      archived_at: input.nowIso,
      archived_by_reception_user_id: input.archivedByReceptionUserId,
      archive_kind: 'full',
      archive_reason: input.archiveReason,
      original_reservation_id: null,
      updated_at: input.nowIso,
    })
    .eq('id', input.stayId)
    .eq('tenant_id', input.tenantId)
    .eq('status', 'planned')
    .eq('is_archived', false)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('markReservationFullyArchived:', error.message);
    return 'db_unavailable';
  }
  if (!data) return 'not_found';
  return 'ok';
}

/**
 * Cancel (before admit) or check out (after admit):
 * - A: nothing lived / cancel → whole booking soft-archived
 * - B: mid-stay checkout → shorten original; archive remainder with original_reservation_id
 */
export async function cancelOrCheckoutGuestReservation(
  input: CancelOrCheckoutGuestReservationInput
): Promise<CancelOrCheckoutGuestReservationResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  if (!isValidOperationalDate(input.operationalDate)) {
    return { ok: false, error: 'invalid_operational_day' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'not_found' };

  const { data: reservation, error: loadError } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (loadError) {
    console.error('cancelOrCheckoutGuestReservation load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!reservation) return { ok: false, error: 'not_found' };
  if (reservation.is_archived) return { ok: false, error: 'already_archived' };
  if (String(reservation.status) !== 'planned') return { ok: false, error: 'not_found' };

  const checkInDate = String(reservation.check_in_date).slice(0, 10);
  const checkOutDate = String(reservation.check_out_date).slice(0, 10);
  const admitted = Boolean(reservation.passport_checked_at || reservation.desk_checked_in_at);
  const nowIso = new Date().toISOString();
  const actorId = input.archivedByReceptionUserId.trim() || null;
  const archiveReason: GuestReservationArchiveReason =
    input.intent === 'checkout' ? 'checked_out' : 'cancelled';

  const grantStatus = await revokeActiveGrantForReservation(tenant.id, input.stayId, nowIso);
  if (grantStatus !== 'ok') return { ok: false, error: grantStatus };

  const splitPlan = resolveArchiveSplitPlan({
    intent: input.intent,
    admitted,
    checkInDate,
    checkOutDate,
    operationalDate: input.operationalDate,
  });

  if (splitPlan.kind === 'full') {
    const status = await markReservationFullyArchived({
      tenantId: tenant.id,
      stayId: input.stayId,
      nowIso,
      archivedByReceptionUserId: actorId,
      archiveReason,
    });
    if (status !== 'ok') return { ok: false, error: status };
    return {
      ok: true,
      kind: input.intent === 'checkout' ? 'checkout_no_remainder' : 'full_archived',
      originalStayId: input.stayId,
      archiveStayId: input.stayId,
    };
  }

  // Case B: shorten original to operational day; insert archived remainder.
  const period = resolveReservationStayPeriod({
    checkInDate,
    checkOutDate: splitPlan.livedCheckOutDate,
    checkInTime: tenant.settings.checkInTime,
    propertyTimeZone: tenant.settings.propertyTimeZone,
  });
  if (!period) return { ok: false, error: 'invalid_operational_day' };

  const remainderPeriod = resolveReservationStayPeriod({
    checkInDate: splitPlan.remainderCheckInDate,
    checkOutDate: splitPlan.remainderCheckOutDate,
    checkInTime: tenant.settings.checkInTime,
    propertyTimeZone: tenant.settings.propertyTimeZone,
  });
  if (!remainderPeriod) return { ok: false, error: 'invalid_operational_day' };

  const { data: shortened, error: shortenError } = await admin
    .from('guest_reservations')
    .update({
      check_in_date: period.checkInDate,
      check_out_date: period.checkOutDate,
      check_in_at: period.checkInAt,
      check_out_at: period.checkOutAt,
      updated_at: nowIso,
    })
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .eq('is_archived', false)
    .select('id')
    .maybeSingle();

  if (shortenError) {
    console.error('cancelOrCheckoutGuestReservation shorten:', shortenError.message);
    return { ok: false, error: 'db_unavailable' };
  }
  if (!shortened) return { ok: false, error: 'not_found' };

  const { data: remainder, error: remainderError } = await admin
    .from('guest_reservations')
    .insert({
      tenant_id: tenant.id,
      guest_id: reservation.guest_id ?? null,
      guest_name: reservation.guest_name ?? null,
      bed_id: reservation.bed_id,
      check_in_date: remainderPeriod.checkInDate,
      check_out_date: remainderPeriod.checkOutDate,
      check_in_at: remainderPeriod.checkInAt,
      check_out_at: remainderPeriod.checkOutAt,
      booking_platform_id: reservation.booking_platform_id ?? null,
      booking_external_id: reservation.booking_external_id ?? null,
      booking_amount_due_minor: reservation.booking_amount_due_minor ?? null,
      booking_amount_currency: reservation.booking_amount_currency ?? null,
      booking_paid_at: reservation.booking_paid_at ?? null,
      status: 'cancelled',
      is_archived: true,
      archived_at: nowIso,
      archived_by_reception_user_id: actorId,
      archive_kind: 'remainder',
      archive_reason: archiveReason,
      original_reservation_id: input.stayId,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id')
    .single();

  if (remainderError || !remainder) {
    console.error('cancelOrCheckoutGuestReservation remainder:', remainderError?.message);
    // Best-effort rollback of shorten is intentionally omitted (desk can Change dates).
    return { ok: false, error: 'db_unavailable' };
  }

  return {
    ok: true,
    kind: 'remainder_archived',
    originalStayId: input.stayId,
    archiveStayId: String(remainder.id),
  };
}

/** @deprecated Prefer cancelOrCheckoutGuestReservation */
export async function trashGuestReservation(input: {
  tenantSlug: string;
  stayId: string;
  deletedByReceptionUserId: string;
}): Promise<GuestReservationLifecycleStatus> {
  const result = await cancelOrCheckoutGuestReservation({
    tenantSlug: input.tenantSlug,
    stayId: input.stayId,
    operationalDate: new Date().toISOString().slice(0, 10),
    archivedByReceptionUserId: input.deletedByReceptionUserId,
    intent: 'cancel',
  });
  if (result.ok) return 'ok';
  return result.error === 'already_archived' ? 'already_archived' : result.error;
}

/**
 * Restore full archive → planned again.
 * Restore remainder → reattach nights onto original (then delete remainder row).
 */
export async function restoreGuestReservation(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<GuestReservationLifecycleStatus> {
  const admin = getSupabaseAdmin();
  if (!admin) return 'db_unavailable';

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return 'not_found';

  const nowIso = new Date().toISOString();
  const { data: existing, error: loadError } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (loadError) {
    console.error('restoreGuestReservation load:', loadError.message);
    return 'db_unavailable';
  }
  if (!existing) return 'not_found';
  if (!existing.is_archived) return 'not_archived';

  const archiveKind =
    existing.archive_kind === 'remainder' || existing.original_reservation_id
      ? 'remainder'
      : 'full';

  if (archiveKind === 'remainder') {
    const originalId = existing.original_reservation_id
      ? String(existing.original_reservation_id)
      : null;
    if (!originalId) return 'original_missing';

    const { data: original, error: originalError } = await admin
      .from('guest_reservations')
      .select(GUEST_RESERVATION_COLUMNS)
      .eq('id', originalId)
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (originalError) {
      console.error('restoreGuestReservation original:', originalError.message);
      return 'db_unavailable';
    }
    if (!original || original.is_archived) return 'original_missing';

    const originalCheckIn = String(original.check_in_date).slice(0, 10);
    const remainderCheckOut = String(existing.check_out_date).slice(0, 10);
    const bedId = String(original.bed_id);

    const overlaps = await findOverlappingReservationOnBed(
      tenant.id,
      bedId,
      originalCheckIn,
      remainderCheckOut,
      originalId
    );
    if (overlaps) return 'access_overlap';

    const period = resolveReservationStayPeriod({
      checkInDate: originalCheckIn,
      checkOutDate: remainderCheckOut,
      checkInTime: tenant.settings.checkInTime,
      propertyTimeZone: tenant.settings.propertyTimeZone,
    });
    if (!period) return 'db_unavailable';

    const { error: extendError } = await admin
      .from('guest_reservations')
      .update({
        check_in_date: period.checkInDate,
        check_out_date: period.checkOutDate,
        check_in_at: period.checkInAt,
        check_out_at: period.checkOutAt,
        updated_at: nowIso,
      })
      .eq('id', originalId)
      .eq('tenant_id', tenant.id)
      .eq('is_archived', false);

    if (extendError) {
      if (isAccessOverlapDbError(extendError)) return 'access_overlap';
      console.error('restoreGuestReservation extend:', extendError.message);
      return 'db_unavailable';
    }

    const grantStatus = await ensureActiveAccessGrant({
      tenantId: tenant.id,
      reservationId: originalId,
      tenantSlug: tenant.slug,
    });
    if (grantStatus !== 'ok') {
      // Roll back date extend so we don't leave an invisible elongated stay.
      const priorOut = String(existing.check_in_date).slice(0, 10);
      const rollbackPeriod = resolveReservationStayPeriod({
        checkInDate: originalCheckIn,
        checkOutDate: priorOut,
        checkInTime: tenant.settings.checkInTime,
        propertyTimeZone: tenant.settings.propertyTimeZone,
      });
      if (rollbackPeriod) {
        await admin
          .from('guest_reservations')
          .update({
            check_in_date: rollbackPeriod.checkInDate,
            check_out_date: rollbackPeriod.checkOutDate,
            check_in_at: rollbackPeriod.checkInAt,
            check_out_at: rollbackPeriod.checkOutAt,
            updated_at: nowIso,
          })
          .eq('id', originalId)
          .eq('tenant_id', tenant.id);
      }
      return grantStatus;
    }

    const { error: deleteError } = await admin
      .from('guest_reservations')
      .delete()
      .eq('id', input.stayId)
      .eq('tenant_id', tenant.id)
      .eq('is_archived', true);

    if (deleteError) {
      console.error('restoreGuestReservation delete remainder:', deleteError.message);
      return 'db_unavailable';
    }

    return 'ok';
  }

  const { data, error } = await admin
    .from('guest_reservations')
    .update({
      status: 'planned',
      is_archived: false,
      archived_at: null,
      archived_by_reception_user_id: null,
      archive_kind: null,
      archive_reason: null,
      original_reservation_id: null,
      updated_at: nowIso,
    })
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('is_archived', true)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('restoreGuestReservation:', error.message);
    return 'db_unavailable';
  }
  if (!data) return 'not_found';

  const grantStatus = await ensureActiveAccessGrant({
    tenantId: tenant.id,
    reservationId: input.stayId,
    tenantSlug: tenant.slug,
  });
  if (grantStatus !== 'ok') {
    // Roll back un-archive so the stay does not sit invisible on the board.
    await admin
      .from('guest_reservations')
      .update({
        status: 'cancelled',
        is_archived: true,
        archived_at: existing.archived_at ?? nowIso,
        archived_by_reception_user_id: existing.archived_by_reception_user_id ?? null,
        archive_kind: existing.archive_kind ?? 'full',
        archive_reason: existing.archive_reason ?? 'cancelled',
        updated_at: nowIso,
      })
      .eq('id', input.stayId)
      .eq('tenant_id', tenant.id);
    return grantStatus;
  }

  return 'ok';
}

export async function listArchivedGuestReservations(
  tenantSlug: string
): Promise<GuestReservationArchiveListItem[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  const { data, error } = await admin
    .from('guest_reservations')
    .select(
      'id, tenant_id, bed_id, guest_name, check_in_date, check_out_date, status, archived_at, archived_by_reception_user_id, archive_kind, archive_reason, original_reservation_id'
    )
    .eq('tenant_id', tenant.id)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false });

  if (error) {
    console.error('listArchivedGuestReservations:', error.message);
    return [];
  }

  const rows = data ?? [];
  const actorIds = [
    ...new Set(
      rows
        .map((row) =>
          row.archived_by_reception_user_id ? String(row.archived_by_reception_user_id) : null
        )
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors, error: actorsError } = await admin
      .from('reception_users')
      .select('id, display_name')
      .eq('tenant_id', tenant.id)
      .in('id', actorIds);

    if (actorsError) {
      console.error('listArchivedGuestReservations actors:', actorsError.message);
    } else {
      for (const actor of actors ?? []) {
        actorNames.set(String(actor.id), String(actor.display_name ?? ''));
      }
    }
  }

  const originalIds = [
    ...new Set(
      rows
        .map((row) =>
          row.original_reservation_id ? String(row.original_reservation_id) : null
        )
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const existingOriginalIds = new Set<string>();
  if (originalIds.length > 0) {
    const { data: originals, error: originalsError } = await admin
      .from('guest_reservations')
      .select('id')
      .eq('tenant_id', tenant.id)
      .in('id', originalIds);
    if (originalsError) {
      console.error('listArchivedGuestReservations originals:', originalsError.message);
    } else {
      for (const row of originals ?? []) {
        existingOriginalIds.add(String(row.id));
      }
    }
  }

  return rows.map((row) => {
    const archivedById = row.archived_by_reception_user_id
      ? String(row.archived_by_reception_user_id)
      : null;
    const originalId = row.original_reservation_id
      ? String(row.original_reservation_id)
      : null;
    const archiveKind =
      row.archive_kind === 'remainder' || originalId ? 'remainder' : 'full';
    const archiveReason =
      row.archive_reason === 'cancelled' || row.archive_reason === 'checked_out'
        ? row.archive_reason
        : null;

    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      bed_id: String(row.bed_id),
      guest_name: row.guest_name ? String(row.guest_name) : null,
      check_in_date: String(row.check_in_date).slice(0, 10),
      check_out_date: String(row.check_out_date).slice(0, 10),
      status: String(row.status),
      archive_kind: archiveKind,
      archive_reason: archiveReason,
      original_reservation_id: originalId,
      original_exists: originalId ? existingOriginalIds.has(originalId) : false,
      archived_at: String(row.archived_at),
      archived_by_reception_user_id: archivedById,
      archived_by_display_name: archivedById ? (actorNames.get(archivedById) ?? null) : null,
    };
  });
}

/** @deprecated Prefer listArchivedGuestReservations */
export async function listTrashedGuestReservations(
  tenantSlug: string
): Promise<GuestReservationArchiveListItem[]> {
  return listArchivedGuestReservations(tenantSlug);
}

/**
 * Load a reservation for desk detail (including ended / grant-revoked originals).
 */
export async function getGuestReservationForDesk(
  tenantSlug: string,
  stayId: string,
  locale = 'en'
): Promise<GuestStayRecordWithLink | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return null;

  const { data: reservation, error } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', stayId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (error || !reservation) {
    if (error) console.error('getGuestReservationForDesk:', error.message);
    return null;
  }

  const { data: grant } = await admin
    .from('guest_access_grants')
    .select(GUEST_ACCESS_GRANT_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('reservation_id', stayId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const grantRow =
    (grant as Record<string, unknown> | null) ??
    ({
      id: 'missing',
      tenant_id: tenant.id,
      reservation_id: stayId,
      activated_at: null,
      revoked_at: String(reservation.archived_at ?? reservation.updated_at ?? new Date().toISOString()),
      created_at: String(reservation.created_at),
      updated_at: String(reservation.updated_at),
    } satisfies Record<string, unknown>);

  const record = mapReservationGrantToStayRecord(
    reservation as Record<string, unknown>,
    grantRow,
    tenant.slug
  );
  if (!record) return null;

  return {
    ...record,
    magicLinkUrl: grant
      ? buildMagicLinkFromGrantRow(grant as Record<string, unknown>, tenant.slug, locale)
      : null,
  };
}

/**
 * Admit guest at desk: passport verified + arrived (dual-write) + optional key.
 * Prefer this over a separate "arrived only" path — kept as a thin wrapper for callers.
 */
export async function completeDeskCheckIn(
  input: CompleteDeskCheckInInput
): Promise<CompleteDeskCheckInResult> {
  return setPassportCheckedAt({
    tenantSlug: input.tenantSlug,
    stayId: input.stayId,
    checked: true,
    keyIssued: input.keyIssued,
  });
}

export async function setPassportCheckedAt(
  input: SetPassportCheckedAtInput
): Promise<SetPassportCheckedAtResult> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const grant = await loadActiveGrantForReservation(tenant.id, input.stayId);
  if (!grant) {
    return { ok: false, error: 'not_found' };
  }

  const { data: existing, error: loadError } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .maybeSingle();

  if (loadError) {
    console.error('setPassportCheckedAt load:', loadError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!existing) {
    return { ok: false, error: 'not_found' };
  }

  const mapped = mapReservationGrantToStayRecord(
    existing as Record<string, unknown>,
    grant,
    tenant.slug
  );
  if (!mapped) {
    return { ok: false, error: 'not_found' };
  }

  if (input.checked && mapped.passport_checked_at) {
    if (input.keyIssued && !mapped.key_issued_at) {
      const nowIso = new Date().toISOString();
      const { data: updatedKey, error: keyError } = await admin
        .from('guest_reservations')
        .update({ key_issued_at: nowIso, updated_at: nowIso })
        .eq('id', input.stayId)
        .eq('tenant_id', tenant.id)
        .eq('status', 'planned')
        .select(GUEST_RESERVATION_COLUMNS)
        .maybeSingle();

      if (keyError) {
        console.error('setPassportCheckedAt key:', keyError.message);
        return { ok: false, error: 'db_unavailable' };
      }
      if (!updatedKey) {
        return { ok: false, error: 'not_found' };
      }
      const stay = mapReservationGrantToStayRecord(
        updatedKey as Record<string, unknown>,
        grant,
        tenant.slug
      );
      if (!stay) {
        return { ok: false, error: 'db_unavailable' };
      }
      return { ok: true, stay };
    }
    return { ok: true, stay: mapped };
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, string | null> = {
    updated_at: nowIso,
  };

  if (input.checked) {
    patch.passport_checked_at = nowIso;
    patch.desk_checked_in_at = nowIso;
    if (input.keyIssued) {
      patch.key_issued_at = nowIso;
    }
  } else {
    patch.passport_checked_at = null;
    patch.desk_checked_in_at = null;
  }

  const { data: updated, error: updateError } = await admin
    .from('guest_reservations')
    .update(patch)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .select(GUEST_RESERVATION_COLUMNS)
    .maybeSingle();

  if (updateError) {
    console.error('setPassportCheckedAt update:', updateError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!updated) {
    return { ok: false, error: 'not_found' };
  }

  const stay = mapReservationGrantToStayRecord(
    updated as Record<string, unknown>,
    grant,
    tenant.slug
  );
  if (!stay) {
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, stay };
}
