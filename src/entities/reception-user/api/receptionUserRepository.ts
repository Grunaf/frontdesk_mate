import 'server-only';

import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';

import { isReceptionLoginValid, normalizeReceptionLogin } from '../lib/normalizeReceptionLogin';
import { hashReceptionUserPin, isReceptionUserPinValid } from '../lib/receptionUserPin';
import type {
  CreateReceptionUserInput,
  CreateReceptionUserResult,
  DisableReceptionUserResult,
  ReceptionUserRecord,
  SetReceptionUserPinHashResult,
  UpdateReceptionUserInput,
  UpdateReceptionUserResult,
} from '../model/types';

const RECEPTION_USER_COLUMNS =
  'id, tenant_id, login, display_name, pin_hash, disabled_at, created_at, updated_at';

function mapRow(row: Record<string, unknown>): ReceptionUserRecord {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    login: String(row.login),
    display_name: String(row.display_name),
    pin_hash: String(row.pin_hash),
    disabled_at: row.disabled_at ? String(row.disabled_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}

async function resolveTenantId(tenantSlug: string): Promise<string | null> {
  const tenant = await getTenantRecord(tenantSlug);
  return tenant?.id ?? null;
}

export async function listReceptionUsersByTenant(
  tenantSlug: string
): Promise<ReceptionUserRecord[]> {
  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return [];

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from('reception_users')
    .select(RECEPTION_USER_COLUMNS)
    .eq('tenant_id', tenantId)
    .order('login', { ascending: true });

  if (error || !data) {
    console.error('listReceptionUsersByTenant:', error?.message ?? 'no data');
    return [];
  }

  return data.map((row) => mapRow(row as Record<string, unknown>));
}

export async function findReceptionUserByLogin(
  tenantSlug: string,
  login: string
): Promise<ReceptionUserRecord | null> {
  const normalizedLogin = normalizeReceptionLogin(login);
  if (!normalizedLogin) return null;

  const tenantId = await resolveTenantId(tenantSlug);
  if (!tenantId) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('reception_users')
    .select(RECEPTION_USER_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('login', normalizedLogin)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error('findReceptionUserByLogin:', error.message);
    }
    return null;
  }

  return mapRow(data as Record<string, unknown>);
}

export async function createReceptionUser(
  input: CreateReceptionUserInput
): Promise<CreateReceptionUserResult> {
  if (!isReceptionLoginValid(input.login)) {
    return { ok: false, error: 'invalid_login' };
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    return { ok: false, error: 'invalid_display_name' };
  }

  if (!isReceptionUserPinValid(input.pin)) {
    return { ok: false, error: 'invalid_pin' };
  }

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const login = normalizeReceptionLogin(input.login);
  const userId = crypto.randomUUID();
  let pinHash: string;
  try {
    pinHash = hashReceptionUserPin(tenant.slug, userId, input.pin);
  } catch (error) {
    console.error('createReceptionUser: hash failed', error);
    return { ok: false, error: 'db_unavailable' };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('reception_users')
    .insert({
      id: userId,
      tenant_id: tenant.id,
      login,
      display_name: displayName,
      pin_hash: pinHash,
      created_at: now,
      updated_at: now,
    })
    .select(RECEPTION_USER_COLUMNS)
    .single();

  if (error || !data) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: 'login_taken' };
    }
    console.error('createReceptionUser:', error?.message ?? 'no data');
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, user: mapRow(data as Record<string, unknown>) };
}

export async function updateReceptionUser(
  input: UpdateReceptionUserInput
): Promise<UpdateReceptionUserResult> {
  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data: existing, error: loadError } = await admin
    .from('reception_users')
    .select(RECEPTION_USER_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('id', input.userId)
    .maybeSingle();

  if (loadError || !existing) {
    if (loadError) {
      console.error('updateReceptionUser: load failed', loadError.message);
    }
    return { ok: false, error: 'user_not_found' };
  }

  const current = mapRow(existing as Record<string, unknown>);
  if (current.disabled_at) {
    return { ok: false, error: 'user_disabled' };
  }

  const patch: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (!displayName) {
      return { ok: false, error: 'invalid_display_name' };
    }
    patch.display_name = displayName;
  }

  if (input.pin !== undefined) {
    if (!isReceptionUserPinValid(input.pin)) {
      return { ok: false, error: 'invalid_pin' };
    }
    try {
      patch.pin_hash = hashReceptionUserPin(tenant.slug, current.id, input.pin);
    } catch (error) {
      console.error('updateReceptionUser: hash failed', error);
      return { ok: false, error: 'db_unavailable' };
    }
  }

  if (Object.keys(patch).length === 1) {
    return { ok: true, user: current };
  }

  const { data, error } = await admin
    .from('reception_users')
    .update(patch)
    .eq('tenant_id', tenant.id)
    .eq('id', input.userId)
    .select(RECEPTION_USER_COLUMNS)
    .single();

  if (error || !data) {
    console.error('updateReceptionUser:', error?.message ?? 'no data');
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, user: mapRow(data as Record<string, unknown>) };
}

export async function setReceptionUserPinHash(input: {
  tenantSlug: string;
  userId: string;
  pin: string;
}): Promise<SetReceptionUserPinHashResult> {
  return updateReceptionUser({
    tenantSlug: input.tenantSlug,
    userId: input.userId,
    pin: input.pin,
  });
}

export async function disableReceptionUser(input: {
  tenantSlug: string;
  userId: string;
}): Promise<DisableReceptionUserResult> {
  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) {
    return { ok: false, error: 'tenant_not_found' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data: existing, error: loadError } = await admin
    .from('reception_users')
    .select(RECEPTION_USER_COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('id', input.userId)
    .maybeSingle();

  if (loadError || !existing) {
    if (loadError) {
      console.error('disableReceptionUser: load failed', loadError.message);
    }
    return { ok: false, error: 'user_not_found' };
  }

  const current = mapRow(existing as Record<string, unknown>);
  if (current.disabled_at) {
    return { ok: false, error: 'already_disabled' };
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from('reception_users')
    .update({
      disabled_at: now,
      updated_at: now,
    })
    .eq('tenant_id', tenant.id)
    .eq('id', input.userId)
    .select(RECEPTION_USER_COLUMNS)
    .single();

  if (error || !data) {
    console.error('disableReceptionUser:', error?.message ?? 'no data');
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, user: mapRow(data as Record<string, unknown>) };
}
