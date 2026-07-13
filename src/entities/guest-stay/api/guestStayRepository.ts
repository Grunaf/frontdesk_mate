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
  CompleteDeskCheckInInput,
  CompleteDeskCheckInResult,
  CreateGuestStayInput,
  CreateGuestStayResult,
  GuestSessionPayload,
  GuestStayRecord,
  GuestStayRecordWithLink,
  ReissueGuestStayInput,
  ReissueGuestStayResult,
  ResolvedGuestSession,
  UpdateGuestReservationInput,
  UpdateGuestReservationResult,
  SetGuestReservationBookingPaidInput,
  SetGuestReservationBookingPaidResult,
} from '../model/types';

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
    .eq('status', 'planned');

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

async function loadStayForSessionValidation(
  payload: GuestSessionPayload
): Promise<GuestStayRecord | null> {
  const stay = await loadReservationStayAggregate(payload.tenantSlug, payload.stayId);
  if (!stay || !isStayActive(stay)) return null;
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

export async function revokeGuestStay(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<'ok' | 'not_found' | 'db_unavailable'> {
  const admin = getSupabaseAdmin();
  if (!admin) return 'db_unavailable';

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return 'not_found';

  const nowIso = new Date().toISOString();
  const grant = await loadActiveGrantForReservation(tenant.id, input.stayId);
  if (!grant) {
    return 'not_found';
  }

  const { error: grantError } = await admin
    .from('guest_access_grants')
    .update({ revoked_at: nowIso, updated_at: nowIso })
    .eq('id', String(grant.id))
    .is('revoked_at', null);

  if (grantError) {
    console.error('revokeGuestStay grant:', grantError.message);
    return 'db_unavailable';
  }

  const { data, error } = await admin
    .from('guest_reservations')
    .update({ status: 'cancelled', updated_at: nowIso })
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('revokeGuestStay reservation:', error.message);
    return 'db_unavailable';
  }

  if (!data) {
    return 'not_found';
  }

  return 'ok';
}

export async function completeDeskCheckIn(
  input: CompleteDeskCheckInInput
): Promise<CompleteDeskCheckInResult> {
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
    return { ok: false, error: 'already_revoked' };
  }

  const { data: existing, error: loadError } = await admin
    .from('guest_reservations')
    .select(GUEST_RESERVATION_COLUMNS)
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .eq('status', 'planned')
    .maybeSingle();

  if (loadError) {
    console.error('completeDeskCheckIn load:', loadError.message);
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

  if (mapped.desk_checked_in_at) {
    return { ok: true, stay: mapped };
  }

  const nowIso = new Date().toISOString();
  const patch: Record<string, string> = {
    desk_checked_in_at: nowIso,
    updated_at: nowIso,
  };
  if (input.keyIssued) {
    patch.key_issued_at = nowIso;
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
    console.error('completeDeskCheckIn update:', updateError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!updated) {
    return { ok: false, error: 'not_found' };
  }

  const stay = mapReservationGrantToStayRecord(updated as Record<string, unknown>, grant, tenant.slug);
  if (!stay) {
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, stay };
}
