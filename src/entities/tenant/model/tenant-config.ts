'use client';

import { useMemo } from 'react';
import { getCityPack, type CityPackId } from '@/entities/hostel';
import type { Place } from '@/entities/hostel';
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
  /** Server-resolved gate for local guide module. */
  cityPackHasPlaces?: boolean;
}

export function useTenantCityPack(cityPackId: CityPackId, cityPackPlaces?: Place[]) {
  return useMemo(() => {
    const base = getCityPack(cityPackId);
    return { ...base, places: cityPackPlaces ?? [] };
  }, [cityPackId, cityPackPlaces]);
}
