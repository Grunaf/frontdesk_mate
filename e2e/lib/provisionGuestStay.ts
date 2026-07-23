import { createClient } from '@supabase/supabase-js';
import type { TenantSettings } from '../../src/entities/tenant/model/settings';
import {
  encryptAccessToken,
  generateAccessToken,
  hashAccessToken,
} from '../../src/entities/guest-stay/lib/accessToken';
import { guestAccessBedNightsOverlap } from '../../src/entities/guest-stay/lib/guestAccessIntervals';
import { generateGuestPin, hashGuestPin } from '../../src/entities/guest-stay/lib/guestPin';
import {
  addStayCalendarDays,
  formatPropertyLocalCheckInIso,
  isStayCheckInStarted,
  listGuestStayBedIds,
  todayPropertyStayCalendarDay,
} from '../../src/entities/guest-stay';
import type { SmokeSessionRuntime } from './smokeRuntime';

export const E2E_SMOKE_GUEST_NAME = '__e2e_smoke__';

/** Fallback when tenant has no check-in time — matches product defaults. */
const SMOKE_CHECK_IN_TIME_FALLBACK = '14:00';

interface TenantRow {
  id: string;
  slug: string;
  settings: TenantSettings;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !secretKey) {
    return null;
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveCheckInIso(
  checkInDate: string,
  checkInTime?: string,
  propertyTimeZone?: string | null
): string {
  const time = checkInTime?.trim() || SMOKE_CHECK_IN_TIME_FALLBACK;
  const [hours, minutes = '00'] = time.split(':');
  return (
    formatPropertyLocalCheckInIso(checkInDate.trim(), time, propertyTimeZone) ??
    `${checkInDate.trim()}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`
  );
}

/**
 * Calendar night for smoke stays must already be past the bed-map check-in gate.
 * `isStayCheckInStarted` uses tenant checkInTime in property TZ (ignores ISO time suffix),
 * so before policy hour we backdate one calendar night — keeps CI deterministic.
 */
function resolveSmokeCheckInDate(
  now: Date,
  checkInTime: string,
  propertyTimeZone?: string | null
): string {
  const todayLocal = todayPropertyStayCalendarDay(now, propertyTimeZone);
  const checkInStartedToday = isStayCheckInStarted({
    checkInDate: todayLocal,
    propertyTimeZone,
    checkInTimeFallback: checkInTime,
    now,
  });
  return checkInStartedToday ? todayLocal : addStayCalendarDays(todayLocal, -1);
}

async function loadTenant(slug: string): Promise<TenantRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('tenants')
    .select('id, slug, settings')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    console.error('[e2e provision] tenant load failed:', error?.message ?? 'not found');
    return null;
  }

  return {
    id: String(data.id),
    slug: String(data.slug),
    settings: (data.settings ?? {}) as TenantSettings,
  };
}

async function revokeSmokeStays(tenantId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const revokedAt = new Date().toISOString();

  const { data: reservations } = await admin
    .from('guest_reservations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('guest_name', E2E_SMOKE_GUEST_NAME)
    .eq('status', 'planned');

  const reservationIds = (reservations ?? []).map((row) => String(row.id));
  if (reservationIds.length === 0) {
    return;
  }

  await admin
    .from('guest_access_grants')
    .update({ revoked_at: revokedAt, updated_at: revokedAt })
    .in('reservation_id', reservationIds)
    .is('revoked_at', null);

  const { error } = await admin
    .from('guest_reservations')
    .update({ status: 'cancelled', updated_at: revokedAt })
    .in('id', reservationIds);

  if (error) {
    console.error('[e2e provision] revoke smoke stays failed:', error.message);
  }
}

async function pickBedId(
  tenantId: string,
  settings: TenantSettings,
  checkInAt: string,
  checkOutAt: string,
  preferredBedId?: string
): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const bedIds = listGuestStayBedIds(settings);
  if (bedIds.length === 0) {
    console.error('[e2e provision] no beds configured on tenant');
    return null;
  }

  const candidates = preferredBedId
    ? bedIds.includes(preferredBedId)
      ? [preferredBedId, ...bedIds.filter((id) => id !== preferredBedId)]
      : bedIds
    : bedIds;

  const { data, error } = await admin
    .from('guest_reservations')
    .select('bed_id, check_in_at, check_out_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'planned');

  if (error) {
    console.error('[e2e provision] bed overlap query failed:', error.message);
    return candidates[0] ?? null;
  }

  const activeStays = data ?? [];

  for (const bedId of candidates) {
    const overlaps = activeStays.some((row) => {
      if (String(row.bed_id) !== bedId) return false;
      return guestAccessBedNightsOverlap(
        String(row.check_in_at),
        String(row.check_out_at),
        checkInAt,
        checkOutAt
      );
    });

    if (!overlaps) {
      return bedId;
    }
  }

  return null;
}

export async function provisionGuestStayForSmoke(input: {
  tenantSlug: string;
  locale: string;
  bedId?: string;
  nights?: number;
}): Promise<SmokeSessionRuntime | null> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[e2e provision] Supabase admin client unavailable');
    return null;
  }

  const tenant = await loadTenant(input.tenantSlug);
  if (!tenant) {
    return null;
  }

  const now = new Date();
  const propertyTimeZone = tenant.settings.propertyTimeZone;
  const checkInTime = tenant.settings.checkInTime?.trim() || SMOKE_CHECK_IN_TIME_FALLBACK;
  const checkInDate = resolveSmokeCheckInDate(now, checkInTime, propertyTimeZone);
  const nights = input.nights ?? 7;
  const checkOutDate = addStayCalendarDays(checkInDate, nights);
  const checkInAt = resolveCheckInIso(checkInDate, checkInTime, propertyTimeZone);
  const checkOutAt = `${checkOutDate}T23:59:59.999Z`;

  await revokeSmokeStays(tenant.id);

  const bedId = await pickBedId(
    tenant.id,
    tenant.settings,
    checkInAt,
    checkOutAt,
    input.bedId?.trim() || undefined
  );

  if (!bedId) {
    console.error('[e2e provision] no free bed for smoke stay');
    return null;
  }

  const guestPin = generateGuestPin();
  const accessToken = generateAccessToken();
  const nowIso = new Date().toISOString();

  const { data: reservation, error: reservationError } = await admin
    .from('guest_reservations')
    .insert({
      tenant_id: tenant.id,
      bed_id: bedId,
      guest_name: E2E_SMOKE_GUEST_NAME,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      check_in_at: checkInAt,
      check_out_at: checkOutAt,
      status: 'planned',
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select('id')
    .single();

  if (reservationError || !reservation) {
    console.error('[e2e provision] reservation insert failed:', reservationError?.message ?? 'unknown');
    return null;
  }

  const reservationId = String(reservation.id);

  const { error: grantError } = await admin.from('guest_access_grants').insert({
    tenant_id: tenant.id,
    reservation_id: reservationId,
    access_token_hash: hashAccessToken(accessToken),
    access_token_encrypted: encryptAccessToken(accessToken),
    pin_hash: hashGuestPin(tenant.slug, guestPin),
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (grantError) {
    console.error('[e2e provision] grant insert failed:', grantError.message);
    await admin.from('guest_reservations').delete().eq('id', reservationId);
    return null;
  }

  console.info(
    `[e2e provision] created smoke reservation ${reservationId} on bed ${bedId} for ${input.tenantSlug}`
  );

  return {
    guestPin,
    stayId: reservationId,
    tenantSlug: tenant.slug,
    bedId,
    provisionedAt: new Date().toISOString(),
  };
}
