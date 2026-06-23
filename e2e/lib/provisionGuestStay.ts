import { createClient } from '@supabase/supabase-js';
import type { TenantSettings } from '../../src/entities/tenant/model/settings';
import {
  encryptAccessToken,
  generateAccessToken,
  hashAccessToken,
} from '../../src/entities/guest-stay/lib/accessToken';
import { guestAccessBedNightsOverlap } from '../../src/entities/guest-stay/lib/guestAccessIntervals';
import { generateGuestPin, hashGuestPin } from '../../src/entities/guest-stay/lib/guestPin';
import { listGuestStayBedIds } from '../../src/entities/guest-stay/lib/validateBedForTenant';
import type { SmokeSessionRuntime } from './smokeRuntime';

export const E2E_SMOKE_GUEST_NAME = '__e2e_smoke__';

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

function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function resolveCheckInIso(checkInDate: string, checkInTime?: string): string {
  const time = checkInTime?.trim() || '14:00';
  const [hours, minutes = '00'] = time.split(':');
  return `${checkInDate.trim()}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;
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
  const { error } = await admin
    .from('guest_stays')
    .update({ revoked_at: revokedAt })
    .eq('tenant_id', tenantId)
    .eq('guest_name', E2E_SMOKE_GUEST_NAME)
    .is('revoked_at', null);

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
    .from('guest_stays')
    .select('bed_id, check_in_at, check_out_at')
    .eq('tenant_id', tenantId)
    .is('revoked_at', null);

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

  const checkInDate = new Date().toISOString().slice(0, 10);
  const nights = input.nights ?? 7;
  const checkOutDate = addUtcDays(checkInDate, nights);
  const checkInAt = resolveCheckInIso(checkInDate, tenant.settings.checkInTime);
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

  const { data, error } = await admin
    .from('guest_stays')
    .insert({
      tenant_id: tenant.id,
      bed_id: bedId,
      guest_name: E2E_SMOKE_GUEST_NAME,
      check_in_at: checkInAt,
      check_out_at: checkOutAt,
      access_token_hash: hashAccessToken(accessToken),
      access_token_encrypted: encryptAccessToken(accessToken),
      pin_hash: hashGuestPin(tenant.slug, guestPin),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[e2e provision] insert failed:', error?.message ?? 'unknown');
    return null;
  }

  console.info(
    `[e2e provision] created smoke stay ${String(data.id)} on bed ${bedId} for ${input.tenantSlug}`
  );

  return {
    guestPin,
    stayId: String(data.id),
    tenantSlug: tenant.slug,
    bedId,
    provisionedAt: new Date().toISOString(),
  };
}
