import 'server-only';

import postgres from 'postgres';
import snapshotEnvKeys from '@/shared/config/snapshotEnvKeys.json';
import { getCityPackGateSnapshotForAdmin } from '@/entities/city-pack/server';
import {
  isCityPackReadyForTenant,
  resolveCityPackNotReadyReasonForTenant,
} from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import { resolveGuestAppModules } from '@/entities/tenant/lib/resolveGuestAppModules';
import { getTenantConfig, getTenantRecord } from '@/entities/tenant/server';
import { isSupabaseAdminConfigured } from '@/shared/lib/db/admin';
import { isProd } from '@/shared/lib/env';

const SNAPSHOT_ENV_KEYS = snapshotEnvKeys as string[];

export interface DevPanelEnvRow {
  key: string;
  set: boolean;
}

export interface DevPanelCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface DevPanelModuleRow {
  id: string;
  label: string;
  status: string;
  detail?: string;
}

export interface DevPanelSnapshot {
  generatedAt: string;
  devTenantSlug: string;
  routingMode: string;
  envRows: DevPanelEnvRow[];
  checks: DevPanelCheck[];
  modules: DevPanelModuleRow[];
  adminEditUrl: string;
}

function resolveDevTenantSlug(): string {
  return process.env.NEXT_PUBLIC_TENANT_SLUG?.trim() || 'default';
}

function buildEnvRows(): DevPanelEnvRow[] {
  return SNAPSHOT_ENV_KEYS.map((key) => ({
    key,
    set: Boolean(process.env[key]?.trim()),
  }));
}

async function checkDatabase(): Promise<DevPanelCheck> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    return {
      id: 'database',
      label: 'Postgres (DATABASE_URL)',
      ok: false,
      detail: 'DATABASE_URL is not set',
    };
  }

  const sql = postgres(databaseUrl, { max: 1, idle_timeout: 5, connect_timeout: 5 });

  try {
    await sql`select 1 as ok`;
    return { id: 'database', label: 'Postgres (DATABASE_URL)', ok: true, detail: 'Connected' };
  } catch (error) {
    return {
      id: 'database',
      label: 'Postgres (DATABASE_URL)',
      ok: false,
      detail: error instanceof Error ? error.message : 'Connection failed',
    };
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function checkSupabaseClient(): Promise<DevPanelCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    return {
      id: 'supabase-client',
      label: 'Supabase client keys',
      ok: false,
      detail: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing',
    };
  }

  return {
    id: 'supabase-client',
    label: 'Supabase client keys',
    ok: true,
    detail: 'Public URL + publishable key present',
  };
}

export async function collectDevPanelSnapshot(): Promise<DevPanelSnapshot> {
  const devTenantSlug = resolveDevTenantSlug();
  const envRows = buildEnvRows();
  const checks: DevPanelCheck[] = [];

  checks.push(await checkDatabase());
  checks.push(await checkSupabaseClient());

  checks.push({
    id: 'supabase-admin',
    label: 'Supabase admin (writes)',
    ok: isSupabaseAdminConfigured(),
    detail: isSupabaseAdminConfigured()
      ? 'SUPABASE_SECRET_KEY configured'
      : 'Add SUPABASE_SECRET_KEY for admin save / reception',
  });

  const tenantRecord = await getTenantRecord(devTenantSlug);
  checks.push({
    id: 'tenant-record',
    label: 'Dev tenant in DB',
    ok: Boolean(tenantRecord),
    detail: tenantRecord
      ? `${tenantRecord.name} (city pack: ${tenantRecord.city_pack_id})`
      : `No tenant row for slug "${devTenantSlug}"`,
  });

  const tenantConfig = await getTenantConfig(devTenantSlug);
  checks.push({
    id: 'guest-config',
    label: 'Guest runtime config',
    ok: Boolean(tenantConfig),
    detail: tenantConfig
      ? `Loaded for "${tenantConfig.slug}"`
      : 'getTenantConfig returned null',
  });

  const { snapshot: cityPackGateSnapshot } = await getCityPackGateSnapshotForAdmin();
  const cityPackId = tenantRecord?.city_pack_id ?? tenantConfig?.cityPackId ?? 'sarajevo';
  const packReady = isCityPackReadyForTenant(cityPackId, cityPackGateSnapshot);
  checks.push({
    id: 'city-pack-gate',
    label: 'City pack gate',
    ok: packReady,
    detail: packReady
      ? `${cityPackId} is ready`
      : (resolveCityPackNotReadyReasonForTenant(cityPackId, cityPackGateSnapshot) ??
        `${cityPackId} not ready`),
  });

  checks.push({
    id: 'routing',
    label: 'Routing mode',
    ok: true,
    detail: isProd
      ? 'Production — tenant from subdomain ({slug}.app.{domain})'
      : `Dev flat — NEXT_PUBLIC_TENANT_SLUG=${devTenantSlug} (app.localhost:3000)`,
  });

  const settings = tenantRecord?.settings ?? tenantConfig?.settings ?? {};
  const modules = resolveGuestAppModules({
    cityPackId,
    settings,
    cityPackGateSnapshot,
  }).map((module) => ({
    id: module.id,
    label: module.label,
    status: module.status,
    detail: module.detail,
  }));

  return {
    generatedAt: new Date().toISOString(),
    devTenantSlug,
    routingMode: isProd ? 'subdomain' : 'flat',
    envRows,
    checks,
    modules,
    adminEditUrl: `/admin/tenants/${devTenantSlug}`,
  };
}
