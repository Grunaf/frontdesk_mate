import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { supabase } from '@/shared/lib/db';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import type { TenantConfig } from '../model/tenant-config';
import {
  getDevEnvCityPackPlaces,
  hasDevEnvCityPackPlaces,
} from '@/entities/city-pack/lib/devEnvCityPackPlaces';
import type { CityPackContent, CityPackStatus } from '@/entities/city-pack/model/types';
import { buildCityPackRouteSeedContent, isCodeCityPackRouteSeedAvailable } from '@/entities/city-pack/lib/buildCityPackRouteContentFromCode';
import { getDevEnvCityPackEnabledRoutes } from '@/entities/city-pack/lib/devEnvCityPackRoutes';
import { adminPlacesToPlaces } from '@/entities/city-pack/lib/adminPlaceToPlace';
import { resolveHasPlacesPack, normalizeEnabledRoutes } from '@/entities/city-pack/lib/resolveCityPackGate';
import { getCityPackForAdmin } from '@/entities/city-pack/server';
import { isCityPackId, type CityPackId } from '@/entities/hostel';
import type { TenantRecord, TenantSettings } from '../model/settings';
import { buildHostelConfig } from '../lib/buildHostelConfig';
import { getEnvTenantSettings } from '../lib/getEnvTenantSettings';
import {
  isTenantAppAccessible,
  isTenantPubliclyAccessible,
  parseAdminDateInput,
  resolveArchivedAtOnArchive,
  resolveIsActiveOnArchive,
  resolveTenantLifecycleStatus,
} from '../lib/resolveTenantLifecycle';

import { resolveCapabilities } from '../lib/resolveCapabilities';
import { applyCityPackNeedNowPlaceIds } from '../lib/applyCityPackNeedNowPlaceIds';
import {
  buildTenantGuestShell,
  resolveTenantAccessFromLookup,
  type TenantAccessResult,
} from '../lib/buildTenantGuestShell';
import type { TenantGuestShell } from '../model/guest-shell';
import { isProd } from '@/shared/lib/env';

export type { TenantConfig, TenantGuestShell, TenantAccessResult };

const DEFAULT_SLUG = 'default';
const DEFAULT_CITY_PACK: CityPackId = 'sarajevo';

const TENANT_COLUMNS =
  'id, slug, name, city_pack_id, settings, is_active, subscription_starts_at, subscription_ends_at, archived_at';

export async function resolveTenantSlug(): Promise<string | null> {
  const headerStore = await headers();
  const fromHeader = headerStore.get('x-tenant-slug')?.trim();
  if (fromHeader) {
    return fromHeader;
  }

  if (!isProd) {
    return process.env.NEXT_PUBLIC_TENANT_SLUG || DEFAULT_SLUG;
  }

  return null;
}

function resolveFallbackCityPackId(): CityPackId {
  const fromEnv = process.env.NEXT_PUBLIC_CITY_PACK_ID;
  if (fromEnv && isCityPackId(fromEnv)) {
    return fromEnv;
  }
  return DEFAULT_CITY_PACK;
}

function buildDevEnvCityPackContent(cityPackId: CityPackId): CityPackContent | undefined {
  if (!isCodeCityPackRouteSeedAvailable(cityPackId)) {
    return undefined;
  }

  const seed = buildCityPackRouteSeedContent(cityPackId);
  return {
    enabledRoutes: getDevEnvCityPackEnabledRoutes(cityPackId),
    ...seed,
  };
}

function buildTenantConfig(input: {
  slug: string;
  name: string;
  cityPackId: CityPackId;
  settings: TenantSettings;
  source: TenantConfig['source'];
  lifecycleStatus?: TenantConfig['lifecycleStatus'];
  subscriptionStartsAt?: string | null;
  cityPackPlaces?: TenantConfig['cityPackPlaces'];
  cityPackEnabledRoutes?: TenantConfig['cityPackEnabledRoutes'];
  cityPackContent?: CityPackContent;
  cityPackStatus?: CityPackStatus;
  cityPackHasPlaces?: boolean;
}): TenantConfig {
  const lifecycleStatus = input.lifecycleStatus ?? 'active';

  return {
    slug: input.slug,
    name: input.name,
    cityPackId: input.cityPackId,
    lifecycleStatus,
    subscriptionStartsAt: input.subscriptionStartsAt ?? null,
    hostel: buildHostelConfig(input.settings),
    capabilities: resolveCapabilities({
      cityPackId: input.cityPackId,
      settings: input.settings,
      lifecycleStatus,
      cityPackHasPlaces: input.cityPackHasPlaces,
    }),
    settings: input.settings,
    source: input.source,
    cityPackPlaces: applyCityPackNeedNowPlaceIds(input.cityPackPlaces, input.settings),
    cityPackEnabledRoutes: input.cityPackEnabledRoutes,
    cityPackContent: input.cityPackContent,
    cityPackStatus: input.cityPackStatus,
    cityPackHasPlaces: input.cityPackHasPlaces,
  };
}

/** Dev-only path when Supabase is not configured (single-hostel .env.local workflow). */
function buildEnvFallbackConfig(slug: string): TenantConfig {
  const cityPackId = resolveFallbackCityPackId();
  const devPlaces = getDevEnvCityPackPlaces(cityPackId);
  const devEnabledRoutes = getDevEnvCityPackEnabledRoutes(cityPackId);

  return buildTenantConfig({
    slug,
    name: slug,
    cityPackId,
    settings: getEnvTenantSettings(),
    source: 'env',
    cityPackPlaces: devPlaces,
    cityPackEnabledRoutes: devEnabledRoutes,
    cityPackContent: buildDevEnvCityPackContent(cityPackId),
    cityPackStatus: 'ready',
    cityPackHasPlaces: hasDevEnvCityPackPlaces(cityPackId),
  });
}

function mapTenantRow(row: TenantRecord): TenantConfig {
  const settings = (row.settings ?? {}) as TenantSettings;
  let cityPackId: CityPackId = DEFAULT_CITY_PACK;
  const packIdFromRow = row.city_pack_id?.trim() ?? '';

  if (isCityPackId(packIdFromRow)) {
    cityPackId = packIdFromRow;
  } else if (packIdFromRow && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[tenant] Invalid city_pack_id "${row.city_pack_id}" for "${row.slug}" — falling back to "${DEFAULT_CITY_PACK}".`
    );
  }

  return buildTenantConfig({
    slug: row.slug,
    name: row.name,
    cityPackId,
    settings,
    source: 'database',
    lifecycleStatus: resolveTenantLifecycleStatus(row),
    subscriptionStartsAt: row.subscription_starts_at ?? null,
  });
}

async function resolveCityPackRuntime(cityPackId: CityPackId): Promise<{
  cityPackPlaces?: TenantConfig['cityPackPlaces'];
  cityPackEnabledRoutes?: TenantConfig['cityPackEnabledRoutes'];
  cityPackContent?: CityPackContent;
  cityPackStatus?: CityPackStatus;
  cityPackHasPlaces: boolean;
}> {
  const { pack } = await getCityPackForAdmin(cityPackId);
  if (!pack) {
    return { cityPackHasPlaces: false };
  }

  const cityPackHasPlaces = resolveHasPlacesPack({
    status: pack.status,
    content: pack.content,
    packId: pack.id,
  });

  const cityPackPlaces =
    pack.status === 'ready' && pack.content.places?.length
      ? adminPlacesToPlaces(pack.content.places)
      : undefined;

  const cityPackEnabledRoutes =
    pack.status === 'ready'
      ? normalizeEnabledRoutes(pack.content.enabledRoutes ?? [])
      : undefined;

  return {
    cityPackPlaces,
    cityPackEnabledRoutes,
    cityPackContent: pack.status === 'ready' ? pack.content : undefined,
    cityPackStatus: pack.status,
    cityPackHasPlaces,
  };
}

async function enrichTenantConfig(config: TenantConfig): Promise<TenantConfig> {
  const packRuntime = await resolveCityPackRuntime(config.cityPackId);

  return buildTenantConfig({
    slug: config.slug,
    name: config.name,
    cityPackId: config.cityPackId,
    settings: config.settings,
    source: config.source,
    lifecycleStatus: config.lifecycleStatus,
    subscriptionStartsAt: config.subscriptionStartsAt,
    cityPackPlaces: packRuntime.cityPackPlaces,
    cityPackEnabledRoutes: packRuntime.cityPackEnabledRoutes,
    cityPackContent: packRuntime.cityPackContent,
    cityPackStatus: packRuntime.cityPackStatus,
    cityPackHasPlaces: packRuntime.cityPackHasPlaces,
  });
}

export const getTenantRecord = cache(async function getTenantRecord(
  slug: string
): Promise<TenantRecord | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[tenant] Failed to load "${slug}":`, error.message);
    }
    return null;
  }

  return (data as TenantRecord | null) ?? null;
});

export async function getTenantConfig(slug?: string): Promise<TenantConfig | null> {
  const resolvedSlug = slug ?? (await resolveTenantSlug());
  if (!resolvedSlug) {
    return null;
  }
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!hasSupabase) {
    return buildEnvFallbackConfig(resolvedSlug);
  }

  const record = await getTenantRecord(resolvedSlug);
  if (!record) {
    return null;
  }

  if (isProd && !isTenantAppAccessible(record)) {
    return null;
  }

  return enrichTenantConfig(mapTenantRow(record));
}

export async function getTenantGuestShell(slug: string): Promise<TenantGuestShell | null> {
  const record = await getTenantRecord(slug);
  if (!record) {
    return null;
  }

  return buildTenantGuestShell(record);
}

export async function resolveTenantAccess(
  site: 'landing' | 'app',
  slug?: string
): Promise<TenantAccessResult> {
  const resolvedSlug = slug ?? (await resolveTenantSlug());
  if (!resolvedSlug) {
    return { kind: 'missing' };
  }

  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!hasSupabase) {
    return { kind: 'active', config: buildEnvFallbackConfig(resolvedSlug) };
  }

  const record = await getTenantRecord(resolvedSlug);
  if (!record) {
    return { kind: 'missing' };
  }

  const result = resolveTenantAccessFromLookup({
    slug: resolvedSlug,
    record,
    site,
    isProdEnv: isProd,
  });

  if (result.kind === 'active') {
    return { kind: 'active', config: await enrichTenantConfig(result.config) };
  }

  return result;
}

export async function listTenants(): Promise<{
  tenants: TenantRecord[];
  error: string | null;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { tenants: [], error: 'Supabase env vars are missing.' };
  }

  const { data, error } = await supabase
    .from('tenants')
    .select(TENANT_COLUMNS)
    .order('name');

  if (error) {
    return { tenants: [], error: error.message };
  }

  return { tenants: (data ?? []) as TenantRecord[], error: null };
}

export async function listPublicTenants(): Promise<{ slug: string; name: string }[]> {
  const { tenants, error } = await listTenants();
  if (error) {
    return [];
  }

  return tenants
    .filter((tenant) => isTenantPubliclyAccessible(tenant))
    .map((tenant) => ({ slug: tenant.slug, name: tenant.name }));
}

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export async function upsertTenant(input: {
  slug: string;
  originalSlug?: string | null;
  name: string;
  cityPackId: CityPackId;
  settings: TenantSettings;
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isCityPackId(input.cityPackId)) {
    return { ok: false, error: 'City pack id must be lowercase letters, numbers, or hyphens' };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error:
        'SUPABASE_SECRET_KEY is not set. Add it to .env.local (server-only, no NEXT_PUBLIC_) and restart dev.',
    };
  }

  const slug = normalizeSlug(input.slug);
  const originalSlug = input.originalSlug?.trim() ? normalizeSlug(input.originalSlug) : null;
  const subscriptionStartsAt = parseAdminDateInput(input.subscriptionStartsAt, 'start');
  const subscriptionEndsAt = parseAdminDateInput(input.subscriptionEndsAt, 'end');

  if (!slug || !input.name.trim()) {
    return { ok: false, error: 'Slug and name are required' };
  }

  if (!subscriptionStartsAt || !subscriptionEndsAt) {
    return { ok: false, error: 'Subscription start and end dates are required' };
  }

  if (new Date(subscriptionEndsAt) < new Date(subscriptionStartsAt)) {
    return { ok: false, error: 'Subscription end date must be on or after the start date' };
  }

  const { data: slugOwner, error: slugOwnerError } = await admin
    .from('tenants')
    .select('id, slug, archived_at')
    .eq('slug', slug)
    .maybeSingle();

  if (slugOwnerError) {
    return { ok: false, error: slugOwnerError.message };
  }

  if (originalSlug) {
    const { data: existing, error: existingError } = await admin
      .from('tenants')
      .select('id, slug, archived_at')
      .eq('slug', originalSlug)
      .maybeSingle();

    if (existingError) {
      return { ok: false, error: existingError.message };
    }

    if (!existing) {
      return { ok: false, error: `Tenant "${originalSlug}" was not found. Refresh the page and try again.` };
    }

    if (slugOwner && slugOwner.id !== existing.id) {
      return { ok: false, error: `Slug "${slug}" is already used by another tenant.` };
    }

    const { error } = await admin
      .from('tenants')
      .update({
        slug,
        name: input.name.trim(),
        city_pack_id: input.cityPackId,
        settings: input.settings,
        subscription_starts_at: subscriptionStartsAt,
        subscription_ends_at: subscriptionEndsAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  if (slugOwner) {
    return {
      ok: false,
      error: `Slug "${slug}" already exists. Open that tenant to edit it instead of creating a duplicate.`,
    };
  }

  const { error } = await admin.from('tenants').insert({
    slug,
    name: input.name.trim(),
    city_pack_id: input.cityPackId,
    settings: input.settings,
    subscription_starts_at: subscriptionStartsAt,
    subscription_ends_at: subscriptionEndsAt,
    archived_at: null,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setTenantArchived(
  slug: string,
  archived: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      ok: false,
      error:
        'SUPABASE_SECRET_KEY is not set. Add it to .env.local (server-only, no NEXT_PUBLIC_) and restart dev.',
    };
  }

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return { ok: false, error: 'Slug is required' };
  }

  const { data: existing, error: existingError } = await admin
    .from('tenants')
    .select('id, archived_at')
    .eq('slug', normalizedSlug)
    .maybeSingle();

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  if (!existing) {
    return { ok: false, error: `Tenant "${normalizedSlug}" was not found.` };
  }

  const archivedAt = resolveArchivedAtOnArchive({
    archived,
    previousArchivedAt: existing.archived_at ?? null,
  });
  const isActive = resolveIsActiveOnArchive(archived);

  const { error } = await admin
    .from('tenants')
    .update({
      archived_at: archivedAt,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
