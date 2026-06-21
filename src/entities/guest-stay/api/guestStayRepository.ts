import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { getTenantRecord } from '@/entities/tenant/server';
import {
  decryptAccessToken,
  encryptAccessToken,
  generateAccessToken,
  hashAccessToken,
} from '../lib/accessToken';
import { generateGuestPin, hashGuestPin, isGuestPinFormatValid, verifyGuestPin } from '../lib/guestPin';
import { resolveGuestPinActivationError } from '../lib/resolveGuestPinActivationError';
import { buildGuestMagicLinkUrl } from '../lib/buildMagicLinkUrl';
import { buildGuestSessionPayload, readGuestSessionFromCookies } from '../lib/guestSession';
import { bedExistsInGuestStay } from '../lib/validateBedForTenant';
import type {
  ActivateGuestStayByPinResult,
  ActivateGuestStayResult,
  CreateGuestStayInput,
  CreateGuestStayResult,
  GuestSessionPayload,
  GuestStayRecord,
  GuestStayRecordWithLink,
  ResolvedGuestSession,
} from '../model/types';

const GUEST_STAY_COLUMNS =
  'id, tenant_id, bed_id, guest_name, check_in_at, check_out_at, activated_at, revoked_at, created_at, access_token_encrypted, pin_hash';

function mapRow(row: Record<string, unknown>, tenantSlug: string): GuestStayRecord {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    tenant_slug: tenantSlug,
    bed_id: String(row.bed_id),
    guest_name: row.guest_name ? String(row.guest_name) : null,
    check_in_at: String(row.check_in_at),
    check_out_at: String(row.check_out_at),
    activated_at: row.activated_at ? String(row.activated_at) : null,
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    created_at: String(row.created_at),
  };
}

function buildMagicLinkFromRow(
  row: Record<string, unknown>,
  tenantSlug: string,
  locale: string
): string | null {
  const token = decryptAccessToken(
    row.access_token_encrypted ? String(row.access_token_encrypted) : null
  );
  if (!token) return null;
  return buildGuestMagicLinkUrl(tenantSlug, locale, token);
}

function isStayActive(row: Pick<GuestStayRecord, 'revoked_at' | 'check_out_at'>): boolean {
  if (row.revoked_at) return false;
  return new Date(row.check_out_at).getTime() > Date.now();
}

async function findActiveStayOnBed(tenantId: string, bedId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from('guest_stays')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('bed_id', bedId)
    .is('revoked_at', null)
    .gt('check_out_at', nowIso)
    .limit(1);

  if (error) {
    console.error('findActiveStayOnBed:', error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
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

  if (await findActiveStayOnBed(tenant.id, bedId)) {
    return { ok: false, error: 'bed_occupied' };
  }

  const accessToken = generateAccessToken();
  const guestPin = generateGuestPin();
  const checkInAt = new Date(input.checkInAt);
  const checkOutAt = new Date(input.checkOutAt);
  if (!Number.isFinite(checkInAt.getTime()) || !Number.isFinite(checkOutAt.getTime())) {
    return { ok: false, error: 'bed_not_found' };
  }

  if (checkOutAt.getTime() < checkInAt.getTime()) {
    return { ok: false, error: 'bed_not_found' };
  }

  const { data, error } = await admin
    .from('guest_stays')
    .insert({
      tenant_id: tenant.id,
      bed_id: bedId,
      guest_name: input.guestName?.trim() || null,
      check_in_at: checkInAt.toISOString(),
      check_out_at: checkOutAt.toISOString(),
      access_token_hash: hashAccessToken(accessToken),
      access_token_encrypted: encryptAccessToken(accessToken),
      pin_hash: hashGuestPin(tenant.slug, guestPin),
    })
    .select(GUEST_STAY_COLUMNS)
    .single();

  if (error || !data) {
    console.error('createGuestStay:', error?.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const stay = mapRow(data as Record<string, unknown>, tenant.slug);
  const magicLinkUrl = buildGuestMagicLinkUrl(tenant.slug, locale, accessToken);

  return { ok: true, stay, accessToken, magicLinkUrl, guestPin };
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
    .from('guest_stays')
    .select(`${GUEST_STAY_COLUMNS}, tenants!inner(slug)`)
    .eq('access_token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    console.error('activateGuestStay:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    return { ok: false, error: 'invalid_token' };
  }

  const row = data as Record<string, unknown> & { tenants: { slug: string } | { slug: string }[] };
  const tenantSlug = Array.isArray(row.tenants) ? row.tenants[0]?.slug : row.tenants?.slug;

  if (!tenantSlug) {
    return { ok: false, error: 'invalid_token' };
  }

  if (tenantSlug !== input.tenantSlug) {
    return { ok: false, error: 'wrong_hostel', correctTenantSlug: tenantSlug };
  }

  const stay = mapRow(row, tenantSlug);

  if (stay.revoked_at) {
    return { ok: false, error: 'revoked' };
  }

  if (!isStayActive(stay)) {
    return { ok: false, error: 'expired' };
  }

  if (!stay.activated_at) {
    const { error: updateError } = await admin
      .from('guest_stays')
      .update({ activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', stay.id);

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
    .from('guest_stays')
    .select(GUEST_STAY_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('pin_hash', pinHash)
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

  const stay = mapRow(row, tenant.slug);
  const activationError = resolveGuestPinActivationError(stay);
  if (activationError) {
    return { ok: false, error: activationError };
  }

  if (!stay.activated_at) {
    const { error: updateError } = await admin
      .from('guest_stays')
      .update({ activated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', stay.id);

    if (updateError) {
      console.error('activateGuestStayByPin update:', updateError.message);
      return { ok: false, error: 'db_unavailable' };
    }
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
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('guest_stays')
    .select(`${GUEST_STAY_COLUMNS}, tenants!inner(slug)`)
    .eq('id', payload.stayId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('validateGuestSession:', error.message);
    return null;
  }

  const row = data as Record<string, unknown> & { tenants: { slug: string } | { slug: string }[] };
  const tenantSlug = Array.isArray(row.tenants) ? row.tenants[0]?.slug : row.tenants?.slug;
  if (!tenantSlug || tenantSlug !== payload.tenantSlug) return null;

  const stay = mapRow(row, tenantSlug);
  if (!isStayActive(stay)) return null;

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
    .from('guest_stays')
    .select(GUEST_STAY_COLUMNS)
    .eq('tenant_id', tenant.id)
    .is('revoked_at', null)
    .gt('check_out_at', nowIso)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listActiveGuestStays:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const record = mapRow(row as Record<string, unknown>, tenant.slug);
    return {
      ...record,
      magicLinkUrl: buildMagicLinkFromRow(row as Record<string, unknown>, tenant.slug, locale),
    };
  });
}

export async function revokeGuestStay(input: {
  tenantSlug: string;
  stayId: string;
}): Promise<'ok' | 'not_found' | 'db_unavailable'> {
  const admin = getSupabaseAdmin();
  if (!admin) return 'db_unavailable';

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return 'not_found';

  const { data, error } = await admin
    .from('guest_stays')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', input.stayId)
    .eq('tenant_id', tenant.id)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('revokeGuestStay:', error.message);
    return 'db_unavailable';
  }

  if (!data) {
    return 'not_found';
  }

  return 'ok';
}
