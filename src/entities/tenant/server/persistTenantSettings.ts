import 'server-only';

import { hashDeskPin, isNewDeskPinValid, DESK_PIN_MIN_LENGTH } from '@/app/reception/lib/deskPin';
import { mergeTenantSettingsWithPrevious } from '@/app/admin/(protected)/tenants/lib/mergeTenantSettingsWithPrevious';
import { isCityPackId, type CityPackId } from '@/entities/hostel';
import { upsertTenant } from '../api/getTenantConfig';
import { applyOwnerTenantSavePolicy } from '../lib/applyOwnerTenantSavePolicy';
import { resolveCityTaxDisplay } from '../lib/resolveHostelMoney';
import { toDateInputValue } from '../lib/resolveTenantLifecycle';
import type { TenantRecord } from '../model/settings';
import { getCityPackForAdmin } from '@/entities/city-pack/server';
import { validateCityPackNeedNowPlaceIds } from '@/entities/city-pack/lib/validateOwnerCityPackPlaceSelection';
import { parseTenantSettingsFormData } from './parseTenantSettingsFormData';

export type TenantSaveActor =
  | { kind: 'platform' }
  | { kind: 'owner'; tenantId: string; userId: string };

export type PersistTenantSettingsInput = {
  actor: TenantSaveActor;
  slug: string;
  originalSlug: string | null;
  name: string;
  cityPackId: CityPackId;
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  formData: FormData;
  previous: TenantRecord | null;
};

export type PersistTenantSettingsResult =
  | { ok: true; slug: string }
  | { ok: false; code: 'validation' | 'forbidden' | 'db'; message: string };

export async function persistTenantSettings(
  input: PersistTenantSettingsInput
): Promise<PersistTenantSettingsResult> {
  const name = input.name.trim();

  if (input.actor.kind === 'owner') {
    if (!input.previous) {
      return { ok: false, code: 'validation', message: 'Tenant not found' };
    }
    if (input.previous.id !== input.actor.tenantId) {
      return { ok: false, code: 'forbidden', message: 'Tenant mismatch' };
    }
    if (!name) {
      return { ok: false, code: 'validation', message: 'Name is required' };
    }
  } else {
    const slug = input.slug.trim();
    if (!slug || !name) {
      return { ok: false, code: 'validation', message: 'Slug and name are required' };
    }
    if (!isCityPackId(input.cityPackId)) {
      return { ok: false, code: 'validation', message: 'Unknown city pack' };
    }
  }

  let settings = mergeTenantSettingsWithPrevious(
    input.formData,
    parseTenantSettingsFormData(input.formData),
    input.previous?.settings
  );

  settings = {
    ...settings,
    cityTax: resolveCityTaxDisplay(settings) || input.previous?.settings.cityTax,
  };

  let slug: string;
  let originalSlug: string | null;
  let cityPackId: CityPackId;
  let subscriptionStartsAt: string;
  let subscriptionEndsAt: string;

  if (input.actor.kind === 'owner') {
    const previous = input.previous!;
    slug = previous.slug;
    originalSlug = previous.slug;
    cityPackId = previous.city_pack_id;
    if (!isCityPackId(cityPackId)) {
      return { ok: false, code: 'validation', message: 'Invalid city pack' };
    }
    subscriptionStartsAt = toDateInputValue(previous.subscription_starts_at ?? '');
    subscriptionEndsAt = toDateInputValue(previous.subscription_ends_at ?? '');

    settings = applyOwnerTenantSavePolicy(settings, previous.settings);

    const needNowIds = settings.cityPackNeedNowPlaceIds ?? [];
    if (needNowIds.length > 0) {
      const { pack, error: packError } = await getCityPackForAdmin(cityPackId);
      if (packError) {
        return { ok: false, code: 'db', message: packError };
      }
      const placeValidation = validateCityPackNeedNowPlaceIds(pack?.content, needNowIds);
      if (!placeValidation.ok) {
        return { ok: false, code: 'validation', message: placeValidation.message };
      }
    }
  } else {
    slug = input.slug.trim();
    originalSlug = input.originalSlug?.trim() || null;
    cityPackId = input.cityPackId;
    subscriptionStartsAt = input.subscriptionStartsAt.trim();
    subscriptionEndsAt = input.subscriptionEndsAt.trim();

    const deskPin = String(input.formData.get('receptionDeskPin') || '').trim();
    const previousHash = input.previous?.settings.reception?.deskPinHash;

    if (deskPin && !isNewDeskPinValid(deskPin)) {
      return {
        ok: false,
        code: 'validation',
        message: `Reception desk PIN must be at least ${DESK_PIN_MIN_LENGTH} characters.`,
      };
    }

    if (deskPin) {
      settings.reception = {
        ...settings.reception,
        deskPinHash: hashDeskPin(slug, deskPin),
      };
    } else if (previousHash) {
      settings.reception = {
        ...settings.reception,
        deskPinHash: previousHash,
      };
    }
  }

  const result = await upsertTenant({
    slug,
    originalSlug,
    name,
    cityPackId,
    settings,
    subscriptionStartsAt,
    subscriptionEndsAt,
  });

  if (!result.ok) {
    return { ok: false, code: 'db', message: result.error };
  }

  return { ok: true, slug };
}
