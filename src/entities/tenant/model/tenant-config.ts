'use client';

import { useMemo } from 'react';
import type { CityPackId, Place, RouteId } from '@/entities/hostel';
import type { AppLocale, CityPackContent, CityPackStatus } from '@/entities/city-pack/model/types';
import { resolveCityPackForGuest } from '@/entities/city-pack/lib/resolveCityPackForGuest';
import type { HostelConfig } from '../model/hostel-config';
import type { TenantCapabilities } from '../model/capabilities';
import type { TenantSettings } from '../model/settings';
import type { TenantLifecycleStatus } from '../lib/resolveTenantLifecycle';

/** Serializable tenant payload — safe to pass from Server to Client Components. */
export interface TenantConfig {
  slug: string;
  name: string;
  cityPackId: CityPackId;
  lifecycleStatus: TenantLifecycleStatus;
  subscriptionStartsAt: string | null;
  hostel: HostelConfig;
  capabilities: TenantCapabilities;
  settings: TenantSettings;
  source: 'database' | 'env';
  /** DB-resolved places for guest runtime (empty when pack is not ready). */
  cityPackPlaces?: Place[];
  /** DB-resolved route ids for guest runtime (empty when pack is not ready). */
  cityPackEnabledRoutes?: RouteId[];
  /** Raw city pack content from DB (routes merged at runtime). */
  cityPackContent?: CityPackContent;
  cityPackStatus?: CityPackStatus;
  /** Server-resolved gate for local guide module. */
  cityPackHasPlaces?: boolean;
}

export function useTenantCityPack(
  cityPackId: CityPackId,
  locale: AppLocale,
  cityPackPlaces?: Place[],
  cityPackEnabledRoutes?: RouteId[],
  cityPackContent?: CityPackContent,
  cityPackStatus?: CityPackStatus
) {
  return useMemo(
    () =>
      resolveCityPackForGuest({
        packId: cityPackId,
        locale,
        content: cityPackContent,
        packStatus: cityPackStatus,
        places: cityPackPlaces,
        enabledRoutes: cityPackEnabledRoutes,
      }),
    [cityPackId, locale, cityPackContent, cityPackPlaces, cityPackEnabledRoutes, cityPackStatus]
  );
}
