'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  countGatePlaces,
  hasRouteGate,
  isPackReadyForTenants,
  normalizeEnabledRoutes,
  type CityPackAdminPlace,
  type CityPackContent,
  type CityPackStatus,
} from '@/entities/city-pack';
import {
  mergeCityPackContentForSave,
  parseCityPackRoutesJson,
  parseCityPackWarningsJson,
} from '@/entities/city-pack/lib/normalizeCityPackRoutes';
import { normalizePhoneDisplayPreset } from '@/shared/lib/phone-display-presets';
import { resolveStoredPhoneMask } from '@/shared/lib/phoneDisplay';
import type { RouteId } from '@/entities/hostel';
import { getCityPackForAdmin, upsertCityPack } from '@/entities/city-pack/server';
import { assertAdminAuthenticated } from '../../lib/adminSession';

function parsePlaces(raw: string): CityPackAdminPlace[] {
  try {
    const parsed = JSON.parse(raw) as CityPackAdminPlace[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((place) => place?.id && place?.name?.trim());
  } catch {
    return [];
  }
}

function readContent(formData: FormData): CityPackContent {
  const places = parsePlaces(String(formData.get('placesJson') || '[]'));
  const enabledRoutesRaw = String(formData.get('enabledRoutesJson') || '[]');
  let enabledRoutes: CityPackContent['enabledRoutes'] = [];
  try {
    enabledRoutes = normalizeEnabledRoutes(JSON.parse(enabledRoutesRaw));
  } catch {
    enabledRoutes = [];
  }
  const taxiName = String(formData.get('recommendedTaxiName') || '').trim();
  const taxiPhoneRaw = String(formData.get('recommendedTaxiPhoneRaw') || '').trim();
  const taxiPhoneMaskInput = String(formData.get('recommendedTaxiPhoneMask') || '').trim();
  const taxiPhoneFormatPreset = normalizePhoneDisplayPreset(
    String(formData.get('recommendedTaxiPhoneFormatPreset') || '')
  );
  const taxiPhoneMask = resolveStoredPhoneMask(
    taxiPhoneRaw,
    taxiPhoneMaskInput,
    taxiPhoneFormatPreset ?? 'auto'
  );
  const routes = parseCityPackRoutesJson(String(formData.get('routesJson') || '{}'));
  const warnings = parseCityPackWarningsJson(String(formData.get('warningsJson') || '{}'));
  let preTripTips: CityPackContent['preTripTips'];
  try {
    const parsed = JSON.parse(String(formData.get('preTripTipsJson') || '[]'));
    preTripTips = Array.isArray(parsed) && parsed.includes('sundayClosure') ? ['sundayClosure'] : undefined;
  } catch {
    preTripTips = undefined;
  }

  const base: CityPackContent = {
    places,
    enabledRoutes,
    routes: Object.keys(routes).length > 0 ? routes : undefined,
    warnings,
    preTripTips,
    recommendedTaxi: taxiName
      ? {
          name: taxiName,
          phoneRaw: taxiPhoneRaw || undefined,
          phoneMask: taxiPhoneMask || undefined,
          phoneFormatPreset: taxiPhoneFormatPreset ?? (taxiPhoneRaw ? 'auto' : undefined),
        }
      : undefined,
  };

  return mergeCityPackContentForSave(base, enabledRoutes as RouteId[]);
}

export async function saveCityPackAction(formData: FormData) {
  await assertAdminAuthenticated();

  const id = String(formData.get('id') || '').trim();
  const label = String(formData.get('label') || '').trim();
  const publish = String(formData.get('publish') || '') === 'true';
  const content = readContent(formData);

  if (!id || !label) {
    redirect(`/admin/city-packs/${id || 'new'}?error=missing-fields`);
  }

  const status: CityPackStatus =
    publish && isPackReadyForTenants({ status: 'ready', content, packId: id }) ? 'ready' : 'draft';

  const { ok, error } = await upsertCityPack({ id, label, status, content });
  if (!ok) {
    redirect(`/admin/city-packs/${id}?error=${encodeURIComponent(error ?? 'save-failed')}`);
  }

  revalidatePath('/admin/city-packs');
  revalidatePath(`/admin/city-packs/${id}`);
  revalidatePath('/admin/tenants');
  redirect(`/admin/city-packs/${id}?saved=1`);
}

export async function createCityPackAction(formData: FormData) {
  await assertAdminAuthenticated();

  const id = String(formData.get('id') || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  const label = String(formData.get('label') || '').trim();

  if (!id || !label) {
    redirect('/admin/city-packs/new?error=missing-fields');
  }

  const { pack } = await getCityPackForAdmin(id);
  if (pack) {
    redirect(`/admin/city-packs/${id}?error=exists`);
  }

  const { ok, error } = await upsertCityPack({
    id,
    label,
    status: 'draft',
    content: { places: [], enabledRoutes: [] },
  });

  if (!ok) {
    redirect(`/admin/city-packs/new?error=${encodeURIComponent(error ?? 'create-failed')}`);
  }

  revalidatePath('/admin/city-packs');
  redirect(`/admin/city-packs/${id}`);
}
