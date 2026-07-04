import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { buildCityPackGateSnapshot, type CityPackGateSnapshot } from '../lib/resolveCityPackGateForTenant';
import {
  countGatePlaces,
  hasRouteGate,
  isPackReadyForTenants,
  resolvePackNotReadyReason,
} from '../lib/resolveCityPackGate';
import type {
  CityPackContent,
  CityPackListItem,
  CityPackRecord,
  CityPackSelectOption,
  CityPackStatus,
} from '../model/types';

interface CityPackRow {
  id: string;
  name: string;
  label: string | null;
  status: CityPackStatus | null;
  content: CityPackContent | null;
  updated_at: string | null;
}

function normalizeContent(raw: CityPackContent | null | undefined): CityPackContent {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  return {
    places: Array.isArray(raw.places) ? raw.places : [],
    enabledRoutes: Array.isArray(raw.enabledRoutes) ? raw.enabledRoutes : [],
    routes: raw.routes && typeof raw.routes === 'object' ? raw.routes : undefined,
    categories: Array.isArray(raw.categories) ? raw.categories : [],
    contentKeys: raw.contentKeys,
    recommendedTaxi: raw.recommendedTaxi,
    warnings: raw.warnings && typeof raw.warnings === 'object' ? raw.warnings : undefined,
    preTripTips: Array.isArray(raw.preTripTips) ? raw.preTripTips : undefined,
  };
}

function mapRow(row: CityPackRow, tenantCount = 0): CityPackRecord {
  const content = normalizeContent(row.content);
  const label = row.label?.trim() || row.name;

  return {
    id: row.id,
    label,
    status: row.status === 'ready' ? 'ready' : 'draft',
    content,
    tenantCount,
    updatedAt: row.updated_at,
  };
}

async function countTenantsByPack(): Promise<Record<string, number>> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {};
  }

  const { data, error } = await admin.from('tenants').select('city_pack_id');
  if (error || !data) {
    return {};
  }

  return data.reduce<Record<string, number>>((acc, row) => {
    const packId = String(row.city_pack_id ?? '');
    if (!packId) {
      return acc;
    }
    acc[packId] = (acc[packId] ?? 0) + 1;
    return acc;
  }, {});
}

export async function listCityPacksForAdmin(): Promise<{
  packs: CityPackListItem[];
  error: string | null;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { packs: [], error: 'Supabase admin client is not configured.' };
  }

  const [{ data, error }, tenantCounts] = await Promise.all([
    admin.from('city_packs').select('id, name, label, status, content, updated_at').order('label'),
    countTenantsByPack(),
  ]);

  if (error) {
    return { packs: [], error: error.message };
  }

  const packs = (data as CityPackRow[] | null)?.map((row) => {
    const record = mapRow(row, tenantCounts[row.id] ?? 0);
    const placesCount = countGatePlaces(record.content);
    const routesGateMet = hasRouteGate(record.content, record.id);
    const gateInput = {
      status: record.status,
      content: record.content,
      packId: record.id,
    };

    return {
      id: record.id,
      label: record.label,
      status: record.status,
      placesCount,
      placesGateMet: placesCount >= 5,
      routesGateMet,
      readyForTenants: isPackReadyForTenants(gateInput),
      notReadyReason: resolvePackNotReadyReason(gateInput),
      tenantCount: record.tenantCount,
    };
  });

  return { packs: packs ?? [], error: null };
}

export async function getCityPackForAdmin(id: string): Promise<{
  pack: CityPackRecord | null;
  error: string | null;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { pack: null, error: 'Supabase admin client is not configured.' };
  }

  const [{ data, error }, tenantCounts] = await Promise.all([
    admin.from('city_packs').select('id, name, label, status, content, updated_at').eq('id', id).maybeSingle(),
    countTenantsByPack(),
  ]);

  if (error) {
    return { pack: null, error: error.message };
  }

  if (!data) {
    return { pack: null, error: null };
  }

  return { pack: mapRow(data as CityPackRow, tenantCounts[id] ?? 0), error: null };
}

export async function listCityPacksForTenantSelect(currentPackId?: string): Promise<{
  options: CityPackSelectOption[];
  error: string | null;
}> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    const { CITY_PACK_LIST } = await import('@/entities/hostel');
    return {
      options: CITY_PACK_LIST.map((pack) => ({
        id: pack.id,
        label: pack.label,
        status: 'ready' as const,
        placesCount: 0,
        readyForTenants: true,
      })),
      error: null,
    };
  }

  const { packs, error } = await listCityPacksForAdmin();
  if (error) {
    return { options: [], error };
  }

  const ready: CityPackSelectOption[] = packs
    .filter((pack) => pack.readyForTenants)
    .map((pack) => ({
      id: pack.id,
      label: pack.label,
      status: pack.status,
      placesCount: pack.placesCount,
      readyForTenants: true,
    }));

  if (currentPackId && !ready.some((pack) => pack.id === currentPackId)) {
    const current = packs.find((pack) => pack.id === currentPackId);
    if (current) {
      ready.unshift({
        id: current.id,
        label: current.label,
        status: current.status,
        placesCount: current.placesCount,
        readyForTenants: current.readyForTenants,
        notReadyReason: current.notReadyReason ?? undefined,
      });
    }
  }

  return { options: ready, error: null };
}

export async function upsertCityPack(input: {
  id: string;
  label: string;
  status: CityPackStatus;
  content: CityPackContent;
}): Promise<{ ok: boolean; error: string | null }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'Supabase admin client is not configured.' };
  }

  const id = input.id.trim();
  const label = input.label.trim();
  if (!id || !label) {
    return { ok: false, error: 'Pack id and label are required.' };
  }

  const { error } = await admin.from('city_packs').upsert(
    {
      id,
      name: label,
      label,
      status: input.status,
      content: normalizeContent(input.content),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}

export async function getCityPackGateSnapshotForAdmin(): Promise<{
  snapshot: CityPackGateSnapshot;
  error: string | null;
}> {
  const { packs, error } = await listCityPacksForAdmin();
  if (error) {
    return { snapshot: {}, error };
  }

  return { snapshot: buildCityPackGateSnapshot(packs), error: null };
}

export async function getCityPackContentForRuntime(id: string): Promise<CityPackContent | null> {
  const { pack } = await getCityPackForAdmin(id);
  return pack?.content ?? null;
}
